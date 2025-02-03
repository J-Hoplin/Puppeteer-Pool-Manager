import { RequestedTask, RunTaskResponse } from '../types/type';
import { PoolNotInitializedException } from '../error/pool';
import { IsolateContext } from './context/isolate';
import { SharedContext } from './context/shared';
import { TaskContext } from './context/context';
import { EventEmitter } from 'node:events';
import { MetricsWatcher } from './metrics';
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

export class TaskDispatcher extends EventEmitter {
  // Task Queue
  private taskQueue: Queue<RequestedTask> = new Queue<RequestedTask>();

  // Context Queue
  private idleContextQueue: Queue<TaskContext> = new Queue<TaskContext>();
  private runningContextQueue: Queue<TaskContext> = new Queue<TaskContext>();

  // Browser Instance
  private browser: puppeteer.Browser;

  // Internal Event
  private runTaskEvent = 'RUN_TASK';

  // Metrics Watcher and Threshold Watcher
  private metricsWatcher: MetricsWatcher;

  // States
  private isInitialized: boolean = false;
  private isRestarting: boolean = false;
  private concurrencyLevel: number = 1;
  private contextMode: ContextMode = ContextMode.SHARED;
  private launchOptions: puppeteer.LaunchOptions = {};
  private threshold: { cpu: number; memory: number } = {
    cpu: 80,
    memory: 1024,
  };

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
    concurrencyLevel: number = 1,
    contextMode: ContextMode = ContextMode.SHARED,
    options: puppeteer.LaunchOptions = {},
    threshold?: { cpu: number; memory: number },
  ) {
    poolLogger.info('Initializing Task Dispatcher');
    this.concurrencyLevel = concurrencyLevel;
    this.contextMode = contextMode;
    this.browser = await puppeteer.launch(options);
    this.launchOptions = options;
    this.threshold = threshold || this.threshold;
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
    this.metricsWatcher.startThresholdWatcher(threshold, async () => {
      await this.restartBrowserAndContexts();
    });
    this.isInitialized = true;
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
      const browserOptions = this.launchOptions;
      poolLogger.info(
        `Waiting for running tasks to complete... ${this.runningContextQueue.size} task`,
      );
      if (this.runningContextQueue.size > 0) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (this.runningContextQueue.size === 0) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      await this.close();
      this.idleContextQueue.clear();
      this.runningContextQueue.clear();

      // Reinitialize browser and contexts
      this.browser = await puppeteer.launch(browserOptions);
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

      poolLogger.info('Restart Completed!');
    } catch (error) {
      poolLogger.error('Fail to restart:', error);
      throw error;
    } finally {
      this.isRestarting = false;
      if (!this.taskQueue.isEmpty) {
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
    const resultListener = new Promise((resolve, reject) => {
      // Wait until task is done and return result
      event.once(EventTags.DONE, (result: RunTaskResponse<T>) => {
        resolve(result);
      });
      if (!this.idleContextQueue.isEmpty) {
        this.emit(this.runTaskEvent);
      }
    });
    return { event, resultListener };
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
    if (this.metricsWatcher) {
      this.metricsWatcher.stopThresholdWatcher();
    }
    await this.browser.close();
  }
}
