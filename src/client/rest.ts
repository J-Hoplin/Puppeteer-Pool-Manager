/**
 * APIs for RESTful API mode
 */
import { PoolNotInitializedException } from '../error';
import { TaskDispatcher } from '../pool/dispatcher';
import { ContextMode } from '../pool/enum';
import { RequestedTask } from '../types';
import * as puppeteer from 'puppeteer';
import { LogLevel } from '../logger';

export type PuppeteerPoolStartOptions = {
  /**
   * Number of concurrency
   */
  concurrencyLevel: number;
  /**
   * Context mode
   */
  contextMode: ContextMode;
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
  private checkInstanceInitalized() {
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
      logLevel: LogLevel.DEBUG,
      ...options,
    };

    if (!PuppeteerPool.isInitialized) {
      // Initialize Task Dispatcher
      PuppeteerPool.dispatcherInstance = new TaskDispatcher();
      await PuppeteerPool.dispatcherInstance.init(
        startOptions.concurrencyLevel,
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
  public async stop() {
    this.checkInstanceInitalized();
    await PuppeteerPool.dispatcherInstance.close();
  }

  /**
   * Invoke this function to run a task
   */
  public async runTask<T>(task: RequestedTask<T>) {
    this.checkInstanceInitalized();
    return await PuppeteerPool.dispatcherInstance.dispatchTask(task);
  }

  /**
   * Invoke this function to get pool metrics
   */
  public async getPoolMetrics() {
    this.checkInstanceInitalized();
    return await PuppeteerPool.dispatcherInstance.getPoolMetrics();
  }
}
