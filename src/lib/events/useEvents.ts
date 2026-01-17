'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getEventBus,
  type SignMateEvent,
  type EventListener,
  type SubscriptionOptions,
  type SignMateEventType,
  SignMateEvents,
} from './eventBus';

/**
 * Hook to subscribe to an event
 */
export function useEvent<T>(
  type: string | SignMateEventType,
  handler: EventListener<T>,
  options?: SubscriptionOptions
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventBus = getEventBus();

    return eventBus.on<T>(
      type,
      (event) => handlerRef.current(event),
      options
    );
  }, [type, options]);
}

/**
 * Hook to subscribe to multiple events
 */
export function useEvents<T>(
  types: Array<string | SignMateEventType>,
  handler: EventListener<T>,
  options?: SubscriptionOptions
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventBus = getEventBus();

    const unsubscribes = types.map((type) =>
      eventBus.on<T>(
        type,
        (event) => handlerRef.current(event),
        options
      )
    );

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [types, options]);
}

/**
 * Hook to emit events
 */
export function useEmit() {
  const emit = useCallback(
    <T>(type: string | SignMateEventType, payload: T) => {
      getEventBus().emit(type, payload);
    },
    []
  );

  return emit;
}

/**
 * Hook for event-driven state
 */
export function useEventState<T>(
  type: string | SignMateEventType,
  initialValue: T
): T {
  const [state, setState] = useState<T>(initialValue);

  useEvent<T>(type, (event) => {
    setState(event.payload);
  });

  return state;
}

/**
 * Hook for accumulating event payloads
 */
export function useEventAccumulator<T>(
  type: string | SignMateEventType,
  options?: { maxItems?: number; resetOnUnmount?: boolean }
): {
  items: T[];
  clear: () => void;
  count: number;
} {
  const { maxItems = 100 } = options || {};
  const [items, setItems] = useState<T[]>([]);

  useEvent<T>(type, (event) => {
    setItems((prev) => {
      const next = [...prev, event.payload];
      return next.slice(-maxItems);
    });
  });

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    clear,
    count: items.length,
  };
}

/**
 * Hook to get latest event
 */
export function useLatestEvent<T>(
  type: string | SignMateEventType
): SignMateEvent<T> | null {
  const [event, setEvent] = useState<SignMateEvent<T> | null>(null);

  useEffect(() => {
    const eventBus = getEventBus();

    // Get from history first
    const history = eventBus.getHistory(type);
    if (history.length > 0) {
      setEvent(history[history.length - 1] as SignMateEvent<T>);
    }

    return eventBus.on<T>(type, setEvent as EventListener<T>);
  }, [type]);

  return event;
}

/**
 * Hook for event history
 */
export function useEventHistory(type?: string): SignMateEvent[] {
  const [history, setHistory] = useState<SignMateEvent[]>([]);

  useEffect(() => {
    const eventBus = getEventBus();

    // Initial load
    setHistory(eventBus.getHistory(type));

    // Subscribe to updates
    const unsubscribe = eventBus.onAny(() => {
      setHistory(eventBus.getHistory(type));
    });

    return unsubscribe;
  }, [type]);

  return history;
}

/**
 * Hook for waiting for an event
 */
export function useAwaitEvent<T>(
  type: string | SignMateEventType
): {
  event: SignMateEvent<T> | null;
  isWaiting: boolean;
  wait: (timeout?: number) => Promise<SignMateEvent<T>>;
  reset: () => void;
} {
  const [event, setEvent] = useState<SignMateEvent<T> | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const wait = useCallback(
    async (timeout?: number): Promise<SignMateEvent<T>> => {
      setIsWaiting(true);
      try {
        const result = await getEventBus().waitFor<T>(type, undefined, timeout);
        setEvent(result);
        return result;
      } finally {
        setIsWaiting(false);
      }
    },
    [type]
  );

  const reset = useCallback(() => {
    setEvent(null);
  }, []);

  return { event, isWaiting, wait, reset };
}

/**
 * Hook for event counter
 */
