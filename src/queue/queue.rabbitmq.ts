import { lazyImportModule } from '../utils/module-loader';
import { IQueue, QueueElement } from './queue.interface';
import { randomUUID } from 'node:crypto';

type AmqpConnection = any;
type AmqpChannel = any;
type AmqpMessage = any;

type RabbitMQQueueOptions = {
  url?: string;
  queueName?: string;
  prefetch?: number;
};

type PendingMessage = {
  id: string;
  message: AmqpMessage;
};

const DEFAULT_URL = 'amqp://localhost';
const DEFAULT_QUEUE = 'puppeteer_pool_tasks';

const generateId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
};

export class RabbitMQQueue<T> implements IQueue<T> {
  private connection: AmqpConnection;
  private channel: AmqpChannel;
  private consumerTag?: string;
  private readonly taskStore = new Map<string, QueueElement<T>>();
  private readonly pendingMessages: PendingMessage[] = [];
  private availabilityListener?: () => void;

  constructor(private readonly options: RabbitMQQueueOptions = {}) {}

  private get queueName() {
    return (
      this.options.queueName ||
      process.env.PUPPETEER_POOL_RABBITMQ_QUEUE ||
      DEFAULT_QUEUE
    );
  }

  private get connectionUrl() {
    return (
      this.options.url || process.env.PUPPETEER_POOL_RABBITMQ_URL || DEFAULT_URL
    );
  }

  public async init() {
    if (this.channel) {
      return;
    }
    const amqplib = await lazyImportModule<any>('amqplib');
    this.connection = await amqplib.connect(this.connectionUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(this.queueName, { durable: true });
    if (this.options.prefetch) {
      await this.channel.prefetch(this.options.prefetch);
    }
    const result = await this.channel.consume(
      this.queueName,
      (message: AmqpMessage) => {
        if (!message) {
          return;
        }
        const taskId = message.content.toString();
        this.pendingMessages.push({ id: taskId, message });
        this.availabilityListener?.();
      },
      { noAck: false },
    );
    this.consumerTag = result.consumerTag;
  }

  public async dispose() {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
    }
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    this.taskStore.clear();
    this.pendingMessages.length = 0;
  }

  public enqueue(param: { element: T; id?: string }): string {
    const elementId = param.id ?? generateId();
    const queueElement: QueueElement<T> = {
      id: elementId,
      element: param.element,
      enqueuedAt: new Date(),
    };
    this.taskStore.set(elementId, queueElement);
    if (!this.channel) {
      throw new Error(
        'RabbitMQ queue is not initialized. Ensure init() is awaited before enqueueing tasks.',
      );
    }
    const payload = Buffer.from(elementId, 'utf-8');
    this.channel?.sendToQueue(this.queueName, payload, {
      persistent: true,
      messageId: elementId,
      timestamp: Date.now(),
    });
    return elementId;
  }

  public dequeue(): QueueElement<T> {
    const pending = this.pendingMessages.shift();
    if (!pending) {
      return null;
    }
    const element = this.taskStore.get(pending.id);
    this.taskStore.delete(pending.id);
    if (pending.message) {
      this.channel?.ack(pending.message);
    }
    return element ?? null;
  }

  public remove(id: string): void {
    this.taskStore.delete(id);
  }

  public get size(): number {
    return this.taskStore.size;
  }

  public get isEmpty(): boolean {
    return this.taskStore.size === 0;
  }

  public clear(): void {
    this.taskStore.clear();
    this.pendingMessages.length = 0;
    if (this.channel) {
      void this.channel.purgeQueue(this.queueName);
    }
  }

  public contains(id: string): boolean {
    return this.taskStore.has(id);
  }

  public values(): QueueElement<T>[] {
    return Array.from(this.taskStore.values());
  }

  public onAvailable(callback: () => void): void {
    this.availabilityListener = callback;
  }
}
