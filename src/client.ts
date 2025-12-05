/**
 * APIs for RESTful API mode
 */
import { ContextMode, QueueMode, QueueProvider } from './pool/enum';
import { RunTaskResponse, TaskHandler } from './types';
import { PoolNotInitializedException } from './error';
import { taskRegistry } from './pool/task-registry';
import { TaskDispatcher } from './pool/dispatcher';
import { envQueueProvider } from './queue';
import * as puppeteer from 'puppeteer';
import { LogLevel } from './logger';

export type PuppeteerPoolStartOptions = {
  /**
   * Number of concurrency
   */
  concurrencyLevel?: number;
  /**
   * Task queue type
   */
  taskQueueType?: QueueMode;
  /**
   * Queue provider
   */
  queueProvider?: QueueProvider;
  /**
   * Context mode
   */
  contextMode?: ContextMode;
  /**
   * Puppeteer launch options
   */
  options?: puppeteer.LaunchOptions;
  /**
   * Custom config path
   */
  customConfigPath?: string;
  /**
   * Enable log
   */
  enableLog?: boolean;
  /**
   * Log level
   */
  logLevel?: LogLevel;
};

export class PuppeteerPool {
  private static isInitialized = false;
  private static dispatcherInstance: TaskDispatcher | null = null;
  private static instance: PuppeteerPool | null = null;
  private static lastStartOptions?: PuppeteerPoolStartOptions;

  /**
   * Check if the instance is initialized
   * Throw an error if the instance is not initialized
   */
  private static checkInstanceInitalized() {
    if (!PuppeteerPool.isInitialized) {
      throw new PoolNotInitializedException();
    }
  }

  /**
   * Private constructor to make sure this class is a singleton
   */
  private constructor() {}

  /**
   * Invoke this function to start a new Puppeteer Pool
   */
  public static async start(options: PuppeteerPoolStartOptions = {}) {
    const startOptions: PuppeteerPoolStartOptions = {
      concurrencyLevel: 3,
      contextMode: ContextMode.SHARED,
      options: {},
      enableLog: true,
      taskQueueType: QueueMode.DEFAULT,
      queueProvider: envQueueProvider(),
      logLevel: LogLevel.DEBUG,
      ...options,
    };

    if (!PuppeteerPool.isInitialized) {
      PuppeteerPool.lastStartOptions = startOptions;
      // Initialize Task Dispatcher
      PuppeteerPool.dispatcherInstance = new TaskDispatcher();
      await PuppeteerPool.dispatcherInstance.init(
        startOptions.concurrencyLevel,
        startOptions.taskQueueType,
        startOptions.queueProvider,
        startOptions.contextMode,
        startOptions.enableLog,
        startOptions.logLevel,
        startOptions.options,
        startOptions.customConfigPath,
      );
      // Initialize REST Client Instance
      PuppeteerPool.instance = new PuppeteerPool();
      // Change state to initialized
      PuppeteerPool.isInitialized = true;
    }
    return PuppeteerPool.instance!;
  }

  /**
   * Invoke this function to stop a Puppeteer Pool
   *
   * Please enroll this function in your graceful shutdown process
   */
  public static async stop() {
    if (!PuppeteerPool.isInitialized) {
      return;
    }
    await PuppeteerPool.dispatcherInstance!.close();
    PuppeteerPool.isInitialized = false;
    PuppeteerPool.dispatcherInstance = null;
    PuppeteerPool.instance = null;
  }

  /**
   * Restart pool with previous or supplied options
   */
  public static async restart(options?: PuppeteerPoolStartOptions) {
    await PuppeteerPool.stop();
    const restartOptions = options ?? PuppeteerPool.lastStartOptions ?? {};
    return PuppeteerPool.start(restartOptions);
  }

  /**
   * Invoke this function to run a task
   *
   * priorty option is only available in priority queue mode and will be ignored in default queue mode
   */
  public static enrollTask(id: string, handler: TaskHandler) {
    return taskRegistry.enroll(id, handler);
  }

  public static async runTask<TPayload, TResult>(
    taskKey: symbol,
    payload: TPayload,
    priority: number = 1,
  ): Promise<RunTaskResponse<TResult>> {
    this.checkInstanceInitalized();
    const record = taskRegistry.resolveByKey(taskKey);
    return await PuppeteerPool.dispatcherInstance!.dispatchTask<TResult>(
      {
        handlerId: record.id,
        payload,
      },
      priority,
    );
  }

  /**
   * Invoke this function to get pool metrics
   */
  public static async getPoolMetrics() {
    this.checkInstanceInitalized();
    return await PuppeteerPool.dispatcherInstance!.getPoolMetrics();
  }
}
