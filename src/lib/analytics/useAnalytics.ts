'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getAnalyticsManager,
  type AnalyticsEventType,
  type SessionMetrics,
  type AggregatedAnalytics,
  type PerformanceSnapshot,
} from './analyticsManager';

/**
 * useAnalytics Hook
 *
 * Main hook for accessing analytics functionality.
 */
export function useAnalytics() {
  const manager = useMemo(() => getAnalyticsManager(), []);
  const [sessionId, setSessionId] = useState<string | null>(manager.getSessionId());
  const [metrics, setMetrics] = useState<SessionMetrics | null>(manager.getSessionMetrics());

  // Start session
  const startSession = useCallback(() => {
    const id = manager.startSession();
    setSessionId(id);
    setMetrics(manager.getSessionMetrics());
    return id;
  }, [manager]);

  // End session
  const endSession = useCallback(() => {
    const finalMetrics = manager.endSession();
    setSessionId(null);
    setMetrics(null);
    return finalMetrics;
  }, [manager]);

  // Track event
  const trackEvent = useCallback(
    (type: AnalyticsEventType, data?: Record<string, unknown>) => {
      manager.trackEvent(type, data);
      setMetrics(manager.getSessionMetrics());
    },
    [manager]
  );

  // Convenience tracking methods
  const trackTranslation = useCallback(
    (text: string, latency: number, signCount: number) => {
      manager.trackTranslationComplete(text, latency, signCount);
      setMetrics(manager.getSessionMetrics());
    },
    [manager]
  );

  const trackError = useCallback(
    (errorType: string, message: string, stack?: string) => {
      manager.trackError(errorType, message, stack);
      setMetrics(manager.getSessionMetrics());
    },
    [manager]
  );

  const trackInteraction = useCallback(
    (action: string, target: string, value?: unknown) => {
      manager.trackInteraction(action, target, value);
      setMetrics(manager.getSessionMetrics());
    },
    [manager]
  );

  const trackFeature = useCallback(
    (feature: string, context?: Record<string, unknown>) => {
      manager.trackFeatureUsed(feature, context);
      setMetrics(manager.getSessionMetrics());
    },
    [manager]
  );

  // Auto-start session on mount if not already started
  useEffect(() => {
    if (!sessionId) {
      startSession();
    }

    return () => {
      // Don't end session on unmount - let it persist
    };
  }, [sessionId, startSession]);

  return {
    sessionId,
    metrics,
    startSession,
    endSession,
    trackEvent,
    trackTranslation,
    trackError,
    trackInteraction,
    trackFeature,
    manager,
  };
}

/**
 * useSessionMetrics Hook
 *
 * Hook for accessing current session metrics with auto-refresh.
 */
export function useSessionMetrics(refreshInterval: number = 5000) {
  const manager = useMemo(() => getAnalyticsManager(), []);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(manager.getSessionMetrics());

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(manager.getSessionMetrics());
    };

    const interval = setInterval(updateMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [manager, refreshInterval]);

  return metrics;
}

/**
 * useAggregatedAnalytics Hook
 *
 * Hook for accessing aggregated analytics data.
 */
export function useAggregatedAnalytics(
  period: 'hour' | 'day' | 'week' | 'month' = 'day'
) {
  const manager = useMemo(() => getAnalyticsManager(), []);
  const [analytics, setAnalytics] = useState<AggregatedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // Use requestAnimationFrame to avoid blocking
    requestAnimationFrame(() => {
      const data = manager.aggregateMetrics(period);
      setAnalytics(data);
      setIsLoading(false);
    });
  }, [manager, period]);

  return { analytics, isLoading };
}

/**
 * usePerformanceTracking Hook
 *
 * Hook for tracking and reporting performance metrics.
 */
