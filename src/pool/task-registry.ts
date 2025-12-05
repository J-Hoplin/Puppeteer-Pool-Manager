import {
  TaskHandlerAlreadyExistsException,
  TaskHandlerIdInvalidException,
  TaskHandlerNotEnrolledException,
} from '../error/task';
import { TaskHandler } from '../types';

type TaskRecord = {
  id: string;
  key: symbol;
  handler: TaskHandler;
};

export class TaskRegistry {
  private recordsByKey = new Map<symbol, TaskRecord>();
  private recordsById = new Map<string, TaskRecord>();

  public enroll(id: string, handler: TaskHandler): symbol {
    if (!id || typeof id !== 'string') {
      throw new TaskHandlerIdInvalidException();
    }
    if (this.recordsById.has(id)) {
      throw new TaskHandlerAlreadyExistsException(id);
    }
    if (typeof handler !== 'function') {
      throw new Error('Task handler must be a function.');
    }
    const key = Symbol(id);
    const record: TaskRecord = {
      id,
      key,
      handler,
    };
    this.recordsById.set(id, record);
    this.recordsByKey.set(key, record);
    return key;
  }

  public resolveByKey(key: symbol): TaskRecord {
    const record = this.recordsByKey.get(key);
    if (!record) {
      throw new TaskHandlerNotEnrolledException();
    }
    return record;
  }

  public resolveById(id: string): TaskRecord {
    const record = this.recordsById.get(id);
    if (!record) {
      throw new TaskHandlerNotEnrolledException(id);
    }
    return record;
  }
}

export const taskRegistry = new TaskRegistry();
