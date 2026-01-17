'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getOfflineManager,
  cacheFetch,
  networkFirstFetch,
  type NetworkStatus,
  type QueuedOperation,
} from './offlineManager';

/**
 * Hook to get network status
 */
export function useNetworkStatus(): {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlow: boolean;
} {
  const manager = getOfflineManager();
  const [status, setStatus] = useState<NetworkStatus>(manager.getNetworkStatus());

  useEffect(() => {
    return manager.onNetworkChange(setStatus);
  }, [manager]);

  return useMemo(
    () => ({
      status,
      isOnline: status === 'online',
      isOffline: status === 'offline',
      isSlow: status === 'slow',
    }),
    [status]
  );
}

/**
 * Hook to manage offline data caching
 */
export function useOfflineCache<T>(
  key: string,
  options?: {
    ttl?: number;
    onExpire?: () => void;
  }
): {
  data: T | null;
  setData: (data: T) => void;
  clearData: () => void;
  isCached: boolean;
} {
  const manager = getOfflineManager();
  const [data, setDataState] = useState<T | null>(() => manager.getCached<T>(key));

  useEffect(() => {
    // Re-read on key change
    setDataState(manager.getCached<T>(key));
  }, [manager, key]);

  const setData = useCallback(
    (newData: T) => {
      manager.cache(key, newData, options?.ttl);
      setDataState(newData);
    },
    [manager, key, options?.ttl]
  );

  const clearData = useCallback(() => {
    manager.removeCached(key);
    setDataState(null);
  }, [manager, key]);

  return {
    data,
    setData,
    clearData,
    isCached: data !== null,
  };
}

/**
 * Hook for offline-first data fetching
 */
export function useOfflineFetch<T>(
  url: string | null,
  options?: {
    cacheTTL?: number;
    strategy?: 'cache-first' | 'network-first';
    enabled?: boolean;
  }
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isFromCache: boolean;
  refetch: () => Promise<void>;
} {
  const { cacheTTL, strategy = 'network-first', enabled = true } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchFn = strategy === 'cache-first' ? cacheFetch : networkFirstFetch;
      const result = await fetchFn<T>(url, { cacheTTL });
      setData(result);
      setIsFromCache(false);
    } catch (err) {
      // Try to get from cache as fallback
      const manager = getOfflineManager();
      const cached = manager.getCached<T>(`fetch_${url}`);
      if (cached) {
        setData(cached);
        setIsFromCache(true);
      } else {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [url, cacheTTL, strategy, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isFromCache,
    refetch: fetchData,
  };
}

/**
 * Hook for queuing operations when offline
 */
export function useOfflineQueue(): {
  queue: QueuedOperation[];
  pendingCount: number;
  queueOperation: (type: string, payload: unknown) => string;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  clearCompleted: () => void;
} {
  const manager = getOfflineManager();
  const [queue, setQueue] = useState<QueuedOperation[]>(manager.getQueuedOperations());

  // Update queue state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(manager.getQueuedOperations());
    }, 1000);

    return () => clearInterval(interval);
  }, [manager]);

  const queueOperation = useCallback(
    (type: string, payload: unknown) => {
      const id = manager.queueOperation(type, payload);
      setQueue(manager.getQueuedOperations());
      return id;
    },
    [manager]
  );

  const syncNow = useCallback(async () => {
    const result = await manager.forceSync();
    setQueue(manager.getQueuedOperations());
    return result;
  }, [manager]);

  const clearCompleted = useCallback(() => {
    manager.clearCompleted();
    setQueue(manager.getQueuedOperations());
  }, [manager]);

  return {
    queue,
    pendingCount: queue.filter((op) => op.status === 'pending').length,
    queueOperation,
    syncNow,
    clearCompleted,
  };
}

/**
 * Hook for offline-aware mutations
 */
export function useOfflineMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    queueType?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    onQueued?: (operationId: string) => void;
  }
): {
  mutate: (variables: V) => Promise<T | null>;
  isLoading: boolean;
  error: Error | null;
  isQueued: boolean;
} {
  const manager = getOfflineManager();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isQueued, setIsQueued] = useState(false);

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      setIsQueued(false);

      if (!manager.isOnline() && options?.queueType) {
        // Queue for later sync
        const id = manager.queueOperation(options.queueType, variables);
        setIsQueued(true);
        setIsLoading(false);
        options?.onQueued?.(id);
        return null;
      }

      try {
        const result = await mutationFn(variables);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        options?.onError?.(error);

        // Queue if network error and queue type specified
        if (options?.queueType) {
          const id = manager.queueOperation(options.queueType, variables);
          setIsQueued(true);
          options?.onQueued?.(id);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [manager, mutationFn, options]
  );

  return {
    mutate,
    isLoading,
    error,
    isQueued,
  };
}

/**
 * Hook for cache statistics
 */
export function useCacheStats(): { count: number; size: number; sizeFormatted: string } {
  const manager = getOfflineManager();
  const [stats, setStats] = useState(manager.getCacheStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(manager.getCacheStats());
    }, 5000);

    return () => clearInterval(interval);
  }, [manager]);

  const sizeFormatted = useMemo(() => {
    const { size } = stats;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }, [stats]);

  return { ...stats, sizeFormatted };
}

/**
 * Hook for service worker registration
 */
export function useServiceWorker(swPath?: string): {
  isSupported: boolean;
  isRegistered: boolean;
  registration: ServiceWorkerRegistration | null;
  update: () => Promise<void>;
} {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!isSupported || !swPath) return;

    navigator.serviceWorker
      .register(swPath)
      .then((reg) => {
        setRegistration(reg);
        setIsRegistered(true);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Registration failed:', error);
      });
  }, [isSupported, swPath]);

  const update = useCallback(async () => {
    if (registration) {
      await registration.update();
    }
  }, [registration]);

  return {
    isSupported,
    isRegistered,
    registration,
    update,
  };
}

/**
 * Hook for online/offline indicator component
 */
export function useOnlineIndicator(): {
  showIndicator: boolean;
  message: string;
  variant: 'success' | 'warning' | 'error';
} {
  const { status, isOnline, isOffline, isSlow } = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);

  useEffect(() => {
    if (status !== prevStatus) {
      setShowIndicator(true);
      setPrevStatus(status);

      // Hide indicator after 3 seconds if online
      if (status === 'online') {
        const timer = setTimeout(() => setShowIndicator(false), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [status, prevStatus]);

  let message = '';
  let variant: 'success' | 'warning' | 'error' = 'success';

  if (isOffline) {
    message = 'You are offline. Changes will be synced when reconnected.';
    variant = 'error';
  } else if (isSlow) {
    message = 'Slow network detected. Some features may be delayed.';
    variant = 'warning';
  } else if (isOnline && prevStatus !== 'online') {
    message = 'Back online! Syncing changes...';
    variant = 'success';
  }

  return { showIndicator, message, variant };
}
