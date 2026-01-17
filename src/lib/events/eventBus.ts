/**
 * Event Bus System for SignMate
 *
 * Provides a centralized event system for cross-component communication,
 * state synchronization, and decoupled architecture.
 */

/**
 * Event priority levels
 */
export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Event metadata
 */
export interface EventMeta {
  timestamp: number;
  source?: string;
  priority: EventPriority;
  correlationId?: string;
}

/**
 * Event payload with metadata
 */
export interface SignMateEvent<T = unknown> {
  type: string;
  payload: T;
  meta: EventMeta;
}

/**
 * Event listener callback
 */
export type EventListener<T = unknown> = (event: SignMateEvent<T>) => void | Promise<void>;

/**
 * Event filter function
 */
export type EventFilter<T = unknown> = (event: SignMateEvent<T>) => boolean;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  priority?: EventPriority;
  filter?: EventFilter;
  once?: boolean;
  debounce?: number;
  throttle?: number;
}

/**
 * Event bus configuration
 */
export interface EventBusConfig {
  maxListeners: number;
  maxHistorySize: number;
  enableHistory: boolean;
  enableLogging: boolean;
  asyncMode: boolean;
}

const DEFAULT_CONFIG: EventBusConfig = {
  maxListeners: 100,
  maxHistorySize: 100,
  enableHistory: true,
  enableLogging: process.env.NODE_ENV === 'development',
  asyncMode: true,
};

/**
 * Event Bus
 *
 * Central event dispatcher for application-wide events.
 */
export class EventBus {
  private config: EventBusConfig;
  private listeners = new Map<string, Set<{
    handler: EventListener;
    options: SubscriptionOptions;
    lastCall?: number;
    timeout?: ReturnType<typeof setTimeout>;
  }>>();
  private history: SignMateEvent[] = [];
  private wildcardListeners = new Set<{
    handler: EventListener;
    options: SubscriptionOptions;
  }>();

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Emit an event
   */
  emit<T>(type: string, payload: T, options?: Partial<EventMeta>): void {
    const event: SignMateEvent<T> = {
      type,
      payload,
      meta: {
        timestamp: Date.now(),
        priority: 'normal',
        ...options,
      },
    };

    // Log if enabled
    if (this.config.enableLogging) {
      console.log(`[EventBus] ${type}`, payload);
    }

    // Add to history
    if (this.config.enableHistory) {
      this.history.push(event as SignMateEvent);
      if (this.history.length > this.config.maxHistorySize) {
        this.history = this.history.slice(-this.config.maxHistorySize);
      }
    }

    // Notify specific listeners
    const eventListeners = this.listeners.get(type);
    if (eventListeners) {
      this.notifyListeners(event as SignMateEvent, eventListeners);
    }

    // Notify wildcard listeners
    this.notifyListeners(event as SignMateEvent, this.wildcardListeners);
  }

  /**
   * Notify listeners with debounce/throttle support
   */
  private notifyListeners(
    event: SignMateEvent,
    listeners: Set<{ handler: EventListener; options: SubscriptionOptions; lastCall?: number; timeout?: ReturnType<typeof setTimeout> }>
  ): void {
    // Sort by priority
    const sorted = Array.from(listeners).sort((a, b) => {
      const priorities = { critical: 0, high: 1, normal: 2, low: 3 };
      const aPriority = a.options.priority || 'normal';
      const bPriority = b.options.priority || 'normal';
      return priorities[aPriority] - priorities[bPriority];
    });

    const toRemove: typeof sorted = [];

    sorted.forEach((listener) => {
      const { handler, options } = listener;

      // Apply filter
      if (options.filter && !options.filter(event)) {
        return;
      }

      // Handle debounce
      if (options.debounce) {
        if (listener.timeout) {
          clearTimeout(listener.timeout);
        }
        listener.timeout = setTimeout(() => {
          this.invokeHandler(handler, event);
        }, options.debounce);
        return;
      }

      // Handle throttle
      if (options.throttle) {
        const now = Date.now();
        if (listener.lastCall && now - listener.lastCall < options.throttle) {
          return;
        }
        listener.lastCall = now;
      }

      // Invoke handler
      this.invokeHandler(handler, event);

      // Handle once
      if (options.once) {
        toRemove.push(listener);
      }
    });

    // Remove once listeners
    toRemove.forEach((listener) => listeners.delete(listener));
  }

  /**
   * Invoke a handler (sync or async)
   */
  private invokeHandler(handler: EventListener, event: SignMateEvent): void {
    if (this.config.asyncMode) {
      queueMicrotask(() => {
        try {
          handler(event);
        } catch (error) {
          console.error('[EventBus] Handler error:', error);
        }
      });
    } else {
      try {
        handler(event);
      } catch (error) {
        console.error('[EventBus] Handler error:', error);
      }
    }
  }

