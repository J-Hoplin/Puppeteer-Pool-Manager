import { QueueProvider } from '../pool/enum';
import { Logger } from 'src/logger';

const logger = new Logger();

export function resolveQueueProvider(value?: string): QueueProvider {
  const normalized = value?.toUpperCase();
  logger.info(`Resolving queue provider: ${normalized}`);
  switch (normalized) {
    case QueueProvider.RABBITMQ:
      return QueueProvider.RABBITMQ;
    case QueueProvider.SQS:
      return QueueProvider.SQS;
    case QueueProvider.MEMORY:
      return QueueProvider.MEMORY;
    default:
      return QueueProvider.MEMORY;
  }
}

export function envQueueProvider(): QueueProvider {
  return resolveQueueProvider(process.env.PUPPETEER_POOL_QUEUE_PROVIDER);
}
