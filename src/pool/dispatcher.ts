import { IsolateContext, SharedContext, TaskContext } from './context';
import { RequestedTask, RunTaskResponse } from '../types/type';
import { PoolNotInitializedException } from '../error/pool';
import { MetricsWatcher } from '../watcher/metrics';
import { ConfigType, loadConfig } from '../configs';
import { EventEmitter } from 'node:events';
import { Queue } from '../queue/queue';
import * as puppeteer from 'puppeteer';
import { poolLogger } from '../logger';

/**
 * Enumeration for Task Dispatcher init
 *
 * SHARED: All request will share cookies and local storage
 * ISOLATED: All request will have their own cookies and local storage (Browser Context)
 */
export enum ContextMode {
  SHARED = 'SHARED',
  ISOLATED = 'ISOLATED',
}

export enum EventTags {
  RUNNING = 'RUNNING',
  PENDING = 'PENDING',
  DONE = 'DONE',
}

const DEFAULT_VALUES = {
  CONCURRENCY_LEVEL: 1,
  CONTEXT_MODE: ContextMode.SHARED,
  THRESHOLD: {
    cpu: 80,
    memory: 1024,
  },
  QUEUE_CHECK_INTERVAL: 100,
} as const;

const INTERNAL_EVENTS = {
  RUN_TASK: 'RUN_TASK',
} as const;

export class TaskDispatcher extends EventEmitter {
  // Task Queue
  private taskQueue: Queue<RequestedTask> = new Queue<RequestedTask>();

  // Context Queue
  private idleContextQueue: Queue<TaskContext> = new Queue<TaskContext>();
  private runningContextQueue: Queue<TaskContext> = new Queue<TaskContext>();

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
  private launchOptions: puppeteer.LaunchOptions = {};
  private poolConfig: ConfigType;
  private threshold: { cpu: number; memory: number } = DEFAULT_VALUES.THRESHOLD;

  private taskEvents: Map<string, EventEmitter> = new Map<
    string,
    EventEmitter
  >();

  constructor() {
    super();
    this.on(this.runTaskEvent, async () => {
      if (!this.browser) {
        return;
      }
      if (this.taskQueue.isEmpty || this.idleContextQueue.isEmpty) {
        return;
      }
      const context = this.idleContextQueue.dequeue();
      const task = this.taskQueue.dequeue();
      await this.executeTask(
        context.id,
        context.element,
        task.id,
        task.element,
      );
    });
  }

  async init(
    concurrencyLevel: number = DEFAULT_VALUES.CONCURRENCY_LEVEL,
    contextMode: ContextMode = DEFAULT_VALUES.CONTEXT_MODE,
    options: puppeteer.LaunchOptions = {},
    customPoolConfigPath?: string,
  ) {
    // Read Config
    this.poolConfig = loadConfig(customPoolConfigPath);
    poolLogger.info('Initializing Task Dispatcher');
    // Set instance variables
    this.concurrencyLevel = concurrencyLevel;
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
      let id;
      if (contextMode === ContextMode.SHARED) {
        const instance = new SharedContext(this.browser);
        await instance.init();
        id = this.idleContextQueue.enqueue(instance);
      } else {
        const instance = new IsolateContext(this.browser);
        await instance.init();
        id = this.idleContextQueue.enqueue(instance);
      }
      poolLogger.info(`Context initialized - ID: ${id}`);
    }
    // Start Metrics Watcher
    this.metricsWatcher = new MetricsWatcher(this.browser.process().pid);
    if (this.poolConfig.threshold.activate) {
      this.threshold = {
        cpu: this.poolConfig.threshold.cpu,
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
      poolLogger.info('Restart already in progress, skipping...');
      return;
    }

    this.isRestarting = true;
    try {
      const contextMode = this.contextMode;
      const concurrencyLevel = this.concurrencyLevel;
      poolLogger.info(
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
        let id;
        if (contextMode === ContextMode.SHARED) {
          const instance = new SharedContext(this.browser);
          await instance.init();
          id = this.idleContextQueue.enqueue(instance);
        } else {
          const instance = new IsolateContext(this.browser);
          await instance.init();
          id = this.idleContextQueue.enqueue(instance);
        }
        poolLogger.info(`Context initialized - ID: ${id}`);
      }
      this.metricsWatcher = new MetricsWatcher(this.browser.process().pid);
      if (this.poolConfig.threshold.activate) {
        this.threshold = {
          cpu: this.poolConfig.threshold.cpu,
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
      poolLogger.info('Restart Completed!');
    } catch (error) {
      poolLogger.error('Fail to restart:', error);
      throw error;
    } finally {
      // Change State to Restart
      this.isRestarting = false;
      // Run task as much as possible after restart. Task can be pending during restart.
      const maxTask = Math.min(this.taskQueue.size, this.idleContextQueue.size);
      for (let i = 0; i < maxTask; i++) {
        this.emit(this.runTaskEvent);
      }
    }
  }

  async dispatchTask<T>(task: RequestedTask<T>): Promise<{
    event: EventEmitter;
    resultListener: Promise<unknown>;
  }> {
    if (!this.isInitialized) {
      throw new PoolNotInitializedException();
    }
    const event = new EventEmitter();
    const taskId = this.taskQueue.enqueue(task);
    this.taskEvents.set(taskId, event);
    const resultListener = new Promise((resolve) => {
      // Wait until task is done and return result
      event.once(EventTags.DONE, (result: RunTaskResponse<T>) => {
        resolve(result);
      });
      // Emit run task if idle context exist and dispatcher is not restarting state
      if (!this.isRestarting && !this.idleContextQueue.isEmpty) {
        this.emit(this.runTaskEvent);
      }
    });
    return { event, resultListener };
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
    task: RequestedTask,
  ) {
    if (!this.isInitialized) {
      throw new PoolNotInitializedException();
    }
    this.runningContextQueue.enqueue(context, contextId);
    const taskEvent = this.taskEvents.get(taskId);
    taskEvent.emit(EventTags.RUNNING);
    // Recover context if non-responsive
    if (!(await context.checkContextResponsive())) {
      poolLogger.info(`Fixing context due to non-responsive`);
      await context.fix();
    }
    const result = await context.runTask(task);
    taskEvent.emit(EventTags.DONE, result);
    // Resolve task event
    this.taskEvents.delete(taskId);
    // Remove context from running queue and return to idle queue
    this.runningContextQueue.remove(contextId);
    this.idleContextQueue.enqueue(context);
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
    await this.browser.close();
  }
}
