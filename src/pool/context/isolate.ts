import { RequireState, SetState, ContextState } from '../../decorator/state';
import { TaskContext } from './context';
import * as puppeteer from 'puppeteer';

export class IsolateContext extends TaskContext {
  /**
   * Isolated Context
   */
  private context: puppeteer.BrowserContext;

  @SetState(ContextState.IDLE)
  async init(): Promise<void> {
    this.context = await this.browser.createBrowserContext();
    this.page = await this.context.newPage();
  }

  @RequireState(ContextState.IDLE)
  @SetState(ContextState.RUNNING)
  async fix(): Promise<void> {
    if (this.page) {
      await this.context.close();
      this.context = await this.browser.createBrowserContext();
      this.page = await this.context.newPage();
    }
  }
}
