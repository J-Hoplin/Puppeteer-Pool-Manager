import { ValidateBoolean, ValidateInteager, ValidateRange } from './validator';
import { poolLogger as logger } from 'src/logger';

import * as fs from 'fs';

/**
 * Default configs path of puppeteer
 *
 * Default is 'puppeteer-pool-configs.json' from project root path
 */
const defaultConfigPath = process.cwd() + '/puppeteer-pool-configs.json';

/**
 * Default Config
 *
 * This will be over written if user define own path
 */
const config = {
  browser_pool: {
    min: 2,
    max: 5,
  },
  session_pool: {
    min: 5,
    max: 10,
    width: 1080,
    height: 1024,
    ignoreResourceLoad: false,
    enablePageCache: false,
  },
  threshold: {
    activate: true,
    interval: 5,
    cpu: {
      break: 80,
      warn: 45,
    },
    memory: {
      break: 2048,
      warn: 800,
    },
  },
};

export type ConfigType = typeof config;
export const loadConfig = (configPath: string = null): ConfigType => {
  let loadedConfig = null;
  try {
    loadedConfig = JSON.parse(
      fs.readFileSync(configPath ?? defaultConfigPath, 'utf-8'),
    );
    logger.info('Config loaded successfully');
  } catch (err) {
    // If error while loading configs, use default configs
    logger.warn('Fail to load configs. Use default configs');
  }
  // Browser Pool Config
  if (loadedConfig?.browser_pool) {
    config.browser_pool.min =
      loadedConfig?.browser_pool?.min ?? config.browser_pool.min;
    config.browser_pool.max =
      loadedConfig?.browser_pool?.max ?? config.browser_pool.max;
    ValidateRange(
      config.browser_pool.min,
      config.browser_pool.max,
      1,
      'Browser Pool Config',
    );
  }
  // Session Pool Config
  if (loadedConfig?.session_pool) {
    config.session_pool.min =
      loadedConfig?.session_pool?.min ?? config.session_pool.min;
    config.session_pool.max =
      loadedConfig?.session_pool?.max ?? config.session_pool.max;
    ValidateRange(
      config.session_pool.min,
      config.session_pool.max,
      1,
      'Session Pool Config',
    );
    config.session_pool.width =
      loadedConfig?.session_pool?.width ?? config.session_pool.width;
    ValidateInteager(config.session_pool.width, 50, 'Width Config', 'Width');
    config.session_pool.height =
      loadedConfig?.session_pool?.height ?? config.session_pool.height;
    ValidateInteager(config.session_pool.height, 50, 'Height Config', 'Height');
    config.session_pool.ignoreResourceLoad =
      loadedConfig?.session_pool?.ignoreResourceLoad ??
      config.session_pool.ignoreResourceLoad;
    ValidateBoolean(
      config.session_pool.ignoreResourceLoad,
      'Ignore Resource Config',
    );
    config.session_pool.enablePageCache =
      loadedConfig?.session_pool?.enablePageCache ??
      config.session_pool.enablePageCache;
    ValidateBoolean(config.session_pool.enablePageCache, 'Page Cache Config');
  }
  // Threshold Config
  if (loadedConfig?.threshold) {
    config.threshold.activate =
      loadedConfig.threshold?.activate ?? config.threshold.activate;
    ValidateBoolean(
      config.threshold.activate,
      'Threshold Watcher Active Config',
    );
    // Threshold Interval
    config.threshold.interval =
      loadedConfig.threshold?.interval ?? config.threshold.interval;
    ValidateInteager(
      config.threshold.interval,
      1,
      'Threshold Config',
      'Interval',
    );
    // Threshold CPU configs
    if (loadedConfig.threshold?.cpu) {
      config.threshold.cpu.break =
        loadedConfig.threshold.cpu?.break ?? config.threshold.cpu.break;
      config.threshold.cpu.warn =
        loadedConfig.threshold.cpu?.warn ?? config.threshold.cpu.warn;
      ValidateRange(
        config.threshold.cpu.warn,
        config.threshold.cpu.break,
        1,
        'CPU Config',
        'Warn',
        'Break',
      );
    }
    // Threshold Memory configs
    if (loadedConfig.threshold?.memory) {
      config.threshold.memory.break =
        loadedConfig.threshold.memory?.break ?? config.threshold.memory.break;
      config.threshold.memory.warn =
        loadedConfig.threshold.memory?.warn ?? config.threshold.memory.warn;
      ValidateRange(
        config.threshold.memory.warn,
        config.threshold.memory.break,
        100,
        'Memory Config',
        'Warn',
        'Break',
      );
    }
  }

  return config;
};
