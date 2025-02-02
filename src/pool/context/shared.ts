import { RequireState, SetState, ContextState } from '../../decorator/state';
import { TaskContext } from './context';

export class SharedContext extends TaskContext {
  /**
   * Shared Context
   *
   * Share cookies and local storage...etc from browsers
   */
  @SetState(ContextState.IDLE)
  async init(): Promise<void> {
    this.page = await this.browser.newPage();
  }

  @RequireState(ContextState.IDLE)
  @SetState(ContextState.RUNNING)
  async fix(): Promise<void> {
    if (this.page) {
      await this.free();
      this.page = await this.browser.newPage();
    }
  }
}
