import { IQueue, QueueElement } from './queue.interface';

export class Queue<T> implements IQueue<T> {
  private queue: QueueElement<T>[] = [];

  public enqueue(param: { payload: T; id?: string }): string {
    const elementId = param.id || Math.random().toString(36).substring(7);
    this.queue.push({
      id: elementId,
      payload: param.payload,
      enqueuedAt: new Date(),
    });
    return elementId;
  }

  public dequeue(): QueueElement<T> {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue.shift();
  }

  public remove(id: string): void {
    this.queue = this.queue.filter((entry) => entry.id !== id);
  }

  public get size(): number {
    return this.queue.length;
  }

  public get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public clear(): void {
    this.queue = [];
  }

  public contains(id: string): boolean {
    return this.queue.some((entry) => entry.id === id);
  }

  public values(): QueueElement<T>[] {
    return this.queue;
  }
}
