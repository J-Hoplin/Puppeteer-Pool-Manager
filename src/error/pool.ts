export class PoolNotInitializedException extends Error {
  constructor() {
    super('init() must be called before dispatching task');
    this.name = 'PoolNotInitializedException';
  }
}
