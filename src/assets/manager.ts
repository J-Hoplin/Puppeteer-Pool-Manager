import { loadConfig, ConfigType } from '../configs';
import { PuppeteerLaunchOptions } from 'puppeteer';
import genericPool, { Pool } from 'generic-pool';

/**
 * State of the Pool Manager
 */
enum SessionPoolManagerState {
  LIVE = 'LIVE',
  PENDING = 'PENDING',
  DOWN = 'DOWN',
}

/**
 * Puppeteer Pool Manager class
 */

class PuppeteerPoolManager {
  // Launch Options
  private launchOptions: PuppeteerLaunchOptions = {};

  // Pool Instance
  private pool: Pool<any> = null;

  // Pool Manager Config Type
  private config: ConfigType;

  // Auto-Incremenet PoolID
  private poolId: number = 1;

  /**
   *
   * @param options
   * Puppeteer Options
   *
   * @param configPath
   * Path of configs. Use default setting defined in src/configs.ts if path is not defined and error while parsing.
   */
  constructor(
    private readonly options: PuppeteerLaunchOptions,
    private readonly configPath?: string,
  ) {
    this.launchOptions = options;
    this.config = loadConfig(configPath);
  }

  private nextPoolId(): number {
    return ++this.poolId;
  }

  private boot() {
    this.pool = genericPool.createPool(
      {
        create: async () => {
          const poolId = this.nextPoolId();
        },
        destroy: async () => {},
      },
      {
        max: this.config.browser_pool.max,
        min: this.config.browser_pool.min,
      },
    );
  }
}
