import {
  IExternalQueue,
  IQueue,
  PriorityQueue,
  Queue,
  RabbitMQQueue,
  SQSQueue,
} from '../queue';
import { ContextMode, EventTags, QueueMode, QueueProvider } from './enum';
import { IsolateContext, SharedContext, TaskContext } from './context';
import { RunTaskResponse, TaskMessage } from '../types/type';
import { PoolNotInitializedException } from '../error/pool';
import { MetricsWatcher } from '../watcher/metrics';
import { ConfigType, loadConfig } from '../configs';
import { PuppeteerLaunchOptions } from 'puppeteer';
import { taskRegistry } from './task-registry';
import { Logger, LogLevel } from '../logger';
import { EventEmitter } from 'node:events';
import * as puppeteer from 'puppeteer';

const DEFAULT_VALUES = {
  CONCURRENCY_LEVEL: 1,
  CONTEXT_MODE: ContextMode.SHARED,
  THRESHOLD: {
    memory: 1024,
  },
  QUEUE_CHECK_INTERVAL: 100,
} as const;

const INTERNAL_EVENTS = {
  RUN_TASK: 'RUN_TASK',
} as const;

export class TaskDispatcher extends EventEmitter {
  // Task Queue
  private taskQueue: IQueue<TaskMessage>;

  // Context Queue
  private idleContextQueue: IQueue<TaskContext> = new Queue<TaskContext>();
  private runningContextQueue: IQueue<TaskContext> = new Queue<TaskContext>();

  // Browser Instance
  private browser: puppeteer.Browser;

  // Internal Event
  private runTaskEvent = INTERNAL_EVENTS.RUN_TASK;

  // Metrics Watcher and Threshold Watcher
  private metricsWatcher: MetricsWatcher;

  // States
  private isInitialized: boolean = false;
  private isRestarting: boolean = false;
  private concurrencyLevel: number = DEFAULT_VALUES.CONCURRENCY_LEVEL;
  private contextMode: ContextMode = DEFAULT_VALUES.CONTEXT_MODE;
  private enableLog: boolean;
  private logLevel: LogLevel;
  private launchOptions: PuppeteerLaunchOptions = {};
  private poolConfig: ConfigType;
  private threshold: { memory: number } = DEFAULT_VALUES.THRESHOLD;
  private queueProvider: QueueProvider = QueueProvider.MEMORY;

  // Logger
  private logger: Logger = new Logger();

  private taskEvents: Map<string, EventEmitter> = new Map<
    string,
    EventEmitter
  >();

  constructor() {
    super();
    this.on(this.runTaskEvent, async () => {
      if (!this.browser || this.isRestarting) {
        return;
      }

      const batchCount = Math.min(
        this.taskQueue.size,
        this.idleContextQueue.size,
      );
      if (batchCount === 0) {
        return;
      }
      const batchTasks: {
        contextId: string;
        context: TaskContext;
        taskId: string;
        task: TaskMessage;
      }[] = [];
      for (let i = 0; i < batchCount; i++) {
        const context = this.idleContextQueue.dequeue();
        const task = this.taskQueue.dequeue();
        if (!task) {
          this.idleContextQueue.enqueue({
            payload: context.payload,
            id: context.id,
          });
          continue;
        }
        batchTasks.push({
          contextId: context.id,
          context: context.payload,
          taskId: task.id,
          task: task.payload,
        });
      }
      await Promise.all(
        batchTasks.map((task) =>
          this.executeTask(
            task.contextId,
            task.context,
            task.taskId,
            task.task,
          ),
        ),
      );
    });
  }

