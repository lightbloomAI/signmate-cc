/**
 * Notification Manager for SignMate
 * Provides a centralized system for toast notifications and alerts
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 for persistent
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: number;
}

export interface NotificationConfig {
  position?: NotificationPosition;
  defaultDuration?: number;
  maxNotifications?: number;
}

type NotificationCallback = (notifications: Notification[]) => void;

const DEFAULT_CONFIG: Required<NotificationConfig> = {
  position: 'top-right',
  defaultDuration: 5000,
  maxNotifications: 5,
};

class NotificationManager {
  private notifications: Notification[] = [];
  private callbacks: Set<NotificationCallback> = new Set();
  private config: Required<NotificationConfig> = DEFAULT_CONFIG;
  private timeoutIds: Map<string, NodeJS.Timeout> = new Map();
  private idCounter: number = 0;

  configure(config: NotificationConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): Required<NotificationConfig> {
    return { ...this.config };
  }

  // Add a notification
  add(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = `notification-${++this.idCounter}-${Date.now()}`;
    const duration = notification.duration ?? this.config.defaultDuration;

    const fullNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration,
      dismissible: notification.dismissible ?? true,
    };

    // Add to list
    this.notifications = [fullNotification, ...this.notifications].slice(
      0,
      this.config.maxNotifications
    );

    // Set auto-dismiss timeout
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timeoutIds.set(id, timeoutId);
    }

    this.notifyCallbacks();
    return id;
  }

  // Convenience methods for different notification types
  info(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({ type: 'info', title, message, ...options });
  }

  success(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({ type: 'success', title, message, ...options });
  }

  warning(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({ type: 'warning', title, message, ...options });
  }

  error(title: string, message?: string, options?: Partial<Notification>): string {
    return this.add({
      type: 'error',
      title,
      message,
      duration: 0, // Errors are persistent by default
      ...options,
    });
  }

  // Dismiss a notification
  dismiss(id: string): void {
    // Clear timeout if exists
    const timeoutId = this.timeoutIds.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIds.delete(id);
    }

    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notifyCallbacks();
  }

  // Dismiss all notifications
  dismissAll(): void {
    // Clear all timeouts
    this.timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
    this.timeoutIds.clear();

    this.notifications = [];
    this.notifyCallbacks();
  }

  // Get current notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Subscribe to notification changes
  subscribe(callback: NotificationCallback): () => void {
    this.callbacks.add(callback);
    // Send current state immediately
    callback(this.getNotifications());
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(): void {
    const notifications = this.getNotifications();
    this.callbacks.forEach((cb) => {
      try {
        cb(notifications);
      } catch (e) {
        console.error('Notification callback error:', e);
      }
    });
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

// Convenience exports
export const notify = {
  info: (title: string, message?: string, options?: Partial<Notification>) =>
    notificationManager.info(title, message, options),
  success: (title: string, message?: string, options?: Partial<Notification>) =>
    notificationManager.success(title, message, options),
  warning: (title: string, message?: string, options?: Partial<Notification>) =>
    notificationManager.warning(title, message, options),
  error: (title: string, message?: string, options?: Partial<Notification>) =>
    notificationManager.error(title, message, options),
  dismiss: (id: string) => notificationManager.dismiss(id),
  dismissAll: () => notificationManager.dismissAll(),
};

// Pre-defined notification templates for common SignMate events
export const signmateNotifications = {
  pipelineStarted: () => notify.success('Pipeline Started', 'Now listening for speech'),
  pipelineStopped: () => notify.info('Pipeline Stopped', 'Interpretation paused'),
  pipelineError: (error: string) => notify.error('Pipeline Error', error),

  recordingStarted: () => notify.info('Recording Started', 'Session is being recorded'),
  recordingStopped: () => notify.success('Recording Saved', 'Session has been saved'),

  eventStarted: (name: string) => notify.success('Event Started', `Now interpreting: ${name}`),
  eventEnded: (name: string) => notify.info('Event Ended', `${name} has concluded`),

  connectionLost: () =>
    notify.warning('Connection Issue', 'Attempting to reconnect...', {
      duration: 0,
      dismissible: false,
    }),
  connectionRestored: () => notify.success('Connection Restored', 'Back online'),

  lowLatencyWarning: (latency: number) =>
    notify.warning('High Latency', `Current latency: ${latency}ms`),

  signQueueFull: () => notify.warning('Queue Full', 'Sign queue is at capacity'),
  signQueueCleared: () => notify.info('Queue Cleared', 'Sign queue has been cleared'),

  settingsSaved: () => notify.success('Settings Saved', 'Your preferences have been updated'),

  demoModeActive: () =>
    notify.info('Demo Mode', 'Running in demonstration mode', { duration: 3000 }),
};
