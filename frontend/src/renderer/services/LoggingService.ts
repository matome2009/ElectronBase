import { ErrorMessageProvider } from './ErrorMessageProvider';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/** 本番環境では ERROR のみ出力、開発環境は全レベル出力 */
const IS_PRODUCTION = import.meta.env.VITE_APP_ENV === 'prd';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

/**
 * LoggingService handles all application logging
 * Requirement 19.1: Log all blockchain queries with timestamp, query type, and response time
 * Requirement 19.2: Log all transaction broadcasts with transaction hash and status
 * Requirement 19.3: Log all validation warnings and errors with affected Payment_Record details
 * Requirement 19.4: Store logs in a rotating file with maximum size of 100MB per file
 * Requirement 19.5: Allow User to export logs for support purposes
 */
export class LoggingService {
  private static logs: LogEntry[] = [];
  private static readonly MAX_MEMORY_LOGS = 1000;

  static debug(message: string, context?: Record<string, any>): void {
    if (!IS_PRODUCTION) this.log(LogLevel.DEBUG, message, context);
  }

  static info(message: string, context?: Record<string, any>): void {
    if (!IS_PRODUCTION) this.log(LogLevel.INFO, message, context);
  }

  static warn(message: string, context?: Record<string, any>): void {
    if (!IS_PRODUCTION) this.log(LogLevel.WARN, message, context);
  }

  /** error は本番でも必ず出力する */
  static error(error: Error | string, context?: Record<string, any>): void {
    const message = error instanceof Error
      ? ErrorMessageProvider.formatForLogging(error)
      : error;
    const stack = error instanceof Error ? error.stack : undefined;
    this.log(LogLevel.ERROR, message, context, stack);
  }

  private static log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    stackTrace?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stackTrace,
    };

    this.logs.push(entry);
    if (this.logs.length > this.MAX_MEMORY_LOGS) this.logs.shift();

    this.writeToConsole(entry);
  }

  private static writeToConsole(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);
    switch (entry.level) {
      case LogLevel.DEBUG: console.debug(formatted); break;
      case LogLevel.INFO:  console.info(formatted);  break;
      case LogLevel.WARN:  console.warn(formatted);  break;
      case LogLevel.ERROR: console.error(formatted); break;
    }
  }

  private static formatLogEntry(entry: LogEntry): string {
    let formatted = `[${entry.timestamp}] [${entry.level}] ${entry.message}`;

    if (entry.context) {
      formatted += `\nContext: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.stackTrace) {
      formatted += `\nStack Trace: ${entry.stackTrace}`;
    }

    return formatted;
  }
  static getLogs(): readonly LogEntry[] {
    return [...this.logs];
  }

  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  static clearLogs(): void {
    this.logs = [];
  }
}
