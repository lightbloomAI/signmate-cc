/**
 * Analytics Manager
 *
 * Comprehensive analytics system for tracking event performance,
 * translation quality, and audience engagement metrics.
 */

// Event types for analytics
export type AnalyticsEventType =
  | 'session_start'
  | 'session_end'
  | 'translation_started'
  | 'translation_completed'
  | 'sign_displayed'
  | 'error_occurred'
  | 'user_interaction'
  | 'performance_metric'
  | 'audience_feedback'
  | 'feature_used';

// Analytics event payload
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsEventType;
  timestamp: number;
  sessionId: string;
  data: Record<string, unknown>;
  metadata?: {
    userAgent?: string;
    viewport?: { width: number; height: number };
    connection?: string;
    language?: string;
  };
}

// Session metrics
export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;

  // Translation metrics
  translationsStarted: number;
  translationsCompleted: number;
  translationSuccessRate: number;
  averageTranslationLatency: number;
  totalWordsTranslated: number;
  totalSignsDisplayed: number;

  // Performance metrics
  averageFrameRate: number;
  minFrameRate: number;
  cpuUsage: number;
  memoryUsage: number;

  // Error metrics
  errorCount: number;
  errorsByType: Record<string, number>;

  // User interaction
  interactions: number;
  featureUsage: Record<string, number>;
}

// Aggregated analytics
export interface AggregatedAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: number;
  endTime: number;

  totalSessions: number;
  totalDuration: number;
  averageSessionDuration: number;

  totalTranslations: number;
  successfulTranslations: number;
  failedTranslations: number;
  overallSuccessRate: number;

  totalWordsTranslated: number;
  totalSignsDisplayed: number;
  averageLatency: number;

  errorCount: number;
  topErrors: Array<{ type: string; count: number }>;

  featureUsage: Record<string, number>;
  peakUsageTimes: Array<{ hour: number; sessions: number }>;
}

// Performance snapshot
export interface PerformanceSnapshot {
  timestamp: number;
  frameRate: number;
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  translationQueueLength: number;
}

// Analytics configuration
export interface AnalyticsConfig {
  enabled: boolean;
  samplingRate: number;
  batchSize: number;
  flushInterval: number;
  maxEventsInMemory: number;
  persistLocally: boolean;
  anonymize: boolean;
}

// Default configuration
const DEFAULT_CONFIG: AnalyticsConfig = {
  enabled: true,
  samplingRate: 1.0,
  batchSize: 50,
  flushInterval: 30000, // 30 seconds
  maxEventsInMemory: 1000,
  persistLocally: true,
  anonymize: true,
};

// Storage key
const STORAGE_KEY = 'signmate:analytics';

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * AnalyticsManager Class
 *
 * Manages collection, processing, and reporting of analytics data.
 */
export class AnalyticsManager {
  private config: AnalyticsConfig;
  private currentSessionId: string | null = null;
  private sessionStartTime: number = 0;
  private events: AnalyticsEvent[] = [];
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionMetrics: SessionMetrics | null = null;

