/**
 * Enumeration for Task Dispatcher init
 *
 * SHARED: All request will share cookies and local storage
 * ISOLATED: All request will have their own cookies and local storage (Browser Context)
 */

export enum ContextMode {
  SHARED = 'SHARED',
  ISOLATED = 'ISOLATED',
}

/**
 * Enumeration for Task Dispatcher Event Tags
 *
 * RUNNING: Task is running
 * PENDING: Task is pending
 * DONE: Task is done
 */
export enum EventTags {
  RUNNING = 'RUNNING',
  PENDING = 'PENDING',
  DONE = 'DONE',
}

/**
 * Enumeration for Task Queue Types
 *
 * DEFAULT: Default queue type
 * PRIORITY: Priority queue type
 */
export enum QueueMode {
  DEFAULT = 'DEFAULT',
  PRIORITY = 'PRIORITY',
}
