export class SQSQueueUrlNotSetException extends Error {
  constructor() {
    super('SQS queue URL is required but was not provided.');
    this.name = 'SQSQueueUrlNotSetException';
  }
}

export class SQSRegionNotSetException extends Error {
  constructor() {
    super('SQS region is required but was not provided.');
    this.name = 'SQSRegionNotSetException';
  }
}

export class SQSQueueNotInitializedException extends Error {
  constructor() {
    super('SQS queue was not initialized. Call init() before using the queue.');
    this.name = 'SQSQueueNotInitializedException';
  }
}
