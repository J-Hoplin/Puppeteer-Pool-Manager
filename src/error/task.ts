export class TaskHandlerIdInvalidException extends Error {
  constructor() {
    super('Task handler id must be a non-empty string.');
    this.name = 'TaskHandlerIdInvalidException';
  }
}

export class TaskHandlerAlreadyExistsException extends Error {
  constructor(id: string) {
    super(`Task handler with id "${id}" already exists.`);
    this.name = 'TaskHandlerAlreadyExistsException';
  }
}

export class TaskHandlerNotEnrolledException extends Error {
  constructor(id?: string) {
    super(
      id
        ? `Task handler with id "${id}" is not enrolled.`
        : 'Task handler is not enrolled.',
    );
    this.name = 'TaskHandlerNotEnrolledException';
  }
}
