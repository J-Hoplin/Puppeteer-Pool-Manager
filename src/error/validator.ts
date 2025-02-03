export class ManagerConfigValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ManagerConfigValidationException';
  }
}
