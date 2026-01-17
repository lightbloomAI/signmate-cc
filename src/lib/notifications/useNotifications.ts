'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  notificationManager,
  notify,
  type Notification,
  type NotificationType,
  type NotificationConfig,
} from './notificationManager';

/**
 * useNotifications Hook
 *
 * Hook for managing and displaying notifications.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const showInfo = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return notify.info(title, message, options);
    },
    []
  );

  const showSuccess = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return notify.success(title, message, options);
    },
    []
  );

  const showWarning = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return notify.warning(title, message, options);
    },
    []
  );

  const showError = useCallback(
    (title: string, message?: string, options?: Partial<Notification>) => {
      return notify.error(title, message, options);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    notify.dismiss(id);
  }, []);

  const dismissAll = useCallback(() => {
    notify.dismissAll();
  }, []);

  const configure = useCallback((config: NotificationConfig) => {
    notificationManager.configure(config);
  }, []);

  return {
    notifications,
    showInfo,
    showSuccess,
    showWarning,
    showError,
    dismiss,
    dismissAll,
    configure,
    notify,
  };
}

/**
 * useNotificationCount Hook
 *
 * Simple hook for getting the notification count.
 */
export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const unsubscribe = notificationManager.subscribe((notifications) => {
      setCount(notifications.length);
    });
    return unsubscribe;
  }, []);

  return count;
}

/**
 * useToast Hook
 *
 * Simplified hook for showing toast notifications.
 */
export function useToast() {
  const { showInfo, showSuccess, showWarning, showError, dismiss } = useNotifications();

  const toast = useMemo(
    () => ({
      info: showInfo,
      success: showSuccess,
      warning: showWarning,
      error: showError,
      dismiss,
    }),
    [showInfo, showSuccess, showWarning, showError, dismiss]
  );

  return toast;
}

/**
 * useNotificationSound Hook
 *
 * Hook for playing notification sounds.
 */
export function useNotificationSound() {
  const playSound = useCallback((type: NotificationType) => {
    if (typeof window === 'undefined') return;

    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies: Record<NotificationType, number> = {
        info: 440,
        success: 523,
        warning: 587,
        error: 330,
      };

      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch {
      // Audio not available
    }
  }, []);

  return playSound;
}

/**
 * useNotificationPermission Hook
 *
 * Hook for requesting browser notification permission.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported' as const;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return 'denied' as const;
    }
  }, []);

  const showBrowserNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return null;

      try {
        return new Notification(title, options);
      } catch {
        return null;
      }
    },
    [permission]
  );

  return {
    permission,
    requestPermission,
    showBrowserNotification,
    isSupported: permission !== 'unsupported',
    isGranted: permission === 'granted',
  };
}
