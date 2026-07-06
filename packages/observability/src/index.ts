/**
 * @dt/observability
 *
 * V2 boundary. In V1 we shipped a thin console logger. V2 adds structured
 * logs (JSON or pretty), a `sink` injection point for tests, and request
 * tracing support via child loggers.
 *
 * The default format is `json` in production (`NODE_ENV=production`) and
 * `pretty` otherwise. Pass `format` to override.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFormat = 'json' | 'pretty';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
}

export interface LoggerOptions {
  level?: LogLevel;
  format?: LogFormat;
  bindings?: LogContext;
  sink?: (line: string) => void;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function defaultFormat(): LogFormat {
  return process.env['NODE_ENV'] === 'production' ? 'json' : 'pretty';
}

function defaultSink(): (line: string) => void {
  return (line) => {
    process.stdout.write(line + '\n');
  };
}

function emit(
  format: LogFormat,
  level: LogLevel,
  message: string,
  context: LogContext,
  sink: (line: string) => void,
): void {
  if (format === 'json') {
    sink(JSON.stringify({ time: new Date().toISOString(), level, msg: message, ...context }));
    return;
  }
  const tags = Object.keys(context).length ? ' ' + JSON.stringify(context) : '';
  sink(`[${level}] ${message}${tags}`);
}

function levelForOrder(order: number): LogLevel {
  if (order <= LEVEL_ORDER.debug) return 'debug';
  if (order <= LEVEL_ORDER.info) return 'info';
  if (order <= LEVEL_ORDER.warn) return 'warn';
  return 'error';
}

class StructuredLogger implements Logger {
  private readonly levelOrder: number;
  private readonly format: LogFormat;
  private readonly bindings: LogContext;
  private readonly sink: (line: string) => void;

  constructor(options: LoggerOptions) {
    const level = options.level ?? 'info';
    this.levelOrder = LEVEL_ORDER[level];
    this.format = options.format ?? defaultFormat();
    this.bindings = options.bindings ?? {};
    this.sink = options.sink ?? defaultSink();
  }

  debug(message: string, context: LogContext = {}): void {
    this.log('debug', message, context);
  }
  info(message: string, context: LogContext = {}): void {
    this.log('info', message, context);
  }
  warn(message: string, context: LogContext = {}): void {
    this.log('warn', message, context);
  }
  error(message: string, context: LogContext = {}): void {
    this.log('error', message, context);
  }
  child(bindings: LogContext): Logger {
    return new StructuredLogger({
      level: levelForOrder(this.levelOrder),
      format: this.format,
      bindings: { ...this.bindings, ...bindings },
      sink: this.sink,
    });
  }

  private log(level: LogLevel, message: string, context: LogContext): void {
    if (LEVEL_ORDER[level] < this.levelOrder) return;
    emit(this.format, level, message, { ...this.bindings, ...context }, this.sink);
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return new StructuredLogger(options);
}
