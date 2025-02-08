interface Colors {
  reset: string;
  red: string;
  yellow: string;
  blue: string;
  green: string;
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
  ) {}

  private readonly colors: Colors = {
    // Should reset ANSI color after using color: https://gist.github.com/pinksynth/209937bd424edb2bd21f7c8bf756befd
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    green: '\x1b[32m',
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
    return `[${metadata.timestamp}] ${this.colors[color]}[${level}]${this.colors.reset} (${metadata.pid}) -- ${metadata.message}`;
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
