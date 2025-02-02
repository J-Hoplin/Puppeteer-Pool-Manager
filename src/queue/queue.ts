/**
 * Queue Element Type for Queue
 *
 * - ID: Element ID for queue, to allow event based loosely coupled
 * - Element: Element to be enqueued
 * - EnqueuedAt: Time when element was enqueued
 */
type QueueElement<T> = {
  id: string;
  element: T;
  enqueuedAt: Date;
};

export class Queue<T> {
  private queue: QueueElement<T>[] = [];

  public enqueue(element: T, prefix?: string): string {
    // Suppress UUID usage for CPU Intensive Task
    const id = prefix
      ? `${prefix}_${Math.random().toString(36).substring(7)}`
      : Math.random().toString(36).substring(7);
    this.queue.push({
      id: id,
      element,
      enqueuedAt: new Date(),
    });
    return id;
  }

  public dequeue(): QueueElement<T> {
    if (this.queue.length === 0) {
      throw new Error('Queue is empty');
    }
    return this.queue.shift();
  }

  public remove(id: string): void {
    this.queue = this.queue.filter((element) => element.id !== id);
  }

  public get length(): number {
    return this.queue.length;
  }

  public get isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
