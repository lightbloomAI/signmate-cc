/**
 * Offline Support Manager for SignMate
 *
 * Provides offline capability detection, data caching, and sync
 * for resilient operation during live events.
 */

/**
 * Network status
 */
export type NetworkStatus = 'online' | 'offline' | 'slow' | 'unknown';

/**
 * Sync status for queued operations
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

/**
 * Cached data entry
 */
export interface CachedEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number | null;
  version: number;
}

/**
 * Queued operation for offline sync
 */
export interface QueuedOperation {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: SyncStatus;
}

/**
 * Offline manager configuration
 */
export interface OfflineConfig {
  cachePrefix: string;
  defaultTTL: number;
  maxCacheSize: number;
  maxQueueSize: number;
  syncInterval: number;
  onNetworkChange?: (status: NetworkStatus) => void;
  onSyncComplete?: (synced: number, failed: number) => void;
}

const DEFAULT_CONFIG: OfflineConfig = {
  cachePrefix: 'signmate_',
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxQueueSize: 100,
  syncInterval: 30000, // 30 seconds
};

/**
 * Offline Manager
 *
 * Manages offline data caching, operation queueing, and background sync.
 */
export class OfflineManager {
  private config: OfflineConfig;
  private networkStatus: NetworkStatus = 'unknown';
  private operationQueue: QueuedOperation[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private networkListeners: Set<(status: NetworkStatus) => void> = new Set();
  private storage: Storage | null = null;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
  }

  /**
   * Initialize offline manager
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    // Initialize storage
    this.storage = window.localStorage;

    // Load queued operations
    this.loadQueue();

    // Setup network monitoring
    this.setupNetworkMonitoring();

    // Initial network check
    this.checkNetworkStatus();

    // Start sync interval if online
    if (navigator.onLine) {
      this.startSyncInterval();
    }
  }

  /**
   * Setup network event listeners
   */
  private setupNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.setNetworkStatus('online');
      this.startSyncInterval();
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.setNetworkStatus('offline');
      this.stopSyncInterval();
    });
  }

  /**
   * Check current network status
   */
  async checkNetworkStatus(): Promise<NetworkStatus> {
    if (typeof navigator === 'undefined') {
      return this.networkStatus;
    }

    if (!navigator.onLine) {
      this.setNetworkStatus('offline');
      return 'offline';
    }

    // Try to fetch a small resource to verify connectivity
    try {
      const start = Date.now();
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const latency = Date.now() - start;

      if (response.ok) {
        // Consider > 2000ms as "slow"
        this.setNetworkStatus(latency > 2000 ? 'slow' : 'online');
      } else {
        this.setNetworkStatus('online');
      }
    } catch {
      // Network request failed, but browser says online
      this.setNetworkStatus('slow');
    }

    return this.networkStatus;
  }

  /**
   * Set network status and notify listeners
   */
  private setNetworkStatus(status: NetworkStatus): void {
    if (status === this.networkStatus) return;

    this.networkStatus = status;
    this.config.onNetworkChange?.(status);
    this.networkListeners.forEach((listener) => listener(status));
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return this.networkStatus === 'online' || this.networkStatus === 'slow';
  }

  /**
   * Subscribe to network status changes
   */
  onNetworkChange(callback: (status: NetworkStatus) => void): () => void {
    this.networkListeners.add(callback);
    return () => this.networkListeners.delete(callback);
  }

  // ==================== CACHING ====================

  /**
   * Cache data with optional TTL
   */
  cache<T>(key: string, data: T, ttl?: number): void {
    if (!this.storage) return;

    const entry: CachedEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
      version: 1,
    };

    try {
      const fullKey = this.config.cachePrefix + key;
      this.storage.setItem(fullKey, JSON.stringify(entry));
    } catch (error) {
      // Storage quota exceeded - clear old entries
      this.clearExpiredCache();
      try {
        const fullKey = this.config.cachePrefix + key;
        this.storage.setItem(fullKey, JSON.stringify(entry));
      } catch {
        console.error('[OfflineManager] Cache storage failed:', error);
      }
    }
  }

  /**
   * Get cached data
   */
  getCached<T>(key: string): T | null {
    if (!this.storage) return null;

    try {
      const fullKey = this.config.cachePrefix + key;
      const raw = this.storage.getItem(fullKey);
      if (!raw) return null;

      const entry: CachedEntry<T> = JSON.parse(raw);

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.storage.removeItem(fullKey);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  /**
   * Check if key is cached and valid
   */
  isCached(key: string): boolean {
    return this.getCached(key) !== null;
  }

  /**
   * Remove cached data
   */
  removeCached(key: string): void {
    if (!this.storage) return;
    this.storage.removeItem(this.config.cachePrefix + key);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    if (!this.storage) return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.config.cachePrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => this.storage?.removeItem(key));
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    if (!this.storage) return;

    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(this.config.cachePrefix)) continue;

      try {
        const raw = this.storage.getItem(key);
        if (!raw) continue;

        const entry: CachedEntry = JSON.parse(raw);
        if (entry.expiresAt && entry.expiresAt < now) {
          keysToRemove.push(key);
        }
      } catch {
        // Invalid entry, remove it
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => this.storage?.removeItem(key));
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { count: number; size: number } {
    if (!this.storage) return { count: 0, size: 0 };

    let count = 0;
    let size = 0;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key?.startsWith(this.config.cachePrefix)) continue;

      const value = this.storage.getItem(key);
      if (value) {
        count++;
        size += value.length * 2; // UTF-16 characters
      }
    }

    return { count, size };
  }

  // ==================== OPERATION QUEUE ====================

  /**
   * Queue an operation for later sync
   */
  queueOperation(type: string, payload: unknown, maxRetries = 3): string {
    const operation: QueuedOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries,
      status: 'pending',
    };

    // Limit queue size
    if (this.operationQueue.length >= this.config.maxQueueSize) {
      // Remove oldest completed/failed operations first
      const toRemove = this.operationQueue.find(
        (op) => op.status === 'synced' || op.status === 'failed'
      );
      if (toRemove) {
        this.operationQueue = this.operationQueue.filter((op) => op.id !== toRemove.id);
      } else {
        // Remove oldest pending operation
        this.operationQueue.shift();
      }
    }

    this.operationQueue.push(operation);
    this.saveQueue();

    // Try to sync immediately if online
    if (this.isOnline()) {
      this.syncOperation(operation);
    }

    return operation.id;
  }

  /**
   * Get queued operations
   */
  getQueuedOperations(): QueuedOperation[] {
    return [...this.operationQueue];
  }

  /**
   * Get pending operation count
   */
  getPendingCount(): number {
    return this.operationQueue.filter((op) => op.status === 'pending').length;
  }

  /**
   * Clear completed operations from queue
   */
  clearCompleted(): void {
    this.operationQueue = this.operationQueue.filter(
      (op) => op.status !== 'synced' && op.status !== 'failed'
    );
    this.saveQueue();
  }

  /**
   * Save queue to storage
   */
  private saveQueue(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        this.config.cachePrefix + '_queue',
        JSON.stringify(this.operationQueue)
      );
    } catch (error) {
      console.error('[OfflineManager] Failed to save queue:', error);
    }
  }

  /**
   * Load queue from storage
   */
  private loadQueue(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(this.config.cachePrefix + '_queue');
      if (raw) {
        this.operationQueue = JSON.parse(raw);
      }
    } catch {
      this.operationQueue = [];
    }
  }

  // ==================== SYNC ====================

  /**
   * Sync all pending operations
   */
  async syncQueue(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline()) {
      return { synced: 0, failed: 0 };
    }

    const pending = this.operationQueue.filter((op) => op.status === 'pending');
    let synced = 0;
    let failed = 0;

    for (const operation of pending) {
      const success = await this.syncOperation(operation);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }

    this.saveQueue();
    this.config.onSyncComplete?.(synced, failed);

    return { synced, failed };
  }

  /**
   * Sync a single operation
   */
  private async syncOperation(operation: QueuedOperation): Promise<boolean> {
    operation.status = 'syncing';
    this.saveQueue();

    try {
      // Attempt to sync via API
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: operation.type,
          payload: operation.payload,
          timestamp: operation.timestamp,
        }),
      });

      if (response.ok) {
        operation.status = 'synced';
        return true;
      }

      throw new Error(`Sync failed: ${response.status}`);
    } catch (error) {
      operation.retries++;

      if (operation.retries >= operation.maxRetries) {
        operation.status = 'failed';
      } else {
        operation.status = 'pending';
      }

      console.error('[OfflineManager] Sync operation failed:', error);
      return false;
    }
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.isOnline() && this.getPendingCount() > 0) {
        this.syncQueue();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop sync interval
   */
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<{ synced: number; failed: number }> {
    await this.checkNetworkStatus();
    return this.syncQueue();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopSyncInterval();
    this.networkListeners.clear();
  }
}

