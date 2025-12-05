import {
  RabbitMQConnectionUrlNotSetException,
  RabbitMQQueueNameNotSetException,
  RabbitMQQueueNotInitializedException,
} from '../error/queue';
import { lazyImportModule } from '../utils/module-loader';
import { IQueue, QueueElement } from './queue.interface';
import { generateId } from './utils';

type AmqpConnection = any;
type AmqpChannel = any;
type AmqpMessage = any;

type RabbitMQQueueOptions = {
  url?: string;
  queueName?: string;
  prefetch?: number;
};

type PendingMessage<T> = {
  element: QueueElement<T>;
  message: AmqpMessage;
};

export class RabbitMQQueue<T> implements IQueue<T> {
  private connection: AmqpConnection;
  private channel: AmqpChannel;
  private consumerTag?: string;
  private readonly pendingMessages: PendingMessage<T>[] = [];
  private availabilityListener?: () => void;

  constructor(private readonly options: RabbitMQQueueOptions = {}) {}

  private get queueName() {
    const queueName =
      this.options.queueName || process.env.PUPPETEER_POOL_RABBITMQ_QUEUE;
    if (!queueName) {
      throw new RabbitMQQueueNameNotSetException();
    }
    return queueName;
  }

  private get connectionUrl() {
    const connectionUrl =
      this.options.url || process.env.PUPPETEER_POOL_RABBITMQ_URL;
    if (!connectionUrl) {
      throw new RabbitMQConnectionUrlNotSetException();
    }
    return connectionUrl;
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
        try {
          const parsed = JSON.parse(
            message.content.toString(),
          ) as QueueElement<T> & {
            enqueuedAt: string;
          };
          const element: QueueElement<T> = {
            id: parsed.id,
            element: parsed.element,
            enqueuedAt: new Date(parsed.enqueuedAt),
          };
          this.pendingMessages.push({ element, message });
          this.availabilityListener?.();
        } catch {
          this.channel?.nack(message, false, false);
        }
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
    this.pendingMessages.length = 0;
  }

  public enqueue(param: { element: T; id?: string }): string {
    const elementId = param.id ?? generateId();
    const queueElement: QueueElement<T> = {
      id: elementId,
      element: param.element,
      enqueuedAt: new Date(),
    };
    if (!this.channel) {
      throw new RabbitMQQueueNotInitializedException();
    }
    const payload = Buffer.from(JSON.stringify(queueElement), 'utf-8');
    this.channel.sendToQueue(this.queueName, payload, {
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
    if (pending.message) {
      this.channel?.ack(pending.message);
    }
    return pending.element;
  }

  public remove(id: string): void {
    const index = this.pendingMessages.findIndex(
      (pending) => pending.element.id === id,
    );
    if (index >= 0) {
      this.pendingMessages.splice(index, 1);
    }
  }

  public get size(): number {
    return this.pendingMessages.length;
  }

  public get isEmpty(): boolean {
    return this.pendingMessages.length === 0;
  }

  public clear(): void {
    this.pendingMessages.length = 0;
    if (this.channel) {
      void this.channel.purgeQueue(this.queueName);
    }
  }

  public contains(id: string): boolean {
    return this.pendingMessages.some((pending) => pending.element.id === id);
  }

  public values(): QueueElement<T>[] {
    return this.pendingMessages.map((pending) => pending.element);
  }

  public onAvailable(callback: () => void): void {
    this.availabilityListener = callback;
  }
}