export function useEventCounter(
  type: string | SignMateEventType,
  options?: { resetOnUnmount?: boolean }
): {
  count: number;
  reset: () => void;
} {
  const [count, setCount] = useState(0);

  useEvent(type, () => {
    setCount((c) => c + 1);
  });

  const reset = useCallback(() => {
    setCount(0);
  }, []);

  return { count, reset };
}

// ==================== SPECIALIZED HOOKS ====================

/**
 * Hook for pipeline events
 */
export function usePipelineEvents(handlers: {
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
}): void {
  useEvent(SignMateEvents.PIPELINE_START, handlers.onStart ? handlers.onStart : () => {});
  useEvent(SignMateEvents.PIPELINE_STOP, handlers.onStop ? handlers.onStop : () => {});
  useEvent(SignMateEvents.PIPELINE_PAUSE, handlers.onPause ? handlers.onPause : () => {});
  useEvent(SignMateEvents.PIPELINE_RESUME, handlers.onResume ? handlers.onResume : () => {});
  useEvent<{ error: Error }>(SignMateEvents.PIPELINE_ERROR, (event) => {
    handlers.onError?.(event.payload.error);
  });
}

/**
 * Hook for transcription events
 */
export function useTranscriptionEvents(): {
  transcript: string;
  interim: string;
  isTranscribing: boolean;
} {
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEvent(SignMateEvents.TRANSCRIPTION_START, () => {
    setIsTranscribing(true);
  });

  useEvent<{ text: string }>(SignMateEvents.TRANSCRIPTION_RESULT, (event) => {
    setTranscript((prev) => prev + ' ' + event.payload.text);
    setInterim('');
  });

  useEvent<{ text: string }>(SignMateEvents.TRANSCRIPTION_INTERIM, (event) => {
    setInterim(event.payload.text);
  });

  useEvent(SignMateEvents.TRANSCRIPTION_END, () => {
    setIsTranscribing(false);
  });

  return { transcript, interim, isTranscribing };
}

/**
 * Hook for connection events
 */
export function useConnectionEvents(): {
  isConnected: boolean;
  reconnectCount: number;
  lastError: Error | null;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  useEvent(SignMateEvents.CONNECTION_OPEN, () => {
    setIsConnected(true);
    setLastError(null);
  });

  useEvent(SignMateEvents.CONNECTION_CLOSE, () => {
    setIsConnected(false);
  });

  useEvent<{ error: Error }>(SignMateEvents.CONNECTION_ERROR, (event) => {
    setLastError(event.payload.error);
  });

  useEvent(SignMateEvents.CONNECTION_RECONNECT, () => {
    setReconnectCount((c) => c + 1);
  });

  return { isConnected, reconnectCount, lastError };
}

/**
 * Hook for session events
 */
export function useSessionEvents(): {
  isActive: boolean;
  isPaused: boolean;
} {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEvent(SignMateEvents.SESSION_START, () => {
    setIsActive(true);
    setIsPaused(false);
  });

  useEvent(SignMateEvents.SESSION_END, () => {
    setIsActive(false);
    setIsPaused(false);
  });

  useEvent(SignMateEvents.SESSION_PAUSE, () => {
    setIsPaused(true);
  });

  useEvent(SignMateEvents.SESSION_RESUME, () => {
    setIsPaused(false);
  });

  return { isActive, isPaused };
}

/**
 * Hook for system notifications via events
 */
export function useSystemNotifications(): Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}> {
  const [notifications, setNotifications] = useState<Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>>([]);

  useEvent<{ message: string }>(SignMateEvents.SYSTEM_ERROR, (event) => {
    setNotifications((prev) => [
      ...prev.slice(-9),
      { type: 'error', message: event.payload.message, timestamp: event.meta.timestamp },
    ]);
  });

  useEvent<{ message: string }>(SignMateEvents.SYSTEM_WARNING, (event) => {
    setNotifications((prev) => [
      ...prev.slice(-9),
      { type: 'warning', message: event.payload.message, timestamp: event.meta.timestamp },
    ]);
  });

  useEvent<{ message: string }>(SignMateEvents.SYSTEM_INFO, (event) => {
    setNotifications((prev) => [
      ...prev.slice(-9),
      { type: 'info', message: event.payload.message, timestamp: event.meta.timestamp },
    ]);
  });

  return notifications;
}
