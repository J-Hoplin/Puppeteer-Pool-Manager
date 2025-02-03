import { ContextState, RequireState, SetState } from '../../decorator/state';
import { RequestedTask, RunTaskResponse } from '../../types/type';
import * as puppeteer from 'puppeteer';

export abstract class TaskContext {
  protected page: puppeteer.Page;
  private ResponsiveCheckTimeOut = 200;

  constructor(
    protected readonly browser: puppeteer.Browser,
    protected readonly contextTimeoutSecond: number = 10,
  ) {}

  public async checkContextResponsive() {
    try {
      await this.page.evaluate(
        () => true,
        {},
        { timeout: this.ResponsiveCheckTimeOut },
      );
      return true;
    } catch {
      return false;
    }
  }

  @SetState(ContextState.RUNNING)
  protected async clearResource() {
    /**
     * Clearing Browser Context
     * - Cache
     * - Cookies
     * - Local Storage
     * - Session Storage
     */
    if (this.page) {
      if (this.page.url() !== 'about:blank') {
        // 'about:blank' can't access to local storage
        await this.page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      }
      const devToolSession = await this.page.createCDPSession();
      await this.page.goto('about:blank');
      await devToolSession.send('Network.clearBrowserCache');
      await devToolSession.send('Network.clearBrowserCookies');
    }
  }

  @RequireState(ContextState.IDLE)
  @SetState(ContextState.RUNNING)
  async runTask<T>(task: RequestedTask<T>): Promise<RunTaskResponse<T>> {
    if (this.page) {
      try {
        // Raise error if context exceed timeout
        const result = await Promise.race([
          task(this.page),
          new Promise((_, reject) =>
            setTimeout(
              () => reject('Timeout'),
              this.contextTimeoutSecond * 1000,
            ),
          ),
        ]);
        return {
          success: true,
          data: result as T,
        };
      } catch (e) {
        return {
          success: false,
          error: e as Error,
        };
      } finally {
        await this.clearResource();
      }
    }
  }

  @RequireState(ContextState.IDLE)
  async free(): Promise<void> {
    if (this.page) {
      await this.clearResource();
      await this.page.close();
    }
  }

  abstract init(): Promise<void> | void;

  abstract fix(): Promise<void> | void;
}
