// types.ts
import type { Page } from 'puppeteer';

export type RequestedTask<T = any> = (page: Page) => Promise<T> | T;

export type RunTaskResponse<T> =
  | {
      success: false;
      error: Error;
    }
  | {
      success: true;
      data: T;
    };
