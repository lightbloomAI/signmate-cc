export {
  performanceMonitor,
  startTimer,
  endTimer,
  recordMetric,
  type PipelineMetrics,
  type MetricsSample,
  type MetricsCallback,
} from './metrics';

export {
  memoryManager,
  ObjectPool,
  LRUCache,
  type MemoryConfig,
  type MemoryWarningCallback,
} from './memoryManager';

// Performance Optimizer
export {
  PerformanceOptimizer,
  getPerformanceOptimizer,
  createPerformanceOptimizer,
  DOMBatcher,
  domBatcher,
  requestIdleCallback,
  cancelIdleCallback,
  debounce,
  throttle,
  type PerformanceSnapshot,
  type QualityLevel,
  type PerformanceThresholds,
  type OptimizerConfig,
} from './optimizer';

// React hooks
export {
  usePerformanceOptimizer,
  usePerformanceMetrics,
  useAdaptiveQuality,
  useDebounce,
  useDebouncedCallback,
  useThrottledCallback,
  useIdleCallback,
  useRenderTiming,
  useDOMBatch,
  useIntersectionObserver,
  useLazyInit,
  useMemoizedComputation,
  useAnimationFrame,
  useFPS,
} from './usePerformance';
