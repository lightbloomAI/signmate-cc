/**
 * Performance Optimization System for SignMate
 *
 * Provides runtime performance monitoring, optimization strategies,
 * and adaptive quality adjustments for smooth real-time operation.
 */

/**
 * Performance metrics snapshot
 */
export interface PerformanceSnapshot {
  timestamp: number;
  fps: number;
  frameTime: number;
  memoryUsage: number | null;
  jsHeapSize: number | null;
  latency: number;
  droppedFrames: number;
  renderTime: number;
  pipelineTime: number;
}

/**
 * Quality level settings
 */
export interface QualityLevel {
  name: string;
  avatarQuality: 'low' | 'medium' | 'high';
  animationSmoothing: number;
  maxParticles: number;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  textureResolution: number;
  targetFPS: number;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxLatency: number;
  maxMemoryMB: number;
  maxDroppedFramesPercent: number;
}

/**
 * Optimizer configuration
 */
export interface OptimizerConfig {
  enabled: boolean;
  adaptiveQuality: boolean;
  targetFPS: number;
  measurementInterval: number;
  historySize: number;
  thresholds: PerformanceThresholds;
  onQualityChange?: (level: QualityLevel) => void;
  onPerformanceWarning?: (metric: string, value: number, threshold: number) => void;
}

const DEFAULT_CONFIG: OptimizerConfig = {
  enabled: true,
  adaptiveQuality: true,
  targetFPS: 60,
  measurementInterval: 1000,
  historySize: 60,
  thresholds: {
    minFPS: 30,
    maxFrameTime: 33,
    maxLatency: 200,
    maxMemoryMB: 512,
    maxDroppedFramesPercent: 5,
  },
};

const QUALITY_LEVELS: QualityLevel[] = [
  {
    name: 'Ultra Low',
    avatarQuality: 'low',
    animationSmoothing: 0.3,
    maxParticles: 0,
    shadowQuality: 'off',
    textureResolution: 256,
    targetFPS: 30,
  },
  {
    name: 'Low',
    avatarQuality: 'low',
    animationSmoothing: 0.5,
    maxParticles: 50,
    shadowQuality: 'off',
    textureResolution: 512,
    targetFPS: 45,
  },
  {
    name: 'Medium',
    avatarQuality: 'medium',
    animationSmoothing: 0.7,
    maxParticles: 100,
    shadowQuality: 'low',
    textureResolution: 1024,
    targetFPS: 60,
  },
  {
    name: 'High',
    avatarQuality: 'high',
    animationSmoothing: 0.9,
    maxParticles: 200,
    shadowQuality: 'medium',
    textureResolution: 2048,
    targetFPS: 60,
  },
  {
    name: 'Ultra',
    avatarQuality: 'high',
    animationSmoothing: 1.0,
    maxParticles: 500,
    shadowQuality: 'high',
    textureResolution: 4096,
    targetFPS: 60,
  },
];

/**
 * Performance Optimizer
 *
 * Monitors and optimizes application performance in real-time.
 */
export class PerformanceOptimizer {
  private config: OptimizerConfig;
  private history: PerformanceSnapshot[] = [];
  private currentQualityIndex = 2; // Start at medium
  private measurementInterval: ReturnType<typeof setInterval> | null = null;
  private frameCount = 0;
  private lastFrameTime = 0;
  private droppedFrames = 0;
  private totalFrames = 0;
  private frameCallback: number | null = null;
  private listeners: Set<(snapshot: PerformanceSnapshot) => void> = new Set();

  constructor(config: Partial<OptimizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.measurementInterval) return;

    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.totalFrames = 0;

    // Start frame counting
    this.countFrames();

    // Start measurement interval
    this.measurementInterval = setInterval(() => {
      this.measure();
    }, this.config.measurementInterval);
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (this.measurementInterval) {
      clearInterval(this.measurementInterval);
      this.measurementInterval = null;
    }

