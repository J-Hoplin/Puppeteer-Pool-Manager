import { IQueue, QueueElement } from './queue.interface';

export class Queue<T> implements IQueue<T> {
  private queue: QueueElement<T>[] = [];

  public enqueue(param: { element: T; id?: string }): string {
    // Suppress UUID usage for CPU Intensive Task
    const elementId = param.id || Math.random().toString(36).substring(7);
    this.queue.push({
      id: elementId,
      element: param.element,
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
    this.queue = this.queue.filter((element) => element.id !== id);
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
    return this.queue.some((element) => element.id === id);
  }

  public values(): QueueElement<T>[] {
    return this.queue;
  }
}
