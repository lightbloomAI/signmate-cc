'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getPerformanceOptimizer,
  type PerformanceSnapshot,
  type QualityLevel,
  debounce,
  throttle,
  requestIdleCallback,
  cancelIdleCallback,
  domBatcher,
} from './optimizer';

/**
 * Hook to access performance optimizer
 */
export function usePerformanceOptimizer() {
  const optimizer = getPerformanceOptimizer();
  const [isRunning, setIsRunning] = useState(false);

  const start = useCallback(() => {
    optimizer.start();
    setIsRunning(true);
  }, [optimizer]);

  const stop = useCallback(() => {
    optimizer.stop();
    setIsRunning(false);
  }, [optimizer]);

  return {
    optimizer,
    isRunning,
    start,
    stop,
  };
}

/**
 * Hook to get performance metrics
 */
export function usePerformanceMetrics(options?: { updateInterval?: number }) {
  const { updateInterval = 1000 } = options || {};
  const optimizer = getPerformanceOptimizer();
  const [metrics, setMetrics] = useState<PerformanceSnapshot | null>(null);
  const [averageMetrics, setAverageMetrics] = useState<Partial<PerformanceSnapshot>>({});

  useEffect(() => {
    const unsubscribe = optimizer.subscribe((snapshot) => {
      setMetrics(snapshot);
      setAverageMetrics(optimizer.getAverageMetrics());
    });

    return unsubscribe;
  }, [optimizer]);

  return {
    current: metrics,
    average: averageMetrics,
    history: optimizer.getHistory(),
  };
}

/**
 * Hook for adaptive quality settings
 */
export function useAdaptiveQuality() {
  const optimizer = getPerformanceOptimizer();
  const [quality, setQuality] = useState<QualityLevel>(optimizer.getCurrentQuality());

  useEffect(() => {
    const originalCallback = optimizer['config'].onQualityChange;

    optimizer.updateConfig({
      onQualityChange: (level) => {
        setQuality(level);
        originalCallback?.(level);
      },
    });

    return () => {
      optimizer.updateConfig({ onQualityChange: originalCallback });
    };
  }, [optimizer]);

  const setQualityLevel = useCallback(
    (index: number) => {
      optimizer.setQualityLevel(index);
      setQuality(optimizer.getCurrentQuality());
    },
    [optimizer]
  );

  return {
    quality,
    setQualityLevel,
    qualityLevels: optimizer.getQualityLevels(),
  };
}

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () =>
      debounce((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }, delay) as T,
    [delay]
  );
}

/**
 * Hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: unknown[]) => void>(
  callback: T,
  limit: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useMemo(
    () =>
      throttle((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }, limit) as T,
    [limit]
  );
}

/**
 * Hook for idle callback scheduling
 */
export function useIdleCallback(
  callback: () => void,
  options?: { timeout?: number; enabled?: boolean }
): void {
  const { timeout, enabled = true } = options || {};
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handle = requestIdleCallback(
      () => {
        callbackRef.current();
      },
      timeout ? { timeout } : undefined
    );

    return () => cancelIdleCallback(handle);
  }, [timeout, enabled]);
}

/**
 * Hook for measuring render performance
 */
export function useRenderTiming(componentName?: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const startTimeRef = useRef(0);

  // Start timing on render
  startTimeRef.current = performance.now();
  renderCount.current++;

  useEffect(() => {
    const renderTime = performance.now() - startTimeRef.current;
    renderTimes.current.push(renderTime);

    // Keep only last 100 measurements
    if (renderTimes.current.length > 100) {
      renderTimes.current = renderTimes.current.slice(-100);
    }

    if (process.env.NODE_ENV === 'development' && componentName && renderTime > 16) {
      console.warn(
        `[Performance] ${componentName} took ${renderTime.toFixed(2)}ms to render`
      );
    }
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime:
      renderTimes.current.length > 0
        ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
        : 0,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
  };
}

/**
 * Hook for batched DOM operations
 */
export function useDOMBatch() {
  const read = useCallback((fn: () => void) => {
    domBatcher.read(fn);
  }, []);

  const write = useCallback((fn: () => void) => {
    domBatcher.write(fn);
  }, []);

  return { read, write };
}

/**
 * Hook for intersection observer with lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options]);

  return isIntersecting;
}

/**
 * Hook for lazy initialization
 */
export function useLazyInit<T>(init: () => T): T {
  const ref = useRef<{ value: T | null; initialized: boolean }>({
    value: null,
    initialized: false,
  });

  if (!ref.current.initialized) {
    ref.current.value = init();
    ref.current.initialized = true;
  }

  return ref.current.value as T;
}

/**
 * Hook for memoized expensive computations with automatic invalidation
 */
export function useMemoizedComputation<T, D extends unknown[]>(
  compute: () => T,
  deps: D,
  options?: { maxAge?: number }
): T {
  const { maxAge } = options || {};
  const computeRef = useRef(compute);
  computeRef.current = compute;

  const cacheRef = useRef<{
    value: T | undefined;
    deps: D | undefined;
    timestamp: number;
  }>({
    value: undefined,
    deps: undefined,
    timestamp: 0,
  });

  // Check if deps changed or cache expired
  const depsChanged = !cacheRef.current.deps ||
    deps.length !== cacheRef.current.deps.length ||
    deps.some((d, i) => d !== cacheRef.current.deps![i]);

  const expired = maxAge && Date.now() - cacheRef.current.timestamp > maxAge;

  if (depsChanged || expired || cacheRef.current.value === undefined) {
    cacheRef.current = {
      value: computeRef.current(),
      deps,
      timestamp: Date.now(),
    };
  }

  return cacheRef.current.value as T;
}

/**
 * Hook for RAF-based animations
 */
export function useAnimationFrame(
  callback: (deltaTime: number) => void,
  enabled: boolean = true
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let frameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const deltaTime = time - lastTime;
      lastTime = time;
      callbackRef.current(deltaTime);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [enabled]);
}

/**
 * Hook for FPS monitoring
 */
export function useFPS(): number {
  const [fps, setFps] = useState(60);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let frameId: number;

    const measureFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / elapsed));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      frameId = requestAnimationFrame(measureFPS);
    };

    frameId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(frameId);
  }, []);

  return fps;
}
