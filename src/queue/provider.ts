import { QueueProvider } from '../pool/enum';

const ENV_KEY = 'PUPPETEER_POOL_QUEUE_PROVIDER';

export function resolveQueueProvider(value?: string): QueueProvider {
  const normalized = value?.toUpperCase();
  switch (normalized) {
    case QueueProvider.RABBITMQ:
      return QueueProvider.RABBITMQ;
    case QueueProvider.ACTIVEMQ:
      return QueueProvider.ACTIVEMQ;
    case QueueProvider.MEMORY:
      return QueueProvider.MEMORY;
    default:
      return QueueProvider.MEMORY;
  }
}

export function envQueueProvider(): QueueProvider {
  return resolveQueueProvider(process.env[ENV_KEY]);
}
