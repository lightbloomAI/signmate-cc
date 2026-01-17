export {
  AnalyticsManager,
  getAnalyticsManager,
  createAnalyticsManager,
  type AnalyticsEventType,
  type AnalyticsEvent,
  type SessionMetrics,
  type AggregatedAnalytics,
  type PerformanceSnapshot,
  type AnalyticsConfig,
} from './analyticsManager';

export {
  useAnalytics,
  useSessionMetrics,
  useAggregatedAnalytics,
  usePerformanceTracking,
  useTranslationAnalytics,
  useEventTracking,
  useFeatureTracking,
  useErrorTracking,
} from './useAnalytics';
