# Puppeteer Pool Manager

![NPM Version](https://img.shields.io/npm/v/%40hoplin%2Fpuppeteer-pool?style=for-the-badge)

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

## Release 2.0.8(and it's sub versions)

- `PuppeteerPool.start` required parameter as config type

  ```typescript
  type PuppeteerPoolStartOptions = {
    /**
     * Number of concurrency,
     * Default is 3
     */
    concurrencyLevel: number;
    /**
     * Context mode
     * Default is ContextMode.SHARED
     */
    contextMode: ContextMode;
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

- Remove pino logger dependency and implement custom logger
  - You can config `log level` and `enable log` in `PuppeteerPool.start` function
- Enhanced Concurrency Control

## Next Features in 2.0.9

- Detailed Metrics Monitoring
  - Monitor metrics by context
- Support to use Playwright instead of Puppeteer

## Fully changed from 2.0.0

The internal implementation is event-based, which significantly improves the stability. In addition, instead of relying
on generic-pools to manage the pool, we have solved the problem of third-party dependency and features that were
incompatible with generic-pools through our own pooling. However, there are many API changes and some features are
currently disabled. If you update to 2.0.0, please be aware of the migration progress and disabled features for the
changes.
Also cluster mode client will be provided in near future.

### API Changes

From version 2.0.0, client API will return dispatcher instance after initialization.
After that you can use dispatcher to control pool manager.

**[ Client API ]**

- PuppeteePool
  - `PuppeteerPool` is singleton class. You can use `PuppeteerPool.start` to initialize pool manager.
- PuppeteerPool.start

  - Static Method
  - Description: Initialize pool manager. You need to call this function to start puppeteer pool. Even if you invoke
    this function multiple times with differenct arguments, it will return the first initialized instance.
  - Args: `PuppeteerPoolStartOptions`

    ```typescript
    type PuppeteerPoolStartOptions = {
      /**
       * Number of concurrency,
       * Default is 3
       */
      concurrencyLevel: number;
      /**
       * Context mode
       * Default is ContextMode.SHARED
       */
      contextMode: ContextMode;
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

- Instance<PuppeteerPool>.stop
  - Description: Stop pool manager. It will close all sessions and terminate pool manager.
  - Return
    - `Promise<void>`
- Instance<PuppeteerPool>.runTask
  - Description: Run task in pool manager. It will return result of task.
  - Args
    - task
      - Required
      - Function
  - Return
    - `Promise<any>`
    - Returns result of task(Same return type with task callback return type)
- Instance<PuppeteerPool>.getPoolMetrics
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
import { ContextMode, PuppeteerPool } from '@hoplin/puppeteer-pool';

async function main() {
  const poolInstance = await PuppeteerPool.start({
    concurrencyLevel: 2,
    contextMode: ContextMode.ISOLATED,
  });

  const urls = [
    'https://www.google.com',
    'https://www.bing.com',
    'https://github.com',
  ];

  console.log(await poolInstance.getPoolMetrics());

  const promises = urls.map((url) =>
    poolInstance.runTask(async (page) => {
      await page.goto(url);
      return await page.title();
    }),
  );

  const titles = await Promise.all(promises);
  titles.forEach((title) => console.log(title));
}

main();
```

## Support

- Pool Managing
- Config
  - Support config customize
- Threshold Watcher
  - CPU
  - Memory
  - Support safe pool instance reset in runtime
- Metrics
  - Support Metric by pool
    - CPU usage of pool
    - Memory usage of pool
    - Managing session count in runtime

## Puppeteer Pool Manager Config

Default config should be `puppeteer-pool-config.json` in root directory path.

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
    "cpu": 80,
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
- `interval`: Interval of threshold watcher
- `cpu`: CPU threshold value
- `memory`: Memory threshold value
  - **Inteager Validation**
    - `interval` should be at least 1
    - `interval` should be integer
    - `cpu` should be at least 1
    - `cpu` should be integer
    - `memory` should be at least 1
    - `memory` should be integer
