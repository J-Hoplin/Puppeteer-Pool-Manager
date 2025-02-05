import { StateValidationException } from '../error';
import 'reflect-metadata';

export enum ContextState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
}

/**
 * @RequireState
 *
 * Check if the current state is the same as the required state
 *
 * @SetState
 *
 * Set the current state to the required state
 */

const INSTANCE_STATE_KEY = Symbol('instanceState');

export function RequireState(requiredState: ContextState) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const currentState =
        Reflect.getMetadata(INSTANCE_STATE_KEY, this) || ContextState.IDLE;

      if (currentState !== requiredState) {
        throw new StateValidationException(
          `Method ${propertyKey} requires state ${requiredState}, but current state is ${currentState}`,
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export function SetState(setState: ContextState) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      try {
        Reflect.defineMetadata(INSTANCE_STATE_KEY, setState, this);
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        Reflect.defineMetadata(INSTANCE_STATE_KEY, ContextState.IDLE, this);
      }
    };

    return descriptor;
  };
}
