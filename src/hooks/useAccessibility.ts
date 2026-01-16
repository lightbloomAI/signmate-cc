'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  initLiveRegion,
  announce,
  announceError,
  announceSuccess,
  createFocusTrap,
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,
  type AnnouncePriority,
} from '@/lib/accessibility';

/**
 * Hook to initialize accessibility features
 * Should be used in the root layout/app component
 */
export function useAccessibilityInit(): void {
  useEffect(() => {
    initLiveRegion();
  }, []);
}

/**
 * Hook for screen reader announcements
 */
export function useAnnounce(): {
  announce: (message: string, priority?: AnnouncePriority) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
} {
  return {
    announce,
    announceError,
    announceSuccess,
  };
}

/**
 * Hook for focus trap management
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean
): void {
  const trapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    trapRef.current = createFocusTrap(containerRef.current);

    return () => {
      trapRef.current?.deactivate();
    };
  }, [containerRef]);

  useEffect(() => {
    if (isActive) {
      trapRef.current?.activate();
    } else {
      trapRef.current?.deactivate();
    }
  }, [isActive]);
}

/**
 * Hook to detect user motion preferences
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

/**
 * Hook to detect high contrast preference
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    setHighContrast(prefersHighContrast());

    const mediaQuery = window.matchMedia('(forced-colors: active)');
    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return highContrast;
}

/**
 * Hook to detect dark mode preference
 */
export function useDarkMode(): boolean {
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    setDarkMode(prefersDarkMode());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return darkMode;
}

/**
 * Hook for managing focus return when a modal/panel closes
 */
export function useFocusReturn(): {
  saveFocus: () => void;
  restoreFocus: () => void;
} {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Hook for keyboard navigation within a list
 */
export function useArrowNavigation<T extends HTMLElement>(
  itemsRef: React.RefObject<T[]>,
  options: {
    wrap?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (index: number) => void;
  } = {}
): {
  handleKeyDown: (e: React.KeyboardEvent, index: number) => void;
  focusIndex: (index: number) => void;
} {
  const { wrap = true, orientation = 'vertical', onSelect } = options;

  const focusIndex = useCallback((index: number) => {
    const items = itemsRef.current;
    if (!items || index < 0 || index >= items.length) return;
    items[index]?.focus();
  }, [itemsRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      const items = itemsRef.current;
      if (!items) return;

      const len = items.length;
      let newIndex = currentIndex;

      const isVertical = orientation === 'vertical' || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';

      switch (e.key) {
        case 'ArrowUp':
          if (isVertical) {
            e.preventDefault();
            newIndex = wrap
              ? (currentIndex - 1 + len) % len
              : Math.max(0, currentIndex - 1);
          }
          break;
        case 'ArrowDown':
          if (isVertical) {
            e.preventDefault();
            newIndex = wrap ? (currentIndex + 1) % len : Math.min(len - 1, currentIndex + 1);
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            e.preventDefault();
            newIndex = wrap
              ? (currentIndex - 1 + len) % len
              : Math.max(0, currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (isHorizontal) {
            e.preventDefault();
            newIndex = wrap ? (currentIndex + 1) % len : Math.min(len - 1, currentIndex + 1);
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = len - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(currentIndex);
          return;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        focusIndex(newIndex);
      }
    },
    [itemsRef, wrap, orientation, onSelect, focusIndex]
  );

  return { handleKeyDown, focusIndex };
}

/**
 * Hook to announce status changes
 */
export function useStatusAnnouncer(
  status: string,
  getMessage: (status: string) => string
): void {
  const previousStatus = useRef(status);

  useEffect(() => {
    if (status !== previousStatus.current) {
      const message = getMessage(status);
      announce(message);
      previousStatus.current = status;
    }
  }, [status, getMessage]);
}

/**
 * Combined accessibility preferences hook
 */
export function useAccessibilityPreferences(): {
  reducedMotion: boolean;
  highContrast: boolean;
  darkMode: boolean;
} {
  const reducedMotion = useReducedMotion();
  const highContrast = useHighContrast();
  const darkMode = useDarkMode();

  return { reducedMotion, highContrast, darkMode };
}
