import chalk from 'chalk';

interface Colors {
  reset: (text: string) => string;
  red: (text: string) => string;
  yellow: (text: string) => string;
  blue: (text: string) => string;
  green: (text: string) => string;
}

interface LogMetadata {
  timestamp: string;
  pid: number;
  level: string;
  message: string;
  [key: string]: any;
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  constructor(
    private enabled: boolean = true,
    private logLevel: LogLevel = LogLevel.DEBUG,
  ) {
    chalk.level = 3;
  }

  private readonly colors: Colors = {
    reset: chalk.reset,
    red: chalk.red,
    yellow: chalk.yellow,
    blue: chalk.blue,
    green: chalk.green,
  };

  private getTimestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatLog(
    level: string,
    color: keyof Colors,
    message: any[],
    extraMetadata: object = {},
  ): string {
    const metadata: LogMetadata = {
      timestamp: this.getTimestamp(),
      pid: process.pid,
      level,
      message: message.join(' '),
      ...extraMetadata,
    };
    return `[${metadata.timestamp}] ${this.colors[color](`[${level}]`)} (${metadata.pid}) -- ${metadata.message}`;
  }

  private log(
    level: LogLevel,
    color: keyof Colors,
    label: string,
    ...args: any[]
  ): void {
    if (this.enabled && this.logLevel >= level) {
      console.log(this.formatLog(label, color, args));
    }
  }

  public error(...args: any[]): void {
    this.log(LogLevel.ERROR, 'red', 'ERROR', ...args);
  }

  public warn(...args: any[]): void {
    this.log(LogLevel.WARN, 'yellow', 'WARN', ...args);
  }

  public info(...args: any[]): void {
    this.log(LogLevel.INFO, 'green', 'INFO', ...args);
  }

  public debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, 'blue', 'DEBUG', ...args);
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const logger = new Logger(true, LogLevel.DEBUG);
