# Queue Providers

This directory contains the queue implementations responsible for buffering `TaskMessage` objects before the dispatcher executes them. All providers share the same contract (`IQueue<T>`) but behave differently depending on the chosen backend.

## Memory Queue

- Uses the in-process `Queue` or `PriorityQueue` classes.
- `PuppeteerPool.runTask` enqueues the payload and immediately triggers execution if an idle context is available.
- Priority ordering is only supported in this provider via `taskQueueType: QueueMode.PRIORITY`.

## RabbitMQ Queue

- `runTask` publishes the serialized `TaskMessage` to the configured RabbitMQ queue (`PUPPETEER_POOL_RABBITMQ_URL`/`QUEUE`).
- `channel.consume` receives messages asynchronously, converts them back to `QueueElement`, and pushes them into the pool’s pending buffer while signalling availability.
- Messages are acknowledged (`ack`) only after the handler finishes, so retries are handled by RabbitMQ if the worker dies before acking.

## SQS Queue

- `runTask` sends messages via `@aws-sdk/client-sqs` to the queue defined by `PUPPETEER_POOL_SQS_QUEUE_URL` and region env vars.
- A long-poll loop (`ReceiveMessageCommand`) fetches messages in batches, buffers them, and wakes the dispatcher when new work arrives.
- After successful execution the worker issues `DeleteMessageCommand`, allowing failed tasks to reappear once the visibility timeout expires.
