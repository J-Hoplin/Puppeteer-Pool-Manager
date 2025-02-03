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

// Manage State Metadata for each instance
const instanceStates = new WeakMap<any, ContextState>();

export function RequireState(requiredState: ContextState) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const currentState = instanceStates.get(this) || ContextState.IDLE;

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
        instanceStates.set(this, setState);
        const result = await originalMethod.apply(this, args);
        return result;
      } finally {
        instanceStates.set(this, ContextState.IDLE);
      }
    };

    return descriptor;
  };
}
