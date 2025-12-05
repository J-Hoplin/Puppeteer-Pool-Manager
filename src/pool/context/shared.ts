import { RequireState, SetState, ContextState } from '../../decorator/state';
import { TaskContext } from './context';
import * as puppeteer from 'puppeteer';

export class SharedContext extends TaskContext {
  /**
   * Shared Context
   *
   * Share cookies and local storage...etc from browsers
   */
  @SetState(ContextState.IDLE)
  async init(): Promise<void> {
    // No warm-up required; pages are created per request
  }

  protected async createPage(): Promise<puppeteer.Page> {
    return this.browser.newPage();
  }

  @RequireState(ContextState.IDLE)
  @SetState(ContextState.RUNNING)
  async fix(): Promise<void> {
    await this.free();
  }
}
