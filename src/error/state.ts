export class StateValidationException extends Error {
  constructor(message: string) {
    super(`${message}`);
    this.name = 'StateValidationException';
  }
}