export function usePerformanceTracking(sampleInterval: number = 1000) {
  const manager = useMemo(() => getAnalyticsManager(), []);
  const [snapshots, setSnapshots] = useState<PerformanceSnapshot[]>([]);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Track frame rate
  useEffect(() => {
    let animationId: number;
    let intervalId: NodeJS.Timeout;

    const trackFrame = () => {
      frameCountRef.current++;
      animationId = requestAnimationFrame(trackFrame);
    };

    const recordSnapshot = () => {
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;
      const frameRate = (frameCountRef.current / elapsed) * 1000;

      // Reset counters
      frameCountRef.current = 0;
      lastTimeRef.current = now;

      // Get memory usage if available
      const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      const memoryUsage = memoryInfo
        ? memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit
        : 0;

      const snapshot: Omit<PerformanceSnapshot, 'timestamp'> = {
        frameRate: Math.round(frameRate),
        cpuUsage: 0, // Not available in browser
        memoryUsage,
        networkLatency: 0, // Would need to measure actual network calls
        translationQueueLength: 0, // Would need integration with translation system
      };

      manager.recordPerformanceSnapshot(snapshot);
      setSnapshots(manager.getPerformanceSnapshots());
    };

    animationId = requestAnimationFrame(trackFrame);
    intervalId = setInterval(recordSnapshot, sampleInterval);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
    };
  }, [manager, sampleInterval]);

  return snapshots;
}

/**
 * useTranslationAnalytics Hook
 *
 * Hook specifically for tracking translation events.
 */
export function useTranslationAnalytics() {
  const manager = useMemo(() => getAnalyticsManager(), []);
  const startTimeRef = useRef<number>(0);
  const currentTextRef = useRef<string>('');

  const startTranslation = useCallback(
    (text: string) => {
      startTimeRef.current = performance.now();
      currentTextRef.current = text;
      manager.trackTranslationStart(text);
    },
    [manager]
  );

  const completeTranslation = useCallback(
    (signCount: number) => {
      const latency = performance.now() - startTimeRef.current;
      manager.trackTranslationComplete(currentTextRef.current, latency, signCount);
    },
    [manager]
  );

  const trackSignDisplayed = useCallback(
    (gloss: string, duration: number) => {
      manager.trackSignDisplayed(gloss, duration);
    },
    [manager]
  );

  return {
    startTranslation,
    completeTranslation,
    trackSignDisplayed,
  };
}

/**
 * useEventTracking Hook
 *
 * Simple hook for tracking specific events.
 */
export function useEventTracking(eventType: AnalyticsEventType) {
  const manager = useMemo(() => getAnalyticsManager(), []);

  const track = useCallback(
    (data?: Record<string, unknown>) => {
      manager.trackEvent(eventType, data);
    },
    [manager, eventType]
  );

  return track;
}

/**
 * useFeatureTracking Hook
 *
 * Hook for tracking feature usage with automatic mount/unmount tracking.
 */
export function useFeatureTracking(featureName: string) {
  const manager = useMemo(() => getAnalyticsManager(), []);

  useEffect(() => {
    manager.trackFeatureUsed(featureName, { event: 'opened' });

    return () => {
      manager.trackFeatureUsed(featureName, { event: 'closed' });
    };
  }, [manager, featureName]);

  const trackAction = useCallback(
    (action: string, data?: Record<string, unknown>) => {
      manager.trackFeatureUsed(featureName, { action, ...data });
    },
    [manager, featureName]
  );

  return trackAction;
}

/**
 * useErrorTracking Hook
 *
 * Hook for tracking errors with automatic error boundary integration.
 */
export function useErrorTracking() {
  const manager = useMemo(() => getAnalyticsManager(), []);

  const trackError = useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      manager.trackError(error.name, error.message, error.stack);
      if (context) {
        manager.trackEvent('error_occurred', { ...context, errorName: error.name });
      }
    },
    [manager]
  );

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      manager.trackError('uncaught_error', event.message, event.error?.stack);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      manager.trackError(
        'unhandled_rejection',
        String(event.reason),
        event.reason?.stack
      );
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [manager]);

  return trackError;
}