    if (this.frameCallback) {
      cancelAnimationFrame(this.frameCallback);
      this.frameCallback = null;
    }
  }

  /**
   * Count frames using requestAnimationFrame
   */
  private countFrames(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;

    this.frameCount++;
    this.totalFrames++;

    // Check for dropped frames (assuming 60fps target = 16.67ms per frame)
    const expectedFrames = delta / 16.67;
    if (expectedFrames > 1.5) {
      this.droppedFrames += Math.floor(expectedFrames) - 1;
    }

    this.lastFrameTime = now;
    this.frameCallback = requestAnimationFrame(() => this.countFrames());
  }

  /**
   * Take a performance measurement
   */
  private measure(): void {
    const snapshot = this.captureSnapshot();
    this.history.push(snapshot);

    // Trim history
    if (this.history.length > this.config.historySize) {
      this.history = this.history.slice(-this.config.historySize);
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(snapshot));

    // Check thresholds and potentially adapt quality
    this.checkThresholds(snapshot);

    if (this.config.adaptiveQuality) {
      this.adaptQuality(snapshot);
    }

    // Reset frame count for next interval
    this.frameCount = 0;
    this.droppedFrames = 0;
  }

  /**
   * Capture current performance snapshot
   */
  private captureSnapshot(): PerformanceSnapshot {
    const fps = (this.frameCount * 1000) / this.config.measurementInterval;
    const frameTime = this.frameCount > 0 ? this.config.measurementInterval / this.frameCount : 0;

    // Get memory info if available
    let memoryUsage: number | null = null;
    let jsHeapSize: number | null = null;

    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as Performance & { memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
      } }).memory;
      if (memory) {
        jsHeapSize = memory.usedJSHeapSize;
        memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
      }
    }

    return {
      timestamp: Date.now(),
      fps: Math.round(fps * 10) / 10,
      frameTime: Math.round(frameTime * 100) / 100,
      memoryUsage,
      jsHeapSize,
      latency: 0, // Would be set by pipeline
      droppedFrames: this.droppedFrames,
      renderTime: 0, // Would be set by renderer
      pipelineTime: 0, // Would be set by pipeline
    };
  }

  /**
   * Check performance thresholds and emit warnings
   */
  private checkThresholds(snapshot: PerformanceSnapshot): void {
    const { thresholds, onPerformanceWarning } = this.config;

    if (snapshot.fps < thresholds.minFPS) {
      onPerformanceWarning?.('fps', snapshot.fps, thresholds.minFPS);
    }

    if (snapshot.frameTime > thresholds.maxFrameTime) {
      onPerformanceWarning?.('frameTime', snapshot.frameTime, thresholds.maxFrameTime);
    }

    if (snapshot.memoryUsage !== null && snapshot.memoryUsage > thresholds.maxMemoryMB) {
      onPerformanceWarning?.('memory', snapshot.memoryUsage, thresholds.maxMemoryMB);
    }

    const droppedPercent = this.totalFrames > 0
      ? (this.droppedFrames / this.totalFrames) * 100
      : 0;

    if (droppedPercent > thresholds.maxDroppedFramesPercent) {
      onPerformanceWarning?.('droppedFrames', droppedPercent, thresholds.maxDroppedFramesPercent);
    }
  }

  /**
   * Adapt quality based on performance
   */
  private adaptQuality(snapshot: PerformanceSnapshot): void {
    const { thresholds } = this.config;

    // Calculate performance score (0-1)
    const fpsScore = Math.min(snapshot.fps / this.config.targetFPS, 1);
    const frameTimeScore = Math.max(1 - snapshot.frameTime / (thresholds.maxFrameTime * 2), 0);
    const overallScore = (fpsScore + frameTimeScore) / 2;

    // Determine if quality change is needed
    const currentLevel = QUALITY_LEVELS[this.currentQualityIndex];

    if (overallScore < 0.5 && this.currentQualityIndex > 0) {
      // Performance is poor, reduce quality
      this.setQualityLevel(this.currentQualityIndex - 1);
    } else if (overallScore > 0.9 && this.currentQualityIndex < QUALITY_LEVELS.length - 1) {
      // Performance is excellent, try higher quality
      // But only increase quality gradually over multiple good measurements
      const recentHistory = this.history.slice(-5);
      const avgScore = recentHistory.reduce((sum, s) => {
        const fps = Math.min(s.fps / this.config.targetFPS, 1);
        const ft = Math.max(1 - s.frameTime / (thresholds.maxFrameTime * 2), 0);
        return sum + (fps + ft) / 2;
      }, 0) / recentHistory.length;

      if (avgScore > 0.85) {
        this.setQualityLevel(this.currentQualityIndex + 1);
      }
    }
  }

  /**
   * Set quality level
   */
  setQualityLevel(index: number): void {
    if (index < 0 || index >= QUALITY_LEVELS.length) return;
    if (index === this.currentQualityIndex) return;

    this.currentQualityIndex = index;
    const level = QUALITY_LEVELS[index];

    this.config.onQualityChange?.(level);
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): QualityLevel {
    return QUALITY_LEVELS[this.currentQualityIndex];
  }

  /**
   * Get all quality levels
   */
  getQualityLevels(): QualityLevel[] {
    return [...QUALITY_LEVELS];
  }

  /**
   * Get performance history
   */
  getHistory(): PerformanceSnapshot[] {
    return [...this.history];
  }

  /**
   * Get average metrics over recent history
   */
  getAverageMetrics(samples: number = 10): Partial<PerformanceSnapshot> {
    const recent = this.history.slice(-samples);
    if (recent.length === 0) {
      return {};
    }

    return {
      fps: recent.reduce((sum, s) => sum + s.fps, 0) / recent.length,
      frameTime: recent.reduce((sum, s) => sum + s.frameTime, 0) / recent.length,
      memoryUsage: recent[0].memoryUsage !== null
        ? recent.reduce((sum, s) => sum + (s.memoryUsage || 0), 0) / recent.length
        : null,
      droppedFrames: recent.reduce((sum, s) => sum + s.droppedFrames, 0),
    };
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(callback: (snapshot: PerformanceSnapshot) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Record external timing (e.g., render time from Three.js)
   */
  recordTiming(metric: 'renderTime' | 'pipelineTime' | 'latency', value: number): void {
    if (this.history.length > 0) {
      const latest = this.history[this.history.length - 1];
      latest[metric] = value;
    }
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as Window & { gc: () => void }).gc();
    }
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
}