// Singleton instance
let offlineManager: OfflineManager | null = null;

/**
 * Get the singleton OfflineManager
 */
export function getOfflineManager(): OfflineManager {
  if (!offlineManager) {
    offlineManager = new OfflineManager();
  }
  return offlineManager;
}

/**
 * Create a new OfflineManager with custom config
 */
export function createOfflineManager(
  config?: Partial<OfflineConfig>
): OfflineManager {
  offlineManager = new OfflineManager(config);
  return offlineManager;
}

/**
 * Utility: Cache-first fetch strategy
 */
export async function cacheFetch<T>(
  url: string,
  options?: RequestInit & { cacheTTL?: number }
): Promise<T> {
  const manager = getOfflineManager();
  const cacheKey = `fetch_${url}`;

  // Try cache first if offline
  if (!manager.isOnline()) {
    const cached = manager.getCached<T>(cacheKey);
    if (cached) {
      return cached;
    }
    throw new Error('Offline and no cached data available');
  }

  // Try network first
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Cache the successful response
    manager.cache(cacheKey, data, options?.cacheTTL);

    return data;
  } catch (error) {
    // Network failed, try cache
    const cached = manager.getCached<T>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Utility: Network-first fetch strategy
 */
export async function networkFirstFetch<T>(
  url: string,
  options?: RequestInit & { cacheTTL?: number; timeout?: number }
): Promise<T> {
  const manager = getOfflineManager();
  const cacheKey = `fetch_${url}`;
  const timeout = options?.timeout || 5000;

  // Try network with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    manager.cache(cacheKey, data, options?.cacheTTL);

    return data;
  } catch (error) {
    // Fallback to cache
    const cached = manager.getCached<T>(cacheKey);
    if (cached) {
      return cached;
    }
    throw error;
  }
}
