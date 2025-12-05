/**
 * Queue Element Type for Queue
 *
 * - ID: Element ID for queue, to allow event based loosely coupled
 * - Element: Element to be enqueued
 * - EnqueuedAt: Time when element was enqueued
 */
export type QueueElement<T> = {
  id: string;
  payload: T;
  enqueuedAt: Date;
};

/**
 * Priority Queue Element Type for Priority Queue
 *
 * - Priority: Priority of the element (higher number means higher priority)
 */
export type PriorityQueueElement<T> = QueueElement<T> & {
  priority: number;
};

export interface IQueue<T> {
  /**
   * Require as getter
   */
  size: number;
  isEmpty: boolean;

  /**
   *
   * For both normal queue and priority queue
   */
  enqueue(param: { payload: T; id?: string }): string;
  enqueue(param: { payload: T; id?: string; priority?: number }): string;

  dequeue(): { id: string; payload: T; enqueuedAt: Date };

  remove(id: string): void;

  clear(): void;

  contains(id: string): boolean;

  values(): { id: string; payload: T; enqueuedAt: Date }[];
}

export interface IExternalQueue<T> extends IQueue<T> {
  init(): Promise<void>;
  dispose(): Promise<void>;
  onAvailable(callback: () => void): void;
}
