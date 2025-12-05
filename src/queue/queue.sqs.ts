import {
  SQSQueueNotInitializedException,
  SQSQueueUrlNotSetException,
  SQSRegionNotSetException,
} from '../error/queue';
import { lazyImportModule } from '../utils/module-loader';
import { IQueue, QueueElement } from './queue.interface';
import { generateId } from './utils';

type SqsModule = typeof import('@aws-sdk/client-sqs');

type PendingMessage<T> = {
  element: QueueElement<T>;
  receiptHandle?: string;
};

type SQSQueueOptions = {
  queueUrl?: string;
  region?: string;
  waitTimeSeconds?: number;
  maxMessages?: number;
  visibilityTimeout?: number;
  pollIntervalMs?: number;
};

export class SQSQueue<T> implements IQueue<T> {
  private client: any;
  private sqsModule: SqsModule | null = null;
  private polling = false;
  private pollPromise: Promise<void> | null = null;
  private readonly pendingMessages: PendingMessage<T>[] = [];
  private availabilityListener?: () => void;

  constructor(private readonly options: SQSQueueOptions = {}) {}

  private get queueUrl() {
    const queueUrl =
      this.options.queueUrl || process.env.PUPPETEER_POOL_SQS_QUEUE_URL;
    if (!queueUrl) {
      throw new SQSQueueUrlNotSetException();
    }
    return queueUrl;
  }

  private get region() {
    const region =
      this.options.region ||
      process.env.PUPPETEER_POOL_SQS_REGION ||
      process.env.AWS_REGION;
    if (!region) {
      throw new SQSRegionNotSetException();
    }
    return region;
  }

  public async init() {
    if (this.client) {
      return;
    }
    this.sqsModule = await lazyImportModule<SqsModule>('@aws-sdk/client-sqs');
    this.client = new this.sqsModule.SQSClient({ region: this.region });
    this.startPolling();
  }

  private startPolling() {
    if (this.polling) {
      return;
    }
    this.polling = true;
    this.pollPromise = this.pollLoop();
  }

  private async pollLoop() {
    while (this.polling) {
      const sqsModule = this.sqsModule;
      const client = this.client;
      if (!sqsModule || !client) {
        break;
      }
      try {
        const receiveCommand = new sqsModule.ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: this.options.maxMessages ?? 5,
          WaitTimeSeconds: this.options.waitTimeSeconds ?? 10,
          VisibilityTimeout: this.options.visibilityTimeout,
          MessageAttributeNames: ['All'],
        });
        const response = await client.send(receiveCommand);
        if (response?.Messages?.length) {
          for (const message of response.Messages) {
            if (!message.Body) {
              continue;
            }
            try {
              const parsed = JSON.parse(message.Body) as QueueElement<T> & {
                enqueuedAt: string;
              };
              this.pendingMessages.push({
                element: {
                  id: parsed.id,
                  element: parsed.element,
                  enqueuedAt: new Date(parsed.enqueuedAt),
                },
                receiptHandle: message.ReceiptHandle,
              });
            } catch {
              // Ignore malformed messages
            }
          }
          this.availabilityListener?.();
        }
      } catch {
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.pollIntervalMs ?? 1000),
        );
      }
    }
  }

  public async dispose() {
    this.polling = false;
    if (this.pollPromise) {
      await this.pollPromise.catch(() => undefined);
      this.pollPromise = null;
    }
    this.pendingMessages.length = 0;
    if (this.client) {
      this.client.destroy();
      this.client = null;
    }
    this.sqsModule = null;
  }

  public enqueue(param: { element: T; id?: string }): string {
    const elementId = param.id ?? generateId();
    const queueElement: QueueElement<T> = {
      id: elementId,
      element: param.element,
      enqueuedAt: new Date(),
    };
    const sqsModule = this.sqsModule;
    const client = this.client;
    if (!client || !sqsModule) {
      throw new SQSQueueNotInitializedException();
    }
    const command = new sqsModule.SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(queueElement),
    });
    void client.send(command).catch(() => undefined);
    return elementId;
  }

  public dequeue(): QueueElement<T> {
    const pending = this.pendingMessages.shift();
    if (!pending) {
      return null;
    }
    const sqsModule = this.sqsModule;
    const client = this.client;
    if (pending.receiptHandle && client && sqsModule) {
      const deleteCommand = new sqsModule.DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: pending.receiptHandle,
      });
      void client.send(deleteCommand);
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
