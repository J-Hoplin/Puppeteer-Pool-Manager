import { lazyImportModule } from '../utils/module-loader';
import { IQueue, QueueElement } from './queue.interface';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

type ActiveMQClient = any;
type ActiveMQMessage = any;
type ActiveMQSubscription = { unsubscribe: () => void } | null;

type ActiveMQQueueOptions = {
  brokerUrl?: string;
  queueName?: string;
};

type PendingMessage = {
  id: string;
  message: ActiveMQMessage;
};

const DEFAULT_URL = 'stomp://guest:guest@localhost:61613';
const DEFAULT_QUEUE = '/queue/puppeteer_pool_tasks';

const generateId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
};

export class ActiveMQQueue<T> implements IQueue<T> {
  private client: ActiveMQClient;
  private subscription: ActiveMQSubscription;
  private readonly taskStore = new Map<string, QueueElement<T>>();
  private readonly pendingMessages: PendingMessage[] = [];
  private availabilityListener?: () => void;

  constructor(private readonly options: ActiveMQQueueOptions = {}) {}

  private get destination() {
    return (
      this.options.queueName ||
      process.env.PUPPETEER_POOL_ACTIVEMQ_QUEUE ||
      DEFAULT_QUEUE
    );
  }

  private get brokerUrl() {
    return (
      this.options.brokerUrl ||
      process.env.PUPPETEER_POOL_ACTIVEMQ_URL ||
      DEFAULT_URL
    );
  }

  private parseConnectionOptions(rawUrl: string) {
    const url = new URL(rawUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 61613),
      connectHeaders: {
        host: url.pathname === '/' ? '/' : url.pathname,
        login: decodeURIComponent(url.username || 'guest'),
        passcode: decodeURIComponent(url.password || 'guest'),
        'heart-beat': '5000,5000',
      },
    };
  }

  public async init() {
    if (this.client) {
      return;
    }
    const stompit = await lazyImportModule<any>('stompit');
    const options = this.parseConnectionOptions(this.brokerUrl);
    this.client = await new Promise((resolve, reject) => {
      stompit.connect(options, (error: Error, client: ActiveMQClient) => {
        if (error) {
          reject(error);
        } else {
          resolve(client);
        }
      });
    });
    this.subscription = this.client.subscribe(
      { destination: this.destination, ack: 'client-individual' },
      (error: Error, message: ActiveMQMessage) => {
        if (error) {
          return;
        }
        message.readString('utf-8', (err: Error, body: string) => {
          if (err) {
            if (typeof message.nack === 'function') {
              message.nack();
            }
            return;
          }
          const id = body.trim();
          this.pendingMessages.push({ id, message });
          this.availabilityListener?.();
        });
      },
    );
  }

  public async dispose() {
    if (this.subscription?.unsubscribe) {
      this.subscription.unsubscribe();
    }
    this.subscription = null;
    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client.disconnect(() => resolve());
      });
      this.client = null;
    }
    this.pendingMessages.length = 0;
    this.taskStore.clear();
  }

  public enqueue(param: { element: T; id?: string }): string {
    const elementId = param.id ?? generateId();
    const queueElement: QueueElement<T> = {
      id: elementId,
      element: param.element,
      enqueuedAt: new Date(),
    };
    this.taskStore.set(elementId, queueElement);
    if (!this.client) {
      throw new Error(
        'ActiveMQ queue is not initialized. Ensure init() is awaited before enqueueing tasks.',
      );
    }
    const frame = this.client?.send(
      { destination: this.destination, persistent: 'true' },
      { messageId: elementId },
    );
    frame?.write(elementId);
    frame?.end();
    return elementId;
  }

  public dequeue(): QueueElement<T> {
    const pending = this.pendingMessages.shift();
    if (!pending) {
      return null;
    }
    const element = this.taskStore.get(pending.id);
    this.taskStore.delete(pending.id);
    if (pending.message && typeof pending.message.ack === 'function') {
      pending.message.ack();
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
    this.pendingMessages.length = 0;
    this.taskStore.clear();
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
