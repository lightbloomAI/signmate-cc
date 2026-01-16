'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  performanceMonitor,
  startTimer,
  endTimer,
  recordMetric,
  type PipelineMetrics,
} from '@/lib/performance';
import { memoryManager, type MemoryWarningCallback } from '@/lib/performance/memoryManager';

interface PerformanceState {
  metrics: PipelineMetrics | null;
  memoryLevel: 'normal' | 'warning' | 'critical';
  memoryUsageMB: number;
  isHealthy: boolean;
}

interface UsePerformanceMonitorOptions {
  enableMemoryMonitoring?: boolean;
  memoryWarningThreshold?: number;
  memoryCriticalThreshold?: number;
}

interface UsePerformanceMonitorReturn extends PerformanceState {
  startTimer: (name: string) => void;
  endTimer: (name: string) => number;
  recordMetric: (name: string, value: number) => void;
  getLatencyStatus: () => 'excellent' | 'good' | 'warning' | 'poor';
  forceMemoryCleanup: () => void;
}

export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    enableMemoryMonitoring = true,
    memoryWarningThreshold = 150,
    memoryCriticalThreshold = 250,
  } = options;

  const [state, setState] = useState<PerformanceState>({
    metrics: null,
    memoryLevel: 'normal',
    memoryUsageMB: 0,
    isHealthy: true,
  });

  const cleanupRef = useRef<(() => void)[]>([]);

  // Subscribe to metrics updates
  useEffect(() => {
    const unsubscribeMetrics = performanceMonitor.subscribe((metrics) => {
      setState((prev) => ({
        ...prev,
        metrics,
        isHealthy: metrics.totalLatency < 500 && prev.memoryLevel !== 'critical',
      }));
    });

    cleanupRef.current.push(unsubscribeMetrics);

    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup());
      cleanupRef.current = [];
    };
  }, []);

  // Setup memory monitoring
  useEffect(() => {
    if (!enableMemoryMonitoring) return;

    memoryManager.configure({
      warningThreshold: memoryWarningThreshold,
      criticalThreshold: memoryCriticalThreshold,
    });

    const handleWarning: MemoryWarningCallback = (level, usageMB) => {
      setState((prev) => ({
        ...prev,
        memoryLevel: level,
        memoryUsageMB: usageMB,
        isHealthy: level !== 'critical' && (prev.metrics?.totalLatency || 0) < 500,
      }));
    };

    const unsubscribeWarning = memoryManager.onWarning(handleWarning);
    memoryManager.start();

    return () => {
      unsubscribeWarning();
      memoryManager.stop();
    };
  }, [enableMemoryMonitoring, memoryWarningThreshold, memoryCriticalThreshold]);

  // Periodically update memory stats
  useEffect(() => {
    if (!enableMemoryMonitoring) return;

    const interval = setInterval(() => {
      const stats = memoryManager.getStats();
      setState((prev) => ({
        ...prev,
        memoryLevel: stats.level,
        memoryUsageMB: stats.usedMB,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [enableMemoryMonitoring]);

  const handleStartTimer = useCallback((name: string) => {
    startTimer(name);
  }, []);

  const handleEndTimer = useCallback((name: string) => {
    return endTimer(name);
  }, []);

  const handleRecordMetric = useCallback((name: string, value: number) => {
    recordMetric(name, value);
  }, []);

  const getLatencyStatus = useCallback((): 'excellent' | 'good' | 'warning' | 'poor' => {
    const totalLatency = state.metrics?.totalLatency || 0;

    if (totalLatency <= 200) return 'excellent';
    if (totalLatency <= 500) return 'good';
    if (totalLatency <= 1000) return 'warning';
    return 'poor';
  }, [state.metrics]);

  const forceMemoryCleanup = useCallback(() => {
    memoryManager.forceCleanup();
  }, []);

  return {
    ...state,
    startTimer: handleStartTimer,
    endTimer: handleEndTimer,
    recordMetric: handleRecordMetric,
    getLatencyStatus,
    forceMemoryCleanup,
  };
}