  async init(
    concurrencyLevel: number = DEFAULT_VALUES.CONCURRENCY_LEVEL,
    taskQueueType: QueueMode = QueueMode.DEFAULT,
    queueProvider: QueueProvider = QueueProvider.MEMORY,
    contextMode: ContextMode = DEFAULT_VALUES.CONTEXT_MODE,
    enableLog: boolean = true,
    logLevel: LogLevel = LogLevel.DEBUG,
    options: PuppeteerLaunchOptions = {},
    customPoolConfigPath?: string,
  ) {
    this.queueProvider = queueProvider;
    this.taskQueue = await this.createTaskQueue(queueProvider, taskQueueType);

    if (this.isExternalQueue(this.taskQueue)) {
      this.taskQueue.onAvailable(() => {
        if (!this.isRestarting) {
          this.emit(this.runTaskEvent);
        }
      });
      await this.taskQueue.init();
    }

    // Logger setting
    this.enableLog = enableLog;
    this.logLevel = logLevel;
    this.logger.setEnabled(enableLog);
    this.logger.setLogLevel(logLevel);

    // Read Config
    this.poolConfig = loadConfig(customPoolConfigPath);
    this.logger.info('Initializing Task Dispatcher');

    // Set instance variables
    this.concurrencyLevel = concurrencyLevel;

    // Context Mode and Puppeteer launch options
    this.contextMode = contextMode;
    this.launchOptions = options;

    // Initialize Main Browser
    this.browser = await puppeteer.launch({
      ...this.launchOptions,
      defaultViewport: {
        width: this.poolConfig.session_pool.width,
        height: this.poolConfig.session_pool.height,
      },
    });

    // Initialize contexts
    for (let i = 0; i < concurrencyLevel; i++) {
      let id = '';

      if (contextMode === ContextMode.SHARED) {
        const instance = new SharedContext(
          this.browser,
          this.poolConfig.context.timeout,
        );
        await instance.init();
        id = this.idleContextQueue.enqueue({ payload: instance });
      } else {
        const instance = new IsolateContext(
          this.browser,
          this.poolConfig.context.timeout,
        );
        await instance.init();
        id = this.idleContextQueue.enqueue({ payload: instance });
      }

      this.logger.info(`Context initialized - ID: ${id}`);
    }
    // Start Metrics Watcher
    this.metricsWatcher = new MetricsWatcher(
      this.browser.process().pid,
      this.enableLog,
      this.logLevel,
    );
    if (this.poolConfig.threshold.activate) {
      this.threshold = {
        memory: this.poolConfig.threshold.memory,
      };
      this.metricsWatcher.startThresholdWatcher(
        this.threshold,
        async () => {
          await this.restartBrowserAndContexts();
        },
        this.poolConfig.threshold.interval,
      );
    }
    // Set state as isInitialized
    this.isInitialized = true;
    // Emit run task for task queue is not empty.
    if (!this.taskQueue.isEmpty) {
      this.emit(this.runTaskEvent);
    }
  }

