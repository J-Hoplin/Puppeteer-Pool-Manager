import { IQueue, PriorityQueueElement } from './queue.interface';

export class PriorityQueue<T> implements IQueue<T> {
  private queue: PriorityQueueElement<T>[] = [];

  public enqueue(param: {
    payload: T;
    id?: string;
    priority?: number;
  }): string {
    const elementId = param.id ?? Math.random().toString(36).substring(7);
    const priority = param.priority ?? 1;
    const newElement: PriorityQueueElement<T> = {
      id: elementId,
      payload: param.payload,
      priority,
      enqueuedAt: new Date(),
    };

    let insertIndex = 0;
    while (
      insertIndex < this.queue.length &&
      this.queue[insertIndex].priority >= priority
    ) {
      insertIndex++;
    }
    this.queue.splice(insertIndex, 0, newElement);

    return elementId;
  }

  public dequeue(): PriorityQueueElement<T> {
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
    return this.queue.some((entry) => entry.id === id);
  }

  public values(): PriorityQueueElement<T>[] {
    return this.queue;
  }
}