// Singleton instance
let performanceOptimizer: PerformanceOptimizer | null = null;

/**
 * Get the singleton PerformanceOptimizer
 */
export function getPerformanceOptimizer(): PerformanceOptimizer {
  if (!performanceOptimizer) {
    performanceOptimizer = new PerformanceOptimizer();
  }
  return performanceOptimizer;
}

/**
 * Create a new PerformanceOptimizer with custom config
 */
export function createPerformanceOptimizer(
  config?: Partial<OptimizerConfig>
): PerformanceOptimizer {
  performanceOptimizer = new PerformanceOptimizer(config);
  return performanceOptimizer;
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  // Fallback to setTimeout
  return setTimeout(() => callback({
    didTimeout: false,
    timeRemaining: () => 50,
  }), 1) as unknown as number;
}

/**
 * Cancel idle callback with fallback
 */
export function cancelIdleCallback(handle: number): void {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Debounce a function for performance
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle a function for performance
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRun >= limit) {
      fn(...args);
      lastRun = now;
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        fn(...args);
        lastRun = Date.now();
        timeoutId = null;
      }, limit - (now - lastRun));
    }
  };
}

/**
 * Batch DOM reads and writes for performance
 */
export class DOMBatcher {
  private reads: Array<() => void> = [];
  private writes: Array<() => void> = [];
  private scheduled = false;

  read(fn: () => void): void {
    this.reads.push(fn);
    this.schedule();
  }

  write(fn: () => void): void {
    this.writes.push(fn);
    this.schedule();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;

    requestAnimationFrame(() => {
      // Execute all reads first
      const reads = this.reads;
      this.reads = [];
      reads.forEach((fn) => fn());

      // Then execute all writes
      const writes = this.writes;
      this.writes = [];
      writes.forEach((fn) => fn());

      this.scheduled = false;
    });
  }
}

// Singleton DOM batcher
export const domBatcher = new DOMBatcher();
