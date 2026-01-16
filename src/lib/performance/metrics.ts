/**
 * Performance metrics collection and monitoring for SignMate pipeline
 */

export interface PipelineMetrics {
  // Latency measurements (ms)
  audioToSpeech: number;
  speechToTranslation: number;
  translationToRender: number;
  totalLatency: number;

  // Throughput
  wordsPerMinute: number;
  signsPerMinute: number;

  // Resource usage
  memoryUsageMB: number;
  cpuUsagePercent: number;

  // Quality metrics
  speechConfidence: number;
  translationCoverage: number;

  // Timestamps
  timestamp: number;
  sessionDuration: number;
}

export interface MetricsSample {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export type MetricsCallback = (metrics: PipelineMetrics) => void;

class PerformanceMonitor {
  private samples: Map<string, MetricsSample[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  private sessionStartTime: number = 0;
  private callbacks: Set<MetricsCallback> = new Set();

  // Rolling window for averages
  private windowSize = 30;

  // Current metrics state
  private currentMetrics: PipelineMetrics = this.getEmptyMetrics();

  constructor() {
    this.sessionStartTime = Date.now();
  }

  // Start timing an operation
  startTimer(name: string): void {
    this.startTimes.set(name, performance.now());
  }

  // End timing and record the measurement
  endTimer(name: string, tags?: Record<string, string>): number {
    const startTime = this.startTimes.get(name);
    if (!startTime) {
      console.warn(`No start time found for timer: ${name}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(name);

    this.recordSample(name, duration, tags);
    return duration;
  }

  // Record a metric sample
  recordSample(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.samples.has(name)) {
      this.samples.set(name, []);
    }

    const samples = this.samples.get(name)!;
    samples.push({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });

    // Keep only recent samples
    if (samples.length > this.windowSize * 2) {
      this.samples.set(name, samples.slice(-this.windowSize));
    }

    // Update current metrics
    this.updateCurrentMetrics();
  }

  // Get average of recent samples
  getAverage(name: string): number {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) return 0;

    const recentSamples = samples.slice(-this.windowSize);
    const sum = recentSamples.reduce((acc, s) => acc + s.value, 0);
    return sum / recentSamples.length;
  }

  // Get latest sample value
  getLatest(name: string): number {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) return 0;
    return samples[samples.length - 1].value;
  }

  // Get min/max over window
  getMinMax(name: string): { min: number; max: number } {
    const samples = this.samples.get(name);
    if (!samples || samples.length === 0) return { min: 0, max: 0 };

    const recentSamples = samples.slice(-this.windowSize);
    const values = recentSamples.map((s) => s.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  // Subscribe to metrics updates
  subscribe(callback: MetricsCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Get current metrics snapshot
  getMetrics(): PipelineMetrics {
    return { ...this.currentMetrics };
  }

  // Update and broadcast metrics
  private updateCurrentMetrics(): void {
    const now = Date.now();

    this.currentMetrics = {
      audioToSpeech: this.getAverage('audio_to_speech'),
      speechToTranslation: this.getAverage('speech_to_translation'),
      translationToRender: this.getAverage('translation_to_render'),
      totalLatency:
        this.getAverage('audio_to_speech') +
        this.getAverage('speech_to_translation') +
        this.getAverage('translation_to_render'),

      wordsPerMinute: this.getAverage('words_per_minute'),
      signsPerMinute: this.getAverage('signs_per_minute'),

      memoryUsageMB: this.getMemoryUsage(),
      cpuUsagePercent: 0, // Not available in browser

      speechConfidence: this.getAverage('speech_confidence'),
      translationCoverage: this.getAverage('translation_coverage'),

      timestamp: now,
      sessionDuration: now - this.sessionStartTime,
    };

    // Notify subscribers
    this.callbacks.forEach((cb) => {
      try {
        cb(this.currentMetrics);
      } catch (e) {
        console.error('Metrics callback error:', e);
      }
    });
  }

  private getMemoryUsage(): number {
    // @ts-expect-error - memory property may not be available
    if (performance.memory) {
      // @ts-expect-error - memory property may not be available
      return performance.memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  private getEmptyMetrics(): PipelineMetrics {
    return {
      audioToSpeech: 0,
      speechToTranslation: 0,
      translationToRender: 0,
      totalLatency: 0,
      wordsPerMinute: 0,
      signsPerMinute: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
      speechConfidence: 0,
      translationCoverage: 0,
      timestamp: Date.now(),
      sessionDuration: 0,
    };
  }

  // Reset all metrics
  reset(): void {
    this.samples.clear();
    this.startTimes.clear();
    this.sessionStartTime = Date.now();
    this.currentMetrics = this.getEmptyMetrics();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export function startTimer(name: string): void {
  performanceMonitor.startTimer(name);
}

export function endTimer(name: string, tags?: Record<string, string>): number {
  return performanceMonitor.endTimer(name, tags);
}

export function recordMetric(
  name: string,
  value: number,
  tags?: Record<string, string>
): void {
  performanceMonitor.recordSample(name, value, tags);
}
