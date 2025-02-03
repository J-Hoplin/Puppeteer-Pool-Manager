# Puppeteer Pool Manager

![NPM Version](https://img.shields.io/npm/v/%40hoplin%2Fpuppeteer-pool?style=for-the-badge)

## Install packages

- `npm`

  ```
  npm i @hoplin/puppeteer-pool
  ```

- `yarn`

  ```
  yarn add @hoplin/puppeteer-pool
  ```

- `pnpm`
  ```
  pnpm install @hoplin/puppeteer-pool
  ```

## Fully changed from 2.0.0

The internal implementation is event-based, which significantly improves the stability. In addition, instead of relying on generic-pools to manage the pool, we have solved the problem of third-party dependency and features that were incompatible with generic-pools through our own pooling. However, there are many API changes and some features are currently disabled. If you update to 2.0.0, please be aware of the migration progress and disabled features for the changes.
Also cluster mode client will be provided in near future.

### API Changes

From version 2.0.0, client API will return dispatcher instance after initialization.
After that you can use dispatcher to control pool manager.

**[ Client API ]**

- StartPuppeteerPool

  - Args
    - concurrencyLevel: number
      - Number of context level to run tasks concurrently.
    - contextMode: ContextMode
      - ContextMode.SHARED(Default): Each session will share local storage, cookies, etc.
      - ContextMode.ISOLATED: Each session will have its own local storage, cookies, etc.
    - options: [Puppeteer LaunchOptions](https://pptr.dev/api/puppeteer.launchoptions)
    - customConfigPath: string
      - Optional. If you want to use custom config file, you can pass path to config file.
  - Returns
    - dispatcher: TaskDispatcher
      - Dispatcher instance to control pool manager.

- StopPuppeteerPool
  - Args
    - dispatcher: TaskDispatcher
      - Dispatcher instance returned from StartPuppeteerPool

**[ TaskDispatcher API ]**

- dispatchTask<T>

  - Args
    - task: RequestedTask<T>
  - Returns
    ```typescript
    {
      event: EventEmitter,
      resultListener: Promise<unknown>
    }
    ```
    - event: Check given task's state. You can listen to two event(Node.js Event) task state
      - RUNNING: Emits when task is running
      - DONE: Emits when task is done
    - resultListener: Promise Object for result. resultListener is not callable. You should just await Promise to be resolve.(Same as when 'DONE' event emits)

- getPoolMetrics
  - Returns
    ```typescript
    {
      memoryUsageValue: number, // Memory Usage
      memoryUsagePercentage: number, // Memory usage percentage
      cpuUsage: number, // CPU Usage Percentage
    };
    ```

## Support

- Pool Managing
  - Puppeteer Level Pooling
  - Session Level Pooling
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

If config file are not given or invalid path, manager will use default defined configurations. Or if you want to pass config path, you can pass path to `bootPoolManager` function as parameter.

```typescript
{
  session_pool: {
    width: 1080,
    height: 1024,
  },
  threshold: {
    activate: true,
    interval: 5,
    cpu: 80,
    memory: 2048,
  },
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
