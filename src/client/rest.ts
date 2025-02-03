/**
 * APIs for RESTful API mode
 */
import { ContextMode, TaskDispatcher } from '../pool';
import * as puppeteer from 'puppeteer';

/**
 * Invoke this function to start a new Puppeteer Pool
 */
export async function StartPuppeteerPool(
  concurrencyLevel: number,
  contextMode: ContextMode,
  options?: puppeteer.LaunchOptions,
  customConfigPath?: string,
): Promise<TaskDispatcher> {
  const instance = new TaskDispatcher();
  await instance.init(concurrencyLevel, contextMode, options, customConfigPath);
  return instance;
}

/**
 * Invoke this function to stop a Puppeteer Pool
 *
 * Please enroll this function in your graceful shutdown process
 */
export async function StopPuppeteerPool(instance: TaskDispatcher) {
  await instance.close();
}
