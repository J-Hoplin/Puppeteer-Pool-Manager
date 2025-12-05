export class RabbitMQConnectionUrlNotSetException extends Error {
  constructor() {
    super('RabbitMQ connection requires a URL but none was provided.');
    this.name = 'RabbitMQConnectionUrlNotSetException';
  }
}

export class RabbitMQQueueNameNotSetException extends Error {
  constructor() {
    super('RabbitMQ connection requires a queue name but none was provided.');
    this.name = 'RabbitMQQueueNameNotSetException';
  }
}

export class RabbitMQQueueNotInitializedException extends Error {
  constructor() {
    super(
      'RabbitMQ queue was not initialized. Call init() before using the queue.',
    );
    this.name = 'RabbitMQQueueNotInitializedException';
  }
}
