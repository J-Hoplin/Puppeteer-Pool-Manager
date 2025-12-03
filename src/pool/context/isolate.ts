import { RequireState, SetState, ContextState } from '../../decorator/state';
import { TaskContext } from './context';
import * as puppeteer from 'puppeteer';

export class IsolateContext extends TaskContext {
  /**
   * Isolated Context
   */
  private context: puppeteer.BrowserContext | null = null;

  @SetState(ContextState.IDLE)
  async init(): Promise<void> {
    this.context = await this.browser.createBrowserContext();
  }

  protected async createPage(): Promise<puppeteer.Page> {
    if (!this.context) {
      this.context = await this.browser.createBrowserContext();
    }
    return this.context.newPage();
  }

  @RequireState(ContextState.IDLE)
  @SetState(ContextState.RUNNING)
  async fix(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    this.context = await this.browser.createBrowserContext();
  }

  @RequireState(ContextState.IDLE)
  async free(): Promise<void> {
    await super.free();
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }
}
