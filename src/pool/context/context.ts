import { ContextState, RequireState, SetState } from '../../decorator/state';
import { RunTaskResponse, TaskHandler } from '../../types/type';
import * as puppeteer from 'puppeteer';

export abstract class TaskContext {
  protected page: puppeteer.Page | null = null;

  constructor(
    protected readonly browser: puppeteer.Browser,
    protected readonly contextTimeoutSecond: number = 10,
  ) {}

  public async checkContextResponsive() {
    return this.browser.isConnected();
  }

  protected abstract createPage(): Promise<puppeteer.Page>;

  private async preparePage() {
    if (this.page) {
      await this.clearResource();
    }
    this.page = await this.createPage();
  }

  @SetState(ContextState.RUNNING)
  protected async clearResource() {
    if (!this.page) {
      return;
    }
    try {
      if (this.page.url() !== 'about:blank') {
        await this.page.goto('about:blank');
      }
      await this.page.close();
    } catch {
      // Ignore cleanup errors
    } finally {
      this.page = null;
    }
  }

  @RequireState(ContextState.IDLE)
  @SetState(ContextState.RUNNING)
  async runTask<TPayload, TResult>(
    handler: TaskHandler<TPayload, TResult>,
    payload: TPayload,
  ): Promise<RunTaskResponse<TResult>> {
    try {
      await this.preparePage();
      const result = await Promise.race([
        handler(this.page!, payload),
        new Promise((_, reject) =>
          setTimeout(() => reject('Timeout'), this.contextTimeoutSecond * 1000),
        ),
      ]);
      return {
        success: true,
        data: result as TResult,
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

  @RequireState(ContextState.IDLE)
  async free(): Promise<void> {
    await this.clearResource();
  }

  abstract init(): Promise<void> | void;

  abstract fix(): Promise<void> | void;
}