  private async restartBrowserAndContexts() {
    if (!this.isInitialized) {
      throw new PoolNotInitializedException();
    }
    if (this.isRestarting) {
      this.logger.info('Restart already in progress, skipping...');
      return;
    }

    this.isRestarting = true;
    try {
      const contextMode = this.contextMode;
      const concurrencyLevel = this.concurrencyLevel;
      this.logger.info(
        `Waiting for running tasks to complete... ${this.runningContextQueue.size} task`,
      );
      // Pending until all of the running tasks are completed
      if (this.runningContextQueue.size > 0) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (this.runningContextQueue.size === 0) {
              clearInterval(checkInterval);
              resolve();
            }
          }, DEFAULT_VALUES.QUEUE_CHECK_INTERVAL);
        });
      }
      // Close browser and previous threshold watcher(If activated) and remove all of the contexts from queue
      await this.close();
      this.idleContextQueue.clear();
      this.runningContextQueue.clear();

      // Reinitialize browser and contexts
      this.browser = await puppeteer.launch({
        ...this.launchOptions,
        defaultViewport: {
          width: this.poolConfig.session_pool.width,
          height: this.poolConfig.session_pool.height,
        },
      });
      for (let i = 0; i < concurrencyLevel; i++) {
        let id = '';
        if (contextMode === ContextMode.SHARED) {
          const instance = new SharedContext(
            this.browser,
            this.poolConfig.context.timeout,
          );
          await instance.init();
          id = this.idleContextQueue.enqueue({
            payload: instance,
          });
        } else {
          const instance = new IsolateContext(
            this.browser,
            this.poolConfig.context.timeout,
          );
          await instance.init();
          id = this.idleContextQueue.enqueue({
            payload: instance,
          });
        }
        this.logger.info(`Context initialized - ID: ${id}`);
      }
      this.metricsWatcher = new MetricsWatcher(
        this.browser.process().pid,
        this.enableLog,
        this.logLevel,
      );
      if (this.poolConfig.threshold.activate) {
        this.threshold = {
          memory: this.poolConfig.threshold.memory,
        };
        this.metricsWatcher.startThresholdWatcher(
          this.threshold,
          async () => {
            await this.restartBrowserAndContexts();
          },
          this.poolConfig.threshold.interval,
        );
      }
      this.logger.info('Restart Completed!');
    } catch (error) {
      this.logger.error('Fail to restart:', error);
      throw error;
    } finally {
      // Change State to Restart
      this.isRestarting = false;
      this.emit(this.runTaskEvent);
    }
  }

  async dispatchTask<TResult>(
    task: TaskMessage,
    priority?: number,
  ): Promise<RunTaskResponse<TResult>> {
    if (!this.isInitialized) {
      throw new PoolNotInitializedException();
    }
    const event = new EventEmitter();
    const taskId = this.taskQueue.enqueue({
      payload: task,
      priority: priority,
    });
    this.taskEvents.set(taskId, event);
    const resultListener: Promise<RunTaskResponse<TResult>> = new Promise(
      (resolve) => {
        // Wait until task is done and return result
        event.once(EventTags.DONE, (result: RunTaskResponse<TResult>) => {
          resolve(result);
        });
        // Emit run task if idle context exist and dispatcher is not restarting state
        // If dispatcher is restarting, task will be pending until restart is completed
        if (!this.isRestarting && !this.idleContextQueue.isEmpty) {
          this.emit(this.runTaskEvent);
        }
      },
    );
    return resultListener;
  }

  async getPoolMetrics() {
    if (!this.isInitialized) {
      throw new PoolNotInitializedException();
    }
    return this.metricsWatcher.metrics();
  }

  private async executeTask(
    contextId: string,
    context: TaskContext,
    taskId: string,
    task: TaskMessage,
  ) {
    if (!this.isInitialized) {
      throw new PoolNotInitializedException();
    }
    this.runningContextQueue.enqueue({
      payload: context,
      id: contextId,
    });
    const taskEvent = this.taskEvents.get(taskId);
    if (!taskEvent) {
      this.logger.warn('Task event not found for id:', taskId);

      // Remove context from running queue and return to idle queue if task event not found
      this.runningContextQueue.remove(contextId);
      this.idleContextQueue.enqueue({ payload: context });
      return;
    }
    taskEvent.emit(EventTags.RUNNING);
    // Recover context if non-responsive
    if (!(await context.checkContextResponsive())) {
      this.logger.info(`Fixing context due to non-responsive`);
      await context.fix();
    }
    const record = taskRegistry.resolveById(task.handlerId);
    const result = await context.runTask(record.handler, task.payload);
    taskEvent.emit(EventTags.DONE, result);
    // Resolve task event
    this.taskEvents.delete(taskId);
    // Remove context from running queue and return to idle queue
    this.runningContextQueue.remove(contextId);
    this.idleContextQueue.enqueue({
      payload: context,
    });
    // Emit next task if pending task exist
    if (!this.taskQueue.isEmpty) {
      this.emit(this.runTaskEvent);
    }
  }

  public async close() {
    // Should stop threshold watcher before closing
    if (this.metricsWatcher) {
      this.metricsWatcher.stopThresholdWatcher();
    }
    if (this.isExternalQueue(this.taskQueue)) {
      await this.taskQueue.dispose();
    }
    await this.browser.close();
  }

  private async createTaskQueue(
    provider: QueueProvider,
    queueMode: QueueMode,
  ): Promise<IQueue<TaskMessage>> {
    if (provider === QueueProvider.MEMORY) {
      return queueMode === QueueMode.DEFAULT
        ? new Queue<TaskMessage>()
        : new PriorityQueue<TaskMessage>();
    }
    if (queueMode === QueueMode.PRIORITY) {
      this.logger.warn(
        'Priority queue is not supported with external queue providers. Falling back to default ordering.',
      );
    }
    if (provider === QueueProvider.RABBITMQ) {
      return new RabbitMQQueue<TaskMessage>();
    }
    if (provider === QueueProvider.SQS) {
      return new SQSQueue<TaskMessage>();
    }
    return new Queue<TaskMessage>();
  }

  private isExternalQueue(
    queue: IQueue<TaskMessage>,
  ): queue is IExternalQueue<TaskMessage> {
    return (
      this.queueProvider === QueueProvider.RABBITMQ ||
      this.queueProvider === QueueProvider.SQS
    );
  }
}
