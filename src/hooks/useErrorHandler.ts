'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  errorHandler,
  handleErrorCode,
  handleUnknownError,
  type ErrorListener,
} from '@/lib/errors/handler';
import {
  ErrorCategory,
  ErrorSeverity,
  type SignMateError,
  type ErrorCode,
} from '@/lib/errors/types';

interface UseErrorHandlerOptions {
  maxDisplayed?: number;
  autoDismissMs?: number;
  filterCategory?: ErrorCategory;
  filterSeverity?: ErrorSeverity;
}

interface UseErrorHandlerReturn {
  errors: SignMateError[];
  latestError: SignMateError | null;
  hasErrors: boolean;
  hasCritical: boolean;
  reportError: (code: ErrorCode, details?: string, context?: Record<string, unknown>) => void;
  reportUnknown: (error: unknown, context?: Record<string, unknown>) => void;
  dismissError: (errorId: string) => void;
  dismissAll: () => void;
  getErrorsByCategory: (category: ErrorCategory) => SignMateError[];
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    maxDisplayed = 5,
    autoDismissMs = 0,
    filterCategory,
    filterSeverity,
  } = options;

  const [errors, setErrors] = useState<SignMateError[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Subscribe to error handler
  useEffect(() => {
    const listener: ErrorListener = (error) => {
      // Apply filters
      if (filterCategory && error.category !== filterCategory) return;
      if (filterSeverity && error.severity !== filterSeverity) return;

      setErrors((prev) => {
        const updated = [...prev, error];
        // Keep only recent errors up to max
        return updated.slice(-maxDisplayed);
      });

      // Auto-dismiss if configured
      if (autoDismissMs > 0 && error.severity !== ErrorSeverity.CRITICAL) {
        setTimeout(() => {
          setDismissedIds((prev) => new Set([...Array.from(prev), error.id]));
        }, autoDismissMs);
      }
    };

    const unsubscribe = errorHandler.addListener(listener);
    return unsubscribe;
  }, [maxDisplayed, autoDismissMs, filterCategory, filterSeverity]);

  // Filter out dismissed errors
  const visibleErrors = useMemo(() => {
    return errors.filter((e) => !dismissedIds.has(e.id));
  }, [errors, dismissedIds]);

  const latestError = useMemo(() => {
    return visibleErrors.length > 0 ? visibleErrors[visibleErrors.length - 1] : null;
  }, [visibleErrors]);

  const hasErrors = visibleErrors.length > 0;

  const hasCritical = useMemo(() => {
    return visibleErrors.some((e) => e.severity === ErrorSeverity.CRITICAL);
  }, [visibleErrors]);

  const reportError = useCallback(
    async (code: ErrorCode, details?: string, context?: Record<string, unknown>) => {
      await handleErrorCode(code, { details, context });
    },
    []
  );

  const reportUnknown = useCallback(async (error: unknown, context?: Record<string, unknown>) => {
    await handleUnknownError(error, context);
  }, []);

  const dismissError = useCallback((errorId: string) => {
    setDismissedIds((prev) => new Set([...Array.from(prev), errorId]));
  }, []);

  const dismissAll = useCallback(() => {
    setDismissedIds((prev) => {
      const newSet = new Set(prev);
      errors.forEach((e) => newSet.add(e.id));
      return newSet;
    });
  }, [errors]);

  const getErrorsByCategory = useCallback(
    (category: ErrorCategory) => {
      return visibleErrors.filter((e) => e.category === category);
    },
    [visibleErrors]
  );

  return {
    errors: visibleErrors,
    latestError,
    hasErrors,
    hasCritical,
    reportError,
    reportUnknown,
    dismissError,
    dismissAll,
    getErrorsByCategory,
  };
}
