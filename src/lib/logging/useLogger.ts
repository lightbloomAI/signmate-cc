'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  getLogger,
  createLogger,
  type Logger,
  type LogEntry,
  type LogLevel,
} from './logger';

/**
 * Hook to get a logger with component context
 */
export function useLogger(context?: string): Logger {
  return useMemo(() => {
    if (context) {
      return createLogger(context);
    }
    return getLogger();
  }, [context]);
}

/**
 * Hook for logging with automatic component name
 */
export function useComponentLogger(componentName: string) {
  const logger = useLogger(componentName);

  const debug = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.debug(message, data);
    },
    [logger]
  );

  const info = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.info(message, data);
    },
    [logger]
  );

  const warn = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      logger.warn(message, data);
    },
    [logger]
  );

  const error = useCallback(
    (message: string, err?: Error, data?: Record<string, unknown>) => {
      logger.error(message, err, data);
    },
    [logger]
  );

  return { debug, info, warn, error, logger };
}

/**
 * Hook to access log buffer
 */
export function useLogBuffer(options?: {
  level?: LogLevel;
  maxEntries?: number;
}): LogEntry[] {
  const { level, maxEntries = 100 } = options || {};
  const logger = getLogger();

  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Initial load
    let buffer = logger.getBuffer();
    if (level) {
      buffer = buffer.filter((entry) => entry.level === level);
    }
    setLogs(buffer.slice(-maxEntries));

    // Poll for updates (since logger doesn't emit events)
    const interval = setInterval(() => {
      let buffer = logger.getBuffer();
      if (level) {
        buffer = buffer.filter((entry) => entry.level === level);
      }
      setLogs(buffer.slice(-maxEntries));
    }, 1000);

    return () => clearInterval(interval);
  }, [logger, level, maxEntries]);

  return logs;
}

/**
 * Hook for log viewer component
 */
export function useLogViewer(): {
  logs: LogEntry[];
  filter: LogLevel | 'all';
  setFilter: (filter: LogLevel | 'all') => void;
  search: string;
  setSearch: (search: string) => void;
  filteredLogs: LogEntry[];
  clearLogs: () => void;
} {
  const logger = getLogger();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs(logger.getBuffer());
    }, 500);

    return () => clearInterval(interval);
  }, [logger]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filter !== 'all') {
      result = result.filter((log) => log.level === filter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(searchLower) ||
          log.context?.toLowerCase().includes(searchLower) ||
          JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [logs, filter, search]);

  const clearLogs = useCallback(() => {
    logger.clearBuffer();
    setLogs([]);
  }, [logger]);

  return {
    logs,
    filter,
    setFilter,
    search,
    setSearch,
    filteredLogs,
    clearLogs,
  };
}

/**
 * Hook for error boundary logging
 */
export function useErrorLogging() {
  const logger = useLogger('ErrorBoundary');

  const logError = useCallback(
    (error: Error, errorInfo?: { componentStack?: string }) => {
      logger.error('Unhandled React error', error, {
        componentStack: errorInfo?.componentStack,
      });
    },
    [logger]
  );

  return { logError };
}

/**
 * Hook for performance logging
 */
export function usePerformanceLogging(componentName: string) {
  const logger = useLogger(`Performance:${componentName}`);
  const startTimeRef = useMemo(() => performance.now(), []);

  useEffect(() => {
    const mountTime = performance.now() - startTimeRef;
    logger.debug('Component mounted', { mountTime: `${mountTime.toFixed(2)}ms` });

    return () => {
      const totalTime = performance.now() - startTimeRef;
      logger.debug('Component unmounted', { totalLifetime: `${totalTime.toFixed(2)}ms` });
    };
  }, [logger, startTimeRef]);

  const logTiming = useCallback(
    (operation: string, startTime: number) => {
      const duration = performance.now() - startTime;
      logger.debug(`${operation} completed`, { duration: `${duration.toFixed(2)}ms` });
    },
    [logger]
  );

  return { logTiming };
}

/**
 * Hook for user action logging
 */
export function useActionLogging() {
  const logger = useLogger('UserAction');

  const logAction = useCallback(
    (action: string, data?: Record<string, unknown>) => {
      logger.info(action, {
        ...data,
        timestamp: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
    },
    [logger]
  );

  const logClick = useCallback(
    (elementId: string, elementType?: string) => {
      logAction('click', { elementId, elementType });
    },
    [logAction]
  );

  const logNavigation = useCallback(
    (from: string, to: string) => {
      logAction('navigation', { from, to });
    },
    [logAction]
  );

  return { logAction, logClick, logNavigation };
}

/**
 * Hook for log level stats
 */
export function useLogStats(): {
  total: number;
  byLevel: Record<LogLevel, number>;
  errorRate: number;
} {
  const [stats, setStats] = useState({
    total: 0,
    byLevel: {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    } as Record<LogLevel, number>,
    errorRate: 0,
  });

  useEffect(() => {
    const logger = getLogger();

    const interval = setInterval(() => {
      const buffer = logger.getBuffer();
      const byLevel: Record<LogLevel, number> = {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0,
      };

      buffer.forEach((entry) => {
        byLevel[entry.level]++;
      });

      const errorCount = byLevel.error + byLevel.fatal;
      const errorRate = buffer.length > 0 ? (errorCount / buffer.length) * 100 : 0;

      setStats({
        total: buffer.length,
        byLevel,
        errorRate,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}
