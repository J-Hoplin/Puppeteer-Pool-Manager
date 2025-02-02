import { RequestedTask, RunTaskResponse } from '../types/type';
import { PoolNotInitializedException } from '../error/pool';
import { IsolateContext } from './context/isolate';
import { SharedContext } from './context/shared';
import { TaskContext } from './context/context';
import { EventEmitter } from 'node:events';
import { Queue } from '../queue/queue';
import * as puppeteer from 'puppeteer';
import { poolLogger } from '../logger';
import 'reflect-metadata';
/**
 * Enumeration for Task Dispatcher init
 *
 * SHARED: All request will share cookies and local storage
 * ISOLATED: All request will have their own cookies and local storage (Browser Context)
 */
export enum ContextMode {
  SHARED = 'SHARED',
  ISOLATED = 'ISOLATED',
}

export enum EventTags {
  RUNNING = 'RUNNING',
  PENDING = 'PENDING',
  DONE = 'DONE',
}

export class TaskDispatcher extends EventEmitter {
  // Task Queue
  private taskQueue: Queue<RequestedTask> = new Queue<RequestedTask>();

  // Context Queue
  private idleContextQueue: Queue<TaskContext> = new Queue<TaskContext>();
  private runningContextQueue: Queue<TaskContext> = new Queue<TaskContext>();

  // Browser Instance
  private browser: puppeteer.Browser;

  // Internal Event
  private runTaskEvent = 'RUN_TASK';

  private taskEvents: Map<string, EventEmitter> = new Map<
    string,
    EventEmitter
  >();

  constructor() {
    super();
    this.on(this.runTaskEvent, async () => {
      // async 추가
      if (!this.browser) {
        // browser 초기화 체크 추가
        return;
      }
      if (this.taskQueue.isEmpty || this.idleContextQueue.isEmpty) {
        return;
      }
      const context = this.idleContextQueue.dequeue();
      const task = this.taskQueue.dequeue();
      await this.executeTask(
        context.id,
        context.element,
        task.id,
        task.element,
      ); // await 추가
    });
  }

  async init(
    concurrencyLevel: number = 1,
    contextMode: ContextMode = ContextMode.SHARED,
    options: puppeteer.LaunchOptions = {},
  ) {
    poolLogger.info('Initializing Task Dispatcher');
    this.browser = await puppeteer.launch(options);
    for (let i = 0; i < concurrencyLevel; i++) {
      let id;
      if (contextMode === ContextMode.SHARED) {
        const instance = new SharedContext(this.browser);
        await instance.init();
        id = this.idleContextQueue.enqueue(instance);
      } else {
        const instance = new IsolateContext(this.browser);
        await instance.init();
        id = this.idleContextQueue.enqueue(instance);
      }
      poolLogger.info(`Context initialized - ID: ${id}`);
    }
  }

  async dispatchTask<T>(task: RequestedTask<T>): Promise<{
    event: EventEmitter;
    resultListener: Promise<unknown>;
  }> {
    if (!this.browser) {
      throw new PoolNotInitializedException();
    }
    const event = new EventEmitter();
    const taskId = this.taskQueue.enqueue(task);
    this.taskEvents.set(taskId, event);
    const resultListener = new Promise((resolve, reject) => {
      // Wait until task is done and return result
      event.once(EventTags.DONE, (result: RunTaskResponse<T>) => {
        resolve(result);
      });
      if (!this.idleContextQueue.isEmpty) {
        this.emit(this.runTaskEvent);
      }
    });
    return { event, resultListener };
  }

  private async executeTask(
    contextId: string,
    context: TaskContext,
    taskId: string,
    task: RequestedTask,
  ) {
    poolLogger.info(`Task ${taskId} started in context ${contextId}`);
    this.runningContextQueue.enqueue(context);
    const taskEvent = this.taskEvents.get(taskId);
    // taskEvent가 undefined인지 체크 추가
    if (!taskEvent) {
      poolLogger.error(`No event emitter found for task ${taskId}`);
      return;
    }
    taskEvent.emit(EventTags.RUNNING);
    const result = await context.runTask(task);
    taskEvent.emit(EventTags.DONE, result);
    // Resolve task event
    this.taskEvents.delete(taskId);
    // Remove context from running queue and return to idle queue
    this.runningContextQueue.remove(contextId);
    this.idleContextQueue.enqueue(context);
    // Emit next task if pending task exist
    if (!this.taskQueue.isEmpty) {
      this.emit(this.runTaskEvent);
    }
  }

  public async close() {
    await this.browser.close();
  }
}