  /**
   * Subscribe to an event
   */
  on<T>(
    type: string,
    handler: EventListener<T>,
    options: SubscriptionOptions = {}
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const listeners = this.listeners.get(type)!;

    // Check max listeners
    if (listeners.size >= this.config.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this.config.maxListeners}) reached for '${type}'`);
    }

    const subscription = { handler: handler as EventListener, options };
    listeners.add(subscription);

    // Return unsubscribe function
    return () => {
      listeners.delete(subscription);
      if (listeners.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  /**
   * Subscribe to an event once
   */
  once<T>(type: string, handler: EventListener<T>, options: SubscriptionOptions = {}): () => void {
    return this.on(type, handler, { ...options, once: true });
  }

  /**
   * Subscribe to all events
   */
  onAny(handler: EventListener, options: SubscriptionOptions = {}): () => void {
    const subscription = { handler, options };
    this.wildcardListeners.add(subscription);

    return () => {
      this.wildcardListeners.delete(subscription);
    };
  }

  /**
   * Remove all listeners for an event type
   */
  off(type: string): void {
    this.listeners.delete(type);
  }

  /**
   * Remove all listeners
   */
  offAll(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Wait for an event (Promise-based)
   */
  waitFor<T>(
    type: string,
    filter?: EventFilter<T>,
    timeout?: number
  ): Promise<SignMateEvent<T>> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const unsubscribe = this.on<T>(
        type,
        (event) => {
          if (!filter || filter(event as SignMateEvent<T>)) {
            if (timeoutId) clearTimeout(timeoutId);
            unsubscribe();
            resolve(event as SignMateEvent<T>);
          }
        }
      );

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event '${type}'`));
        }, timeout);
      }
    });
  }

  /**
   * Get event history
   */
  getHistory(type?: string): SignMateEvent[] {
    if (type) {
      return this.history.filter((e) => e.type === type);
    }
    return [...this.history];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get listener count for an event type
   */
  listenerCount(type?: string): number {
    if (type) {
      return this.listeners.get(type)?.size || 0;
    }
    let count = 0;
    this.listeners.forEach((set) => (count += set.size));
    return count + this.wildcardListeners.size;
  }

  /**
   * Get all registered event types
   */
  getEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EventBusConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let eventBus: EventBus | null = null;

/**
 * Get the singleton EventBus
 */
export function getEventBus(): EventBus {
  if (!eventBus) {
    eventBus = new EventBus();
  }
  return eventBus;
}

/**
 * Create a new EventBus with custom config
 */
export function createEventBus(config?: Partial<EventBusConfig>): EventBus {
  return new EventBus(config);
}

// ==================== PREDEFINED EVENTS ====================

/**
 * SignMate event types
 */
export const SignMateEvents = {
  // Pipeline events
  PIPELINE_START: 'pipeline:start',
  PIPELINE_STOP: 'pipeline:stop',
  PIPELINE_PAUSE: 'pipeline:pause',
  PIPELINE_RESUME: 'pipeline:resume',
  PIPELINE_ERROR: 'pipeline:error',

  // Transcription events
  TRANSCRIPTION_START: 'transcription:start',
  TRANSCRIPTION_RESULT: 'transcription:result',
  TRANSCRIPTION_INTERIM: 'transcription:interim',
  TRANSCRIPTION_END: 'transcription:end',

  // Translation events
  TRANSLATION_START: 'translation:start',
  TRANSLATION_RESULT: 'translation:result',
  TRANSLATION_ERROR: 'translation:error',

  // Avatar events
  AVATAR_SIGN_START: 'avatar:sign:start',
  AVATAR_SIGN_END: 'avatar:sign:end',
  AVATAR_IDLE: 'avatar:idle',
  AVATAR_ERROR: 'avatar:error',

  // Connection events
  CONNECTION_OPEN: 'connection:open',
  CONNECTION_CLOSE: 'connection:close',
  CONNECTION_ERROR: 'connection:error',
  CONNECTION_RECONNECT: 'connection:reconnect',

  // Session events
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_PAUSE: 'session:pause',
  SESSION_RESUME: 'session:resume',

  // User events
  USER_ACTION: 'user:action',
  USER_SETTING_CHANGE: 'user:setting:change',

  // System events
  SYSTEM_ERROR: 'system:error',
  SYSTEM_WARNING: 'system:warning',
  SYSTEM_INFO: 'system:info',
} as const;

export type SignMateEventType = typeof SignMateEvents[keyof typeof SignMateEvents];

/**
 * Emit a typed SignMate event
 */
export function emitEvent<T>(
  type: SignMateEventType,
  payload: T,
  options?: Partial<EventMeta>
): void {
  getEventBus().emit(type, payload, options);
}

/**
 * Subscribe to a typed SignMate event
 */
export function onEvent<T>(
  type: SignMateEventType,
  handler: EventListener<T>,
  options?: SubscriptionOptions
): () => void {
  return getEventBus().on(type, handler, options);
}
