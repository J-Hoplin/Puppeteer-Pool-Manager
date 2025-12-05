import type { Page } from 'puppeteer';

export type TaskHandler<TPayload = any, TResult = any> = (
  page: Page,
  payload: TPayload,
) => Promise<TResult> | TResult;

export type TaskMessage<TPayload = any> = {
  handlerId: string;
  payload: TPayload;
};

export type RunTaskResponse<T> =
  | {
      success: false;
      error: Error;
    }
  | {
      success: true;
      data: T;
    };
