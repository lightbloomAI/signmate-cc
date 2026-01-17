'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getErrorRecoveryManager,
  type SignMateError,
  type ErrorCategory,
  type ErrorSeverity,
  type RecoveryResult,
  type ErrorHandler,
} from './errorRecovery';

/**
 * Hook to access the error recovery manager
 */
export function useErrorRecovery() {
  const manager = getErrorRecoveryManager();

  const handleError = useCallback(
    async (error: Error, context?: Record<string, unknown>) => {
      return manager.handleError(error, context);
    },
    [manager]
  );

  const createError = useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      return manager.createError(error, context);
    },
    [manager]
  );

  return {
    handleError,
    createError,
    getErrorHistory: manager.getErrorHistory.bind(manager),
    getRecentErrors: manager.getRecentErrors.bind(manager),
    getStatistics: manager.getStatistics.bind(manager),
    clearHistory: manager.clearHistory.bind(manager),
  };
}

/**
 * Hook to listen for errors
 */
export function useErrorListener(
  handler: ErrorHandler,
  filter?: {
    categories?: ErrorCategory[];
    severities?: ErrorSeverity[];
  }
) {
  const manager = getErrorRecoveryManager();
  const handlerRef = useRef(handler);

  // Keep handler ref updated
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrappedHandler: ErrorHandler = (error) => {
      // Apply filters
      if (filter?.categories && !filter.categories.includes(error.category)) {
        return;
      }
      if (filter?.severities && !filter.severities.includes(error.severity)) {
        return;
      }
      handlerRef.current(error);
    };

    return manager.addErrorHandler(wrappedHandler);
  }, [manager, filter?.categories, filter?.severities]);
}

/**
 * Hook to get recent errors and error state
 */
export function useErrorState(options?: {
  maxErrors?: number;
  recentMinutes?: number;
}) {
  const { maxErrors = 10, recentMinutes = 5 } = options || {};
  const manager = getErrorRecoveryManager();
  const [errors, setErrors] = useState<SignMateError[]>([]);
  const [lastError, setLastError] = useState<SignMateError | null>(null);

  useEffect(() => {
    // Initial load
    setErrors(manager.getRecentErrors(recentMinutes).slice(-maxErrors));

    // Subscribe to new errors
    const unsubscribe = manager.addErrorHandler((error) => {
      setLastError(error);
      setErrors((prev) => [...prev.slice(-(maxErrors - 1)), error]);
    });

    return unsubscribe;
  }, [manager, maxErrors, recentMinutes]);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setLastError(null);
  }, []);

  const dismissError = useCallback((errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId));
    setLastError((prev) => (prev?.id === errorId ? null : prev));
  }, []);

  return {
    errors,
    lastError,
    hasErrors: errors.length > 0,
    errorCount: errors.length,
    clearErrors,
    dismissError,
  };
}

/**
 * Hook for async operations with automatic error recovery
 */
export function useAsyncWithRecovery<T>(
  asyncFn: () => Promise<T>,
  options?: {
    immediate?: boolean;
    retryOnError?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: SignMateError) => void;
    context?: Record<string, unknown>;
  }
) {
  const {
    immediate = false,
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    context,
  } = options || {};

  const manager = getErrorRecoveryManager();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<SignMateError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFnRef.current();
      setData(result);
      setRetryCount(0);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const signMateError = manager.createError(err as Error, context);
      setError(signMateError);

      const result = await manager.handleError(err as Error, context);

      if (retryOnError && result.shouldRetry && retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);
        const delay = result.nextDelay || retryDelay;

        setTimeout(() => {
          execute();
        }, delay);
      } else {
        onError?.(signMateError);
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [manager, context, retryOnError, maxRetries, retryDelay, retryCount, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setRetryCount(0);
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    data,
    error,
    isLoading,
    retryCount,
    execute,
    reset,
  };
}

/**
 * Hook for tracking error statistics
 */
export function useErrorStatistics(refreshInterval?: number) {
  const manager = getErrorRecoveryManager();
  const [stats, setStats] = useState(manager.getStatistics());

  useEffect(() => {
    const refresh = () => setStats(manager.getStatistics());

    if (refreshInterval) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }

    // Subscribe to errors to update stats
    return manager.addErrorHandler(refresh);
  }, [manager, refreshInterval]);

  return stats;
}

/**
 * Hook to show error notifications/toasts
 */
export function useErrorNotifications(options?: {
  showLowSeverity?: boolean;
  showMediumSeverity?: boolean;
  showHighSeverity?: boolean;
  showCriticalSeverity?: boolean;
  autoDismiss?: number;
}) {
  const {
    showLowSeverity = false,
    showMediumSeverity = true,
    showHighSeverity = true,
    showCriticalSeverity = true,
    autoDismiss = 5000,
  } = options || {};

  const [notifications, setNotifications] = useState<
    Array<{ error: SignMateError; dismissed: boolean }>
  >([]);

  useErrorListener(
    (error) => {
      // Check severity filter
      const severityCheck = {
        low: showLowSeverity,
        medium: showMediumSeverity,
        high: showHighSeverity,
        critical: showCriticalSeverity,
      };

      if (!severityCheck[error.severity]) return;

      const notification = { error, dismissed: false };
      setNotifications((prev) => [...prev, notification]);

      // Auto-dismiss if configured
      if (autoDismiss > 0 && error.severity !== 'critical') {
        setTimeout(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.error.id === error.id ? { ...n, dismissed: true } : n
            )
          );
        }, autoDismiss);
      }
    }
  );

  const dismiss = useCallback((errorId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.error.id === errorId ? { ...n, dismissed: true } : n
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const activeNotifications = notifications.filter((n) => !n.dismissed);

  return {
    notifications: activeNotifications,
    dismiss,
    clearAll,
    count: activeNotifications.length,
  };
}

/**
 * Hook to wrap a function with error handling
 */
export function useErrorHandler<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: Record<string, unknown>
): [T, SignMateError | null, boolean] {
  const manager = getErrorRecoveryManager();
  const [error, setError] = useState<SignMateError | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const wrappedFn = useCallback(
    async (...args: Parameters<T>) => {
      setError(null);
      setIsProcessing(true);

      try {
        const result = await fn(...args);
        return result;
      } catch (err) {
        const signMateError = manager.createError(err as Error, {
          ...context,
          functionArgs: args,
        });
        setError(signMateError);
        await manager.handleError(err as Error, context);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [fn, manager, context]
  ) as T;

  return [wrappedFn, error, isProcessing];
}
