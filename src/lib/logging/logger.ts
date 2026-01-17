/**
 * Logging and Telemetry System for SignMate
 *
 * Provides structured logging, log levels, and telemetry
 * for debugging and production monitoring.
 */

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  tags?: string[];
  error?: Error;
  correlationId?: string;
}

/**
 * Log transport interface
 */
export interface LogTransport {
  name: string;
  log(entry: LogEntry): void | Promise<void>;
  flush?(): void | Promise<void>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  context?: string;
  enableConsole: boolean;
  enableBuffer: boolean;
  bufferSize: number;
  transports: LogTransport[];
  formatTimestamp?: (timestamp: number) => string;
  redactKeys?: string[];
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: true,
  enableBuffer: true,
  bufferSize: 1000,
  transports: [],
  redactKeys: ['password', 'token', 'secret', 'apiKey', 'authorization'],
};

/**
 * Logger Class
 *
 * Structured logging with multiple transports and log levels.
 */
export class Logger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private correlationId?: string;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Clear correlation ID
   */
  clearCorrelationId(): void {
    this.correlationId = undefined;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    const childConfig = {
      ...this.config,
      context: this.config.context
        ? `${this.config.context}:${context}`
        : context,
    };
    const child = new Logger(childConfig);
    child.correlationId = this.correlationId;
    return child;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Create a log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: Date.now(),
      level,
      message,
      context: this.config.context,
      data: data ? this.redactSensitiveData(data) : undefined,
      correlationId: this.correlationId,
      error,
    };
  }

  /**
   * Redact sensitive data from logs
   */
  private redactSensitiveData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const redactKeys = this.config.redactKeys || [];
    const redacted = { ...data };

    const redact = (obj: Record<string, unknown>, keys: string[]) => {
      for (const key of Object.keys(obj)) {
        if (keys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key] as Record<string, unknown>, keys);
        }
      }
    };

    redact(redacted, redactKeys);
    return redacted;
  }

  /**
   * Format timestamp
   */
  private formatTimestamp(timestamp: number): string {
    if (this.config.formatTimestamp) {
      return this.config.formatTimestamp(timestamp);
    }
    return new Date(timestamp).toISOString();
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const prefix = entry.context ? `[${entry.context}]` : '';
    const message = `${timestamp} ${entry.level.toUpperCase()} ${prefix} ${entry.message}`;

    const consoleMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error,
    }[entry.level];

    if (entry.data || entry.error) {
      consoleMethod(message, { data: entry.data, error: entry.error });
    } else {
      consoleMethod(message);
    }
  }

  /**
   * Process a log entry
   */
  private async processEntry(entry: LogEntry): Promise<void> {
    // Add to buffer
    if (this.config.enableBuffer) {
      this.buffer.push(entry);
      if (this.buffer.length > this.config.bufferSize) {
        this.buffer = this.buffer.slice(-this.config.bufferSize);
      }
    }

    // Log to console
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Send to transports
    for (const transport of this.config.transports) {
      try {
        await transport.log(entry);
      } catch (err) {
        console.error(`[Logger] Transport '${transport.name}' failed:`, err);
      }
    }
  }

  /**
   * Debug log
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    this.processEntry(this.createEntry('debug', message, data));
  }

  /**
   * Info log
   */
  info(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    this.processEntry(this.createEntry('info', message, data));
  }

  /**
   * Warning log
   */
  warn(message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    this.processEntry(this.createEntry('warn', message, data));
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    this.processEntry(this.createEntry('error', message, data, error));
  }

  /**
   * Fatal log
   */
  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    if (!this.shouldLog('fatal')) return;
    this.processEntry(this.createEntry('fatal', message, data, error));
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;
    this.processEntry(this.createEntry(level, message, data));
  }

  /**
   * Get buffered logs
   */
  getBuffer(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Get logs by level
   */
  getByLevel(level: LogLevel): LogEntry[] {
    return this.buffer.filter((entry) => entry.level === level);
  }

  /**
   * Get recent logs
   */
  getRecent(count: number = 50): LogEntry[] {
    return this.buffer.slice(-count);
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Flush all transports
   */
  async flush(): Promise<void> {
    for (const transport of this.config.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }

  /**
   * Add a transport
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport);
  }

  /**
   * Remove a transport
   */
  removeTransport(name: string): void {
    this.config.transports = this.config.transports.filter(
      (t) => t.name !== name
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }
}

// ==================== TRANSPORTS ====================

/**
 * HTTP Transport - sends logs to a remote endpoint
 */
export class HttpTransport implements LogTransport {
  name = 'http';
  private endpoint: string;
  private batchSize: number;
  private flushInterval: number;
  private buffer: LogEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: {
    endpoint: string;
    batchSize?: number;
    flushInterval?: number;
  }) {
    this.endpoint = options.endpoint;
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 5000;

    // Start flush timer
    this.timer = setInterval(() => this.flush(), this.flushInterval);
  }

  async log(entry: LogEntry): Promise<void> {
    this.buffer.push(entry);
    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: entries }),
      });
    } catch (error) {
      // Re-add entries on failure
      this.buffer = [...entries, ...this.buffer];
      console.error('[HttpTransport] Failed to send logs:', error);
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

/**
 * Local Storage Transport - persists logs locally
 */
export class LocalStorageTransport implements LogTransport {
  name = 'localStorage';
  private key: string;
  private maxSize: number;

  constructor(options?: { key?: string; maxSize?: number }) {
    this.key = options?.key || 'signmate_logs';
    this.maxSize = options?.maxSize || 1000;
  }

  log(entry: LogEntry): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const existing = localStorage.getItem(this.key);
      const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
      logs.push(entry);

      // Trim to max size
      const trimmed = logs.slice(-this.maxSize);
      localStorage.setItem(this.key, JSON.stringify(trimmed));
    } catch (error) {
      console.error('[LocalStorageTransport] Failed to persist log:', error);
    }
  }

  getLogs(): LogEntry[] {
    if (typeof localStorage === 'undefined') return [];

    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  clear(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.key);
  }
}

// ==================== SINGLETON ====================

let logger: Logger | null = null;

/**
 * Get the singleton Logger
 */
export function getLogger(): Logger {
  if (!logger) {
    logger = new Logger();
  }
  return logger;
}

/**
 * Create a logger with context
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): Logger {
  const baseConfig = logger ? { ...DEFAULT_CONFIG, ...config } : config;
  const contextLogger = new Logger({
    ...baseConfig,
    context,
  });
  return contextLogger;
}

/**
 * Configure the global logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  if (!logger) {
    logger = new Logger(config);
  } else {
    logger.updateConfig(config);
  }
}

// ==================== CONVENIENCE FUNCTIONS ====================

export const log = {
  debug: (message: string, data?: Record<string, unknown>) =>
    getLogger().debug(message, data),
  info: (message: string, data?: Record<string, unknown>) =>
    getLogger().info(message, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    getLogger().warn(message, data),
  error: (message: string, error?: Error, data?: Record<string, unknown>) =>
    getLogger().error(message, error, data),
  fatal: (message: string, error?: Error, data?: Record<string, unknown>) =>
    getLogger().fatal(message, error, data),
};
