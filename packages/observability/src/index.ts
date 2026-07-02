/**
 * @dt/observability
 *
 * V2 boundary. In V1 we ship a thin console logger. V2 adds structured logs,
 * request tracing, and metrics.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  level?: LogLevel;
  bindings?: Record<string, unknown>;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

class ConsoleLogger implements Logger {
  constructor(
    private readonly level: LogLevel = 'info',
    private readonly bindings: Record<string, unknown> = {},
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
  child(bindings: Record<string, unknown>): Logger {
    return new ConsoleLogger(this.level, { ...this.bindings, ...bindings });
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    const payload = { ...this.bindings, ...context };
    const fn =
      level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level}] ${message}`, payload);
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return new ConsoleLogger(options.level, options.bindings);
}