  // Running totals for current session
  private translationLatencies: number[] = [];
  private frameRates: number[] = [];
  private errorCounts: Record<string, number> = {};
  private featureUsage: Record<string, number> = {};

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.restoreFromStorage();
    this.startFlushTimer();
  }

  // Session management
  startSession(): string {
    if (this.currentSessionId) {
      this.endSession();
    }

    this.currentSessionId = generateId();
    this.sessionStartTime = Date.now();
    this.translationLatencies = [];
    this.frameRates = [];
    this.errorCounts = {};
    this.featureUsage = {};

    this.sessionMetrics = {
      sessionId: this.currentSessionId,
      startTime: this.sessionStartTime,
      translationsStarted: 0,
      translationsCompleted: 0,
      translationSuccessRate: 0,
      averageTranslationLatency: 0,
      totalWordsTranslated: 0,
      totalSignsDisplayed: 0,
      averageFrameRate: 0,
      minFrameRate: Infinity,
      cpuUsage: 0,
      memoryUsage: 0,
      errorCount: 0,
      errorsByType: {},
      interactions: 0,
      featureUsage: {},
    };

    this.trackEvent('session_start', {
      sessionId: this.currentSessionId,
    });

    return this.currentSessionId;
  }

  endSession(): SessionMetrics | null {
    if (!this.currentSessionId || !this.sessionMetrics) {
      return null;
    }

    const endTime = Date.now();
    this.sessionMetrics.endTime = endTime;
    this.sessionMetrics.duration = endTime - this.sessionStartTime;
    this.sessionMetrics.translationSuccessRate =
      this.sessionMetrics.translationsStarted > 0
        ? this.sessionMetrics.translationsCompleted / this.sessionMetrics.translationsStarted
        : 0;
    this.sessionMetrics.averageTranslationLatency =
      this.translationLatencies.length > 0
        ? this.translationLatencies.reduce((a, b) => a + b, 0) / this.translationLatencies.length
        : 0;
    this.sessionMetrics.averageFrameRate =
      this.frameRates.length > 0
        ? this.frameRates.reduce((a, b) => a + b, 0) / this.frameRates.length
        : 0;
    this.sessionMetrics.errorsByType = { ...this.errorCounts };
    this.sessionMetrics.featureUsage = { ...this.featureUsage };

    this.trackEvent('session_end', {
      sessionId: this.currentSessionId,
      duration: this.sessionMetrics.duration,
      metrics: this.sessionMetrics,
    });

    const metrics = this.sessionMetrics;
    this.currentSessionId = null;
    this.sessionMetrics = null;

    return metrics;
  }

  getSessionId(): string | null {
    return this.currentSessionId;
  }

  getSessionMetrics(): SessionMetrics | null {
    return this.sessionMetrics;
  }

  // Event tracking
  trackEvent(type: AnalyticsEventType, data: Record<string, unknown> = {}): void {
    if (!this.config.enabled) return;
    if (Math.random() > this.config.samplingRate) return;

    const event: AnalyticsEvent = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      sessionId: this.currentSessionId || 'anonymous',
      data: this.config.anonymize ? this.anonymizeData(data) : data,
      metadata: this.getMetadata(),
    };

    this.events.push(event);

    // Update session metrics
    this.updateSessionMetrics(type, data);

    // Trim events if over limit
    if (this.events.length > this.config.maxEventsInMemory) {
      this.events = this.events.slice(-this.config.maxEventsInMemory);
    }

    // Persist to storage
    if (this.config.persistLocally) {
      this.saveToStorage();
    }
  }

  private updateSessionMetrics(type: AnalyticsEventType, data: Record<string, unknown>): void {
    if (!this.sessionMetrics) return;

    switch (type) {
      case 'translation_started':
        this.sessionMetrics.translationsStarted++;
        break;
      case 'translation_completed':
        this.sessionMetrics.translationsCompleted++;
        if (typeof data.latency === 'number') {
          this.translationLatencies.push(data.latency);
        }
        if (typeof data.wordCount === 'number') {
          this.sessionMetrics.totalWordsTranslated += data.wordCount;
        }
        break;
      case 'sign_displayed':
        this.sessionMetrics.totalSignsDisplayed++;
        break;
      case 'error_occurred':
        this.sessionMetrics.errorCount++;
        const errorType = String(data.errorType || 'unknown');
        this.errorCounts[errorType] = (this.errorCounts[errorType] || 0) + 1;
        break;
      case 'user_interaction':
        this.sessionMetrics.interactions++;
        break;
      case 'feature_used':
        const feature = String(data.feature || 'unknown');
        this.featureUsage[feature] = (this.featureUsage[feature] || 0) + 1;
        break;
      case 'performance_metric':
        if (typeof data.frameRate === 'number') {
          this.frameRates.push(data.frameRate);
          if (data.frameRate < this.sessionMetrics.minFrameRate) {
            this.sessionMetrics.minFrameRate = data.frameRate;
          }
        }
        if (typeof data.cpuUsage === 'number') {
          this.sessionMetrics.cpuUsage = data.cpuUsage;
        }
        if (typeof data.memoryUsage === 'number') {
          this.sessionMetrics.memoryUsage = data.memoryUsage;
        }
        break;
    }
  }

  // Convenience methods
  trackTranslationStart(text: string): void {
    this.trackEvent('translation_started', {
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
    });
  }

  trackTranslationComplete(text: string, latency: number, signCount: number): void {
    this.trackEvent('translation_completed', {
      textLength: text.length,
      wordCount: text.split(/\s+/).length,
      latency,
      signCount,
    });
  }

  trackSignDisplayed(gloss: string, duration: number): void {
    this.trackEvent('sign_displayed', { gloss, duration });
  }

  trackError(errorType: string, message: string, stack?: string): void {
    this.trackEvent('error_occurred', {
      errorType,
      message,
      stack: this.config.anonymize ? undefined : stack,
    });
  }

  trackInteraction(action: string, target: string, value?: unknown): void {
    this.trackEvent('user_interaction', { action, target, value });
  }

  trackFeatureUsed(feature: string, context?: Record<string, unknown>): void {
    this.trackEvent('feature_used', { feature, ...context });
  }

  // Performance tracking
  recordPerformanceSnapshot(snapshot: Omit<PerformanceSnapshot, 'timestamp'>): void {
    const fullSnapshot: PerformanceSnapshot = {
      ...snapshot,
      timestamp: Date.now(),
    };

    this.performanceSnapshots.push(fullSnapshot);

    // Keep last 100 snapshots
    if (this.performanceSnapshots.length > 100) {
      this.performanceSnapshots = this.performanceSnapshots.slice(-100);
    }

    this.trackEvent('performance_metric', snapshot);
  }

  getPerformanceSnapshots(): PerformanceSnapshot[] {
    return [...this.performanceSnapshots];
  }

  // Aggregation
  aggregateMetrics(period: 'hour' | 'day' | 'week' | 'month'): AggregatedAnalytics {
    const now = Date.now();
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    }[period];

    const startTime = now - periodMs;
    const relevantEvents = this.events.filter(e => e.timestamp >= startTime);

    // Calculate session metrics
    const sessionStarts = relevantEvents.filter(e => e.type === 'session_start');
    const sessionEnds = relevantEvents.filter(e => e.type === 'session_end');

    const translations = relevantEvents.filter(
      e => e.type === 'translation_completed'
    );
    const translationStarts = relevantEvents.filter(
      e => e.type === 'translation_started'
    );
    const errors = relevantEvents.filter(e => e.type === 'error_occurred');
    const features = relevantEvents.filter(e => e.type === 'feature_used');

    // Calculate totals
    let totalDuration = 0;
    sessionEnds.forEach(e => {
      if (typeof e.data.duration === 'number') {
        totalDuration += e.data.duration;
      }
    });

    let totalWords = 0;
    let totalSigns = 0;
    let totalLatency = 0;
    translations.forEach(e => {
      if (typeof e.data.wordCount === 'number') totalWords += e.data.wordCount;
      if (typeof e.data.signCount === 'number') totalSigns += e.data.signCount;
      if (typeof e.data.latency === 'number') totalLatency += e.data.latency;
    });

    // Error analysis
    const errorsByType: Record<string, number> = {};
    errors.forEach(e => {
      const type = String(e.data.errorType || 'unknown');
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });
    const topErrors = Object.entries(errorsByType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    // Feature usage
    const featureUsage: Record<string, number> = {};
    features.forEach(e => {
      const feature = String(e.data.feature || 'unknown');
      featureUsage[feature] = (featureUsage[feature] || 0) + 1;
    });

    // Peak usage times
    const hourlyUsage: Record<number, number> = {};
    sessionStarts.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1;
    });
    const peakUsageTimes = Object.entries(hourlyUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, sessions]) => ({ hour: Number(hour), sessions }));

    return {
      period,
      startTime,
      endTime: now,
      totalSessions: sessionStarts.length,
      totalDuration,
      averageSessionDuration: sessionStarts.length > 0 ? totalDuration / sessionStarts.length : 0,
      totalTranslations: translations.length,
      successfulTranslations: translations.length,
      failedTranslations: translationStarts.length - translations.length,
      overallSuccessRate: translationStarts.length > 0 ? translations.length / translationStarts.length : 0,
      totalWordsTranslated: totalWords,
      totalSignsDisplayed: totalSigns,
      averageLatency: translations.length > 0 ? totalLatency / translations.length : 0,
      errorCount: errors.length,
      topErrors,
      featureUsage,
      peakUsageTimes,
    };
  }

  // Export
  exportEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  exportToJSON(): string {
    return JSON.stringify({
      events: this.events,
      performanceSnapshots: this.performanceSnapshots,
      aggregated: {
        hour: this.aggregateMetrics('hour'),
        day: this.aggregateMetrics('day'),
        week: this.aggregateMetrics('week'),
      },
    }, null, 2);
  }

  // Storage
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        events: this.events.slice(-500), // Keep last 500 events
        performanceSnapshots: this.performanceSnapshots,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }

  private restoreFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.events = data.events || [];
        this.performanceSnapshots = data.performanceSnapshots || [];
      }
    } catch {
      // Invalid data
    }
  }

  // Flush timer
  private startFlushTimer(): void {
    if (typeof window === 'undefined') return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private flush(): void {
    if (this.events.length >= this.config.batchSize) {
      // In a real implementation, this would send to an analytics server
      this.saveToStorage();
    }
  }

  // Data anonymization
  private anonymizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['userId', 'email', 'ip', 'name', 'phone'];
    const anonymized = { ...data };

    for (const key of sensitiveKeys) {
      if (key in anonymized) {
        anonymized[key] = '[REDACTED]';
      }
    }

    return anonymized;
  }

  private getMetadata(): AnalyticsEvent['metadata'] {
    if (typeof window === 'undefined') return undefined;

    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection: (navigator as unknown as { connection?: { effectiveType?: string } })
        .connection?.effectiveType,
      language: navigator.language,
    };
  }

  // Configuration
  updateConfig(updates: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  // Cleanup
  clearEvents(): void {
    this.events = [];
    this.performanceSnapshots = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  destroy(): void {
    if (this.currentSessionId) {
      this.endSession();
    }
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.saveToStorage();
  }
}

// Singleton instance
let analyticsInstance: AnalyticsManager | null = null;

export function getAnalyticsManager(): AnalyticsManager {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsManager();
  }
  return analyticsInstance;
}

export function createAnalyticsManager(config?: Partial<AnalyticsConfig>): AnalyticsManager {
  return new AnalyticsManager(config);
}
