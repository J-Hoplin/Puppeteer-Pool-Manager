declare module '@aws-sdk/client-sqs' {
  export class SQSClient {
    constructor(config: { region: string });
    send<T = any>(command: any): Promise<T>;
    destroy(): void;
  }

  export class SendMessageCommand {
    constructor(input: Record<string, any>);
  }

  export class ReceiveMessageCommand {
    constructor(input: Record<string, any>);
  }

  export class DeleteMessageCommand {
    constructor(input: Record<string, any>);
  }
}
