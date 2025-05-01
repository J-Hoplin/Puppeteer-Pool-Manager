/**
 * APIs for RESTful API mode
 */
import { PoolNotInitializedException } from '../error';
import { ContextMode, QueueMode } from '../pool/enum';
import { TaskDispatcher } from '../pool/dispatcher';
import { RequestedTask } from '../types';
import * as puppeteer from 'puppeteer';
import { LogLevel } from '../logger';

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
  private static dispatcherInstance: TaskDispatcher;
  private static instance: PuppeteerPool;

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
  public static async start(options: PuppeteerPoolStartOptions) {
    const startOptions: PuppeteerPoolStartOptions = {
      concurrencyLevel: 3,
      contextMode: ContextMode.SHARED,
      options: {},
      enableLog: true,
      taskQueueType: QueueMode.PRIORITY,
      logLevel: LogLevel.DEBUG,
      ...options,
    };

    if (!PuppeteerPool.isInitialized) {
      // Initialize Task Dispatcher
      PuppeteerPool.dispatcherInstance = new TaskDispatcher();
      await PuppeteerPool.dispatcherInstance.init(
        startOptions.concurrencyLevel,
        startOptions.taskQueueType,
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
    return PuppeteerPool.instance;
  }

  /**
   * Invoke this function to stop a Puppeteer Pool
   *
   * Please enroll this function in your graceful shutdown process
   */
  public static async stop() {
    this.checkInstanceInitalized();
    await PuppeteerPool.dispatcherInstance.close();
  }

  /**
   * Invoke this function to run a task
   *
   * priorty option is only available in priority queue mode and will be ignored in default queue mode
   */
  public static async runTask<T>(task: RequestedTask<T>, priority: number = 1) {
    this.checkInstanceInitalized();
    return await PuppeteerPool.dispatcherInstance.dispatchTask(task, priority);
  }

  /**
   * Invoke this function to get pool metrics
   */
  public static async getPoolMetrics() {
    this.checkInstanceInitalized();
    return await PuppeteerPool.dispatcherInstance.getPoolMetrics();
  }
}
