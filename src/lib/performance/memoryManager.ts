/**
 * Memory management utilities for long-running SignMate sessions
 */

export interface MemoryConfig {
  // Thresholds in MB
  warningThreshold: number;
  criticalThreshold: number;
  // Check interval in ms
  checkInterval: number;
  // Enable auto cleanup
  autoCleanup: boolean;
}

const defaultConfig: MemoryConfig = {
  warningThreshold: 150,
  criticalThreshold: 250,
  checkInterval: 30000,
  autoCleanup: true,
};

export type MemoryWarningCallback = (level: 'warning' | 'critical', usageMB: number) => void;

class MemoryManager {
  private config: MemoryConfig;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private cleanupCallbacks: Set<() => void> = new Set();
  private warningCallbacks: Set<MemoryWarningCallback> = new Set();
  private lastWarningLevel: 'none' | 'warning' | 'critical' = 'none';

  constructor(config: Partial<MemoryConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  start(): void {
    if (this.checkIntervalId) return;

    this.checkIntervalId = setInterval(() => {
      this.checkMemory();
    }, this.config.checkInterval);

    // Initial check
    this.checkMemory();
  }

  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  private checkMemory(): void {
    const usage = this.getMemoryUsage();
    if (usage === 0) return; // Memory API not available

    if (usage >= this.config.criticalThreshold) {
      if (this.lastWarningLevel !== 'critical') {
        this.lastWarningLevel = 'critical';
        this.notifyWarning('critical', usage);

        if (this.config.autoCleanup) {
          this.performCleanup();
        }
      }
    } else if (usage >= this.config.warningThreshold) {
      if (this.lastWarningLevel === 'none') {
        this.lastWarningLevel = 'warning';
        this.notifyWarning('warning', usage);
      }
    } else {
      this.lastWarningLevel = 'none';
    }
  }

  private getMemoryUsage(): number {
    // @ts-expect-error - memory property may not be available
    if (typeof performance !== 'undefined' && performance.memory) {
      // @ts-expect-error - memory property may not be available
      return performance.memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  private notifyWarning(level: 'warning' | 'critical', usageMB: number): void {
    this.warningCallbacks.forEach((cb) => {
      try {
        cb(level, usageMB);
      } catch (e) {
        console.error('Memory warning callback error:', e);
      }
    });
  }

  private performCleanup(): void {
    console.log('Performing memory cleanup...');

    // Call registered cleanup callbacks
    this.cleanupCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Cleanup callback error:', e);
      }
    });

    // Hint to garbage collector (if available)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        // @ts-expect-error - gc may not be available
        window.gc();
      } catch {
        // GC not exposed
      }
    }
  }

  // Register a cleanup callback
  registerCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  // Subscribe to memory warnings
  onWarning(callback: MemoryWarningCallback): () => void {
    this.warningCallbacks.add(callback);
    return () => this.warningCallbacks.delete(callback);
  }

  // Force cleanup
  forceCleanup(): void {
    this.performCleanup();
  }

  // Get current memory stats
  getStats(): {
    usedMB: number;
    totalMB: number;
    percentUsed: number;
    level: 'normal' | 'warning' | 'critical';
  } {
    const used = this.getMemoryUsage();
    // @ts-expect-error - memory property may not be available
    const total = performance.memory?.jsHeapSizeLimit / (1024 * 1024) || 0;

    let level: 'normal' | 'warning' | 'critical' = 'normal';
    if (used >= this.config.criticalThreshold) {
      level = 'critical';
    } else if (used >= this.config.warningThreshold) {
      level = 'warning';
    }

    return {
      usedMB: used,
      totalMB: total,
      percentUsed: total > 0 ? (used / total) * 100 : 0,
      level,
    };
  }

  configure(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

/**
 * Object pool for reusing expensive objects
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;
  private maxSize: number;

  constructor(options: {
    factory: () => T;
    reset?: (obj: T) => void;
    initialSize?: number;
    maxSize?: number;
  }) {
    this.factory = options.factory;
    this.reset = options.reset || (() => {});
    this.maxSize = options.maxSize || 100;

    // Pre-populate pool
    const initialSize = options.initialSize || 0;
    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
    } else {
      obj = this.factory();
    }

    this.inUse.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('Attempting to release object not in use');
      return;
    }

    this.inUse.delete(obj);
    this.reset(obj);

    if (this.available.length < this.maxSize) {
      this.available.push(obj);
    }
  }

  releaseAll(): void {
    this.inUse.forEach((obj) => {
      this.reset(obj);
      if (this.available.length < this.maxSize) {
        this.available.push(obj);
      }
    });
    this.inUse.clear();
  }

  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }

  clear(): void {
    this.available = [];
    this.inUse.clear();
  }
}

/**
 * LRU Cache with memory-aware eviction
 */
export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // For memory cleanup
  evict(count: number): void {
    const keys = Array.from(this.cache.keys()).slice(0, count);
    keys.forEach((key) => this.cache.delete(key));
  }
}
