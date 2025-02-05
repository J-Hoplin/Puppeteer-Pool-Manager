import { ValidateBoolean, ValidateInteager } from './validator';

import { poolLogger } from '../logger';
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
export const app_config = {
  session_pool: {
    width: 1080,
    height: 1024,
  },
  context: {
    timeout: 10,
  },
  threshold: {
    activate: true,
    interval: 5,
    cpu: 80,
    memory: 2048,
  },
};

export type ConfigType = typeof app_config;
export const loadConfig = (configPath: string = null): ConfigType => {
  let loadedConfig = null;
  try {
    loadedConfig = JSON.parse(
      fs.readFileSync(configPath ?? defaultConfigPath, 'utf-8'),
    );
    poolLogger.info('Config loaded successfully');
  } catch {
    // If error while loading configs, use default configs
    poolLogger.warn('Fail to load configs. Use default configs');
    return app_config;
  }
  // Session Pool Config
  if (loadedConfig?.session_pool) {
    app_config.session_pool.width =
      loadedConfig?.session_pool?.width ?? app_config.session_pool.width;
    ValidateInteager(
      app_config.session_pool.width,
      50,
      'Width Config',
      'Width',
    );
    app_config.session_pool.height =
      loadedConfig?.session_pool?.height ?? app_config.session_pool.height;
    ValidateInteager(
      app_config.session_pool.height,
      50,
      'Height Config',
      'Height',
    );
  }
  // Context Config
  if (loadedConfig?.context) {
    app_config.context.timeout =
      loadedConfig.context?.timeout ?? app_config.context.timeout;
    ValidateInteager(
      app_config.context.timeout,
      1,
      'Context Config',
      'Timeout',
    );
  }
  // Threshold Config
  if (loadedConfig?.threshold) {
    app_config.threshold.activate =
      loadedConfig.threshold?.activate ?? app_config.threshold.activate;
    ValidateBoolean(
      app_config.threshold.activate,
      'Threshold Watcher Active Config',
    );
    // Threshold Interval
    app_config.threshold.interval =
      loadedConfig.threshold?.interval ?? app_config.threshold.interval;
    ValidateInteager(
      app_config.threshold.interval,
      3,
      'Threshold Config',
      'Interval',
    );
    // Threshold CPU configs
    if (loadedConfig.threshold?.cpu) {
      app_config.threshold.cpu =
        loadedConfig.threshold.cpu ?? app_config.threshold.cpu;
      ValidateInteager(app_config.threshold.cpu, 1, 'CPU Config', 'CPU');
    }
    // Threshold Memory configs
    if (loadedConfig.threshold?.memory) {
      app_config.threshold.memory =
        loadedConfig.threshold.memory ?? app_config.threshold.memory;
      ValidateInteager(
        app_config.threshold.memory,
        500,
        'Memory Config',
        'Memory',
      );
    }
  }

  return app_config;
};
