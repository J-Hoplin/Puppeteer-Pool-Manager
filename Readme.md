# Puppeteer Pool Manager

![NPM Version](https://img.shields.io/npm/v/%40hoplin%2Fpuppeteer-pool?style=for-the-badge)

### Puppeteer Pool Manager

<div style="display: flex; align-items: center;">
  <div style="flex: 1;">

Puppeteer-Pool is a lightweight and efficient library for managing multiple Puppeteer contexts with ease. Designed for scalable web scraping and automation, it helps you handle concurrency and resource management without the hassle.

  </div>
  <div>
    <img src="./diagram/puppeteer-pool.png" width="200">
  </div>
</div>

## Package Installation

- `npm`

  ```
  npm i puppeteer @hoplin/puppeteer-pool
  ```

- `yarn`

  ```
  yarn add puppeteer @hoplin/puppeteer-pool
  ```

- `pnpm`
  ```
  pnpm install puppeteer @hoplin/puppeteer-pool
  ```

## Highlights

- **Per-request tab lifecycle** – every task opens a fresh page, clears it, and closes it, which keeps renderer memory predictable even on small hosts.
- **Handler registry API** – register once with `PuppeteerPool.enrollTask(id, handler)` and enqueue typed payloads anywhere in your app. Queue payloads contain only `{ handlerId, payload }`, so RabbitMQ/SQS can drive the pool safely across restarts.
- **Pluggable queue providers** – pick between `MEMORY`, `RABBITMQ`, or `SQS` via `queueProvider` or the matching environment variable. Priority mode is kept for the in-memory queue.
- **Static singleton client** – all public APIs are static (`start`, `stop`, `runTask`, `getPoolMetrics`), simplifying integration in workers, daemons, or HTTP handlers.

**[ Client API ]**

- PuppeteePool
  - `PuppeteerPool` is singleton class. You can use `PuppeteerPool.start` to initialize pool manager.
- PuppeteerPool.start

  - Static Method
  - Description: Initialize pool manager. You need to call this function to start puppeteer pool. Even if you invoke
    this function multiple times with differenct arguments, it will return the first initialized instance.
  - Args: `PuppeteerPoolStartOptions`
  - Defaults:

    - `concurrencyLevel`: 3
    - `taskQueueType`: `QueueMode.DEFAULT`
    - `queueProvider`: `process.env.PUPPETEER_POOL_QUEUE_PROVIDER` or `QueueProvider.MEMORY`
    - `contextMode`: `ContextMode.SHARED`
    - `enableLog`: `true`, `logLevel`: `LogLevel.DEBUG`

    ```typescript
    type PuppeteerPoolStartOptions = {
      /**
       * Number of concurrency
       * Default is 3
       */
      concurrencyLevel?: number;
      /**
       * Task queue type (DEFAULT | PRIORITY)
       * Default is QueueMode.DEFAULT
       */
      taskQueueType?: QueueMode;
      /**
       * Queue provider (MEMORY | RABBITMQ | SQS)
       * Default is envQueueProvider() or MEMORY
       */
      queueProvider?: QueueProvider;
      /**
       * Context mode
       * Default is ContextMode.SHARED
       */
      contextMode?: ContextMode;
      /**
       * Puppeteer launch options
       * Default is {}
       */
      options?: puppeteer.LaunchOptions;
      /**
       * Custom config path
       */
      customConfigPath?: string;
      /**
       * Enable log
       * Default is true
       */
      enableLog?: boolean;
      /**
       * Log level
       * Default is LogLevel.DEBUG
       */
      logLevel?: LogLevel;
    };
    ```

  - Return
    - `Promise<PuppeteerPool>`
    - Returns PuppeteerPool Instance.

- PuppeteerPool.restart

  - Static Method
  - Description: Stop the running dispatcher, tear down active contexts, and start a fresh pool. When `options` are omitted it reuses the last `start()` call, which makes threshold-triggered resets or config reloads simple.
  - Args: `PuppeteerPoolStartOptions`
  - Return
    - `Promise<PuppeteerPool>`

- PuppeteerPool.stop
  - Static Method
  - Description: Stop pool manager. It will close all sessions and terminate pool manager.
  - Return
    - `Promise<void>`
- PuppeteerPool.enrollTask
  - Static Method
  - Description: Register a page handler with a unique string id. It returns a `symbol` token you can use when enqueuing tasks.
  - Args
    - `id`: string identifier persisted inside queue payloads
    - `handler`: `(page, payload) => Promise<any>` function
  - Return: `symbol`
- PuppeteerPool.runTask
  - Static Method
  - Description: Enqueue payload for a previously enrolled handler. The handler runs once a page slot is available.
  - Args
    - `taskKey`: symbol returned by `enrollTask`
    - `payload`: serializable object passed to the handler
    - `priority`: optional number (effective only when `queueProvider` is MEMORY and `taskQueueType` is PRIORITY)
  - Return
  - `Promise<any>`
  - Returns result of task(Same return type with task callback return type)
- PuppeteerPool.getPoolMetrics
  - Static Method
  - Description: Get pool metrics. It will return metrics of pool manager.
  - Return
    ```json
        {
            memoryUsageValue: (Memory Usage in MegaBytes),
            memoryUsagePercentage: (Memory Usage with percentage),
            cpuUsage: (CPU Usage with percentage)
        }
    ```

## Simple Demo

```typescript
import { ContextMode, PuppeteerPool, QueueMode } from '@hoplin/puppeteer-pool';

const visitTaskID = PuppeteerPool.enrollTask(
  'visit-url',
  async (page, payload: { url: string }) => {
    await page.goto(payload.url);
    return page.title();
  },
);

async function main() {
  await PuppeteerPool.start({
    concurrencyLevel: 6,
    contextMode: ContextMode.ISOLATED,
    customConfigPath: `./puppeteer-pool-configs.json`,
    taskQueueType: QueueMode.PRIORITY,
  });

  const baseUrls = [
    'https://www.google.com',
    'https://www.bing.com',
    'https://github.com',
    'https://www.naver.com',
    'https://www.daum.net',
    'https://www.youtube.com',
    'https://www.amazon.com',
    'https://www.netflix.com',
  ];

  const urls = Array.from({ length: 50 }, (_, index) => {
    const baseUrl = baseUrls[index % baseUrls.length];
    const priority = Math.floor(Math.random() * 10) + 1;
    return { url: baseUrl, priority: priority };
  });

  const promises = urls.map(({ url, priority }) => {
    console.log(`Enqueue task: ${url}`);
    return PuppeteerPool.runTask(visitTaskID, { url }, priority);
  });

  const titles = await Promise.all(promises);
  console.log('[ Result length ] :', titles.length);
  console.log('[ Expected Tasks ] :', urls.length);
  console.log('[ Metrics ] :', await PuppeteerPool.getPoolMetrics());
}

main();
```

## Support

- Pool Managing
- Config
  - Support config customize
- Threshold Watcher
  - Memory
  - Support safe pool instance reset in runtime
- Metrics
  - Support Metric by pool
    - CPU usage of pool
    - Memory usage of pool
    - Managing session count in runtime

### Queue Provider Strategy

- Configure `PUPPETEER_POOL_QUEUE_PROVIDER` (`MEMORY`, `RABBITMQ`, or `SQS`) or set `queueProvider` in `PuppeteerPool.start`.
- RabbitMQ provider
  - Install `amqplib` only when you enable this provider.
  - Provide `PUPPETEER_POOL_RABBITMQ_URL` and `PUPPETEER_POOL_RABBITMQ_QUEUE` environment variables.
- SQS provider
  - Install `@aws-sdk/client-sqs` only when you enable this provider.
  - Provide `PUPPETEER_POOL_SQS_QUEUE_URL` and either `PUPPETEER_POOL_SQS_REGION` or `AWS_REGION` for the client.
- Priority queue mode is only available when `queueProvider` is `MEMORY`.

#### MEMORY

- Uses the in-process `Queue` or `PriorityQueue` implementations from `src/queue`.
- `runTask` enqueues and immediately tries to dispatch if a context slot is free, so it is the lowest-latency option for single-host workers.
- Priority ordering is honored only when `taskQueueType` is set to `QueueMode.PRIORITY`.

#### RABBITMQ

- `runTask` publishes serialized `TaskMessage` objects to the configured queue. A long-lived consumer drains the queue and hands work to the dispatcher.
- Messages are acknowledged only after the handler completes, allowing RabbitMQ to redeliver work if the worker process crashes before finishing.
- Prefetch, durability, or other channel-level tuning can be layered on top of this default behavior.

#### SQS

- Uses `@aws-sdk/client-sqs` with long polling (`ReceiveMessageCommand`) to fetch batches from the queue specified by `PUPPETEER_POOL_SQS_QUEUE_URL`.
- After a task succeeds the worker issues `DeleteMessageCommand`; failed handlers rely on the queue visibility timeout for retries.
- Regional configuration is resolved from `PUPPETEER_POOL_SQS_REGION` (or `AWS_REGION`) so you can run the pool in multiple AWS regions.

## Environment Variables

| Variable                                   | Description                                                                  | Default                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------- |
| `PUPPETEER_POOL_QUEUE_PROVIDER`            | Selects queue backend: `MEMORY`, `RABBITMQ`, or `SQS`.                       | `MEMORY`                     |
| `PUPPETEER_POOL_RABBITMQ_URL`              | RabbitMQ connection URI, e.g. `amqp://user:pass@host/vhost`.                 | required when using RabbitMQ |
| `PUPPETEER_POOL_RABBITMQ_QUEUE`            | Queue name for RabbitMQ tasks.                                               | required when using RabbitMQ |
| `PUPPETEER_POOL_SQS_QUEUE_URL`             | Full SQS queue URL.                                                          | required when using SQS      |
| `PUPPETEER_POOL_SQS_REGION` / `AWS_REGION` | AWS region for the SQS client. `PUPPETEER_POOL_SQS_REGION` takes precedence. | required when using SQS      |

If you need more control (prefetch counts, SQS wait time, etc.), pass provider-specific options directly to `PuppeteerPool.start`.

## Architecture Overview

```text
┌────────────────────┐           ┌────────────────────────┐
│ User Application   │           │     Puppeteer Pool     │
│  (enroll/run)      │──────────▶│ Registry saves handler │
└────────┬───────────┘           │ + payload metadata     │
         │                       └─────────┬──────────────┘
         │3. TaskMessage enqueued          │
         ▼                                 ▼
┌────────────────────┐           ┌────────────────────────┐
│ Queue Provider     │◀─────────│ Task Dispatcher        │
│ (Memory/RMQ/SQS)   │           │ (drains queue)         │
└────────┬───────────┘           └─────────┬──────────────┘
         │                                 │
         │4. Assign handler+payload        │
         ▼                                 ▼
┌────────────────────┐           ┌────────────────────────┐
│ Shared/Isolated    │◀────────▶│ Context Slot (per tab) │
│ Browser Context    │           │                        │
└────────┬───────────┘           └─────────┬──────────────┘
         │                                 │
         │5. Page task executes            │6. Metrics monitor
         ▼                                 ▼
┌────────────────────┐           ┌────────────────────────┐
│ Target Website     │           │ Metrics Watcher        │
└────────────────────┘           └────────────────────────┘
```

## Puppeteer Pool Manager Config

Default config should be `puppeteer-pool-configs.json` in root directory path.

### Default config setting

If config file are not given or invalid path, manager will use default defined configurations. Or if you want to pass
config path, you can pass path to `start()` function as parameter.

```json
{
  "session_pool": {
    "width": 1080,
    "height": 1024
  },
  "context": {
    "timeout": 10
  },
  "threshold": {
    "activate": true,
    "interval": 5,
    "memory": 2048
  }
}
```

### `session_pool`

- `width`: Width of session pool
- `height`: Height of session pool
  - **Inteager Validation**
    - `width` should be larger or equal than 50
    - `height` should be larger or equal than 50
    - `width` should be integer
    - `height` should be integer

### `context`

- `timeout`: Timeout of context.
  - **Inteager Validation**
    - `timeout` should be at least 1
    - `timeout` should be integer

### `threshold`

- `activate`: Activate threshold watcher
  - `interval`: Interval of threshold watcher (seconds)
  - `memory`: Memory threshold value (MB)
  - **Inteager Validation**
    - `interval` should be at least 3
    - `interval` should be integer
    - `memory` should be at least 500
    - `memory` should be integer
