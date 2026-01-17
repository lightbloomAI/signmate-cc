'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getAccessibilityManager,
  type AccessibilityPreferences,
  type AnnouncementPriority,
  type FocusTrapOptions,
} from './accessibilityManager';

/**
 * useAccessibility Hook
 *
 * Main hook for accessing accessibility features and preferences.
 */
export function useAccessibility() {
  const manager = useMemo(() => getAccessibilityManager(), []);
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(
    manager.getPreferences()
  );

  useEffect(() => {
    const unsubscribe = manager.on('preferencesChanged', () => {
      setPreferences(manager.getPreferences());
    });
    return unsubscribe;
  }, [manager]);

  const updatePreferences = useCallback(
    (updates: Partial<AccessibilityPreferences>) => {
      manager.updatePreferences(updates);
    },
    [manager]
  );

  const resetPreferences = useCallback(() => {
    manager.resetPreferences();
  }, [manager]);

  const announce = useCallback(
    (message: string, priority?: AnnouncementPriority) => {
      manager.announce(message, priority);
    },
    [manager]
  );

  const shouldReduceMotion = useMemo(
    () => manager.shouldReduceMotion(),
    [manager]
  );

  const shouldUseHighContrast = useMemo(
    () => manager.shouldUseHighContrast(),
    [manager]
  );

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    announce,
    shouldReduceMotion,
    shouldUseHighContrast,
    manager,
  };
}

/**
 * useAnnounce Hook
 *
 * Simple hook for making screen reader announcements.
 */
export function useAnnounce() {
  const manager = useMemo(() => getAccessibilityManager(), []);

  const announce = useCallback(
    (message: string, priority: AnnouncementPriority = 'polite') => {
      manager.announce(message, priority);
    },
    [manager]
  );

  const announceTranslation = useCallback(
    (text: string, signGloss: string) => {
      manager.announceTranslation(text, signGloss);
    },
    [manager]
  );

  return { announce, announceTranslation };
}

/**
 * useFocusTrap Hook
 *
 * Hook for creating focus traps within a container.
 */
export function useFocusTrap(
  id: string,
  options: FocusTrapOptions & { active?: boolean } = {}
) {
  const manager = useMemo(() => getAccessibilityManager(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const { active = true, ...trapOptions } = options;

  useEffect(() => {
    if (!active || !containerRef.current) return;

    manager.trapFocus(id, containerRef.current, trapOptions);

    return () => {
      manager.releaseFocus(id, trapOptions.returnFocus);
    };
  }, [id, active, manager, trapOptions]);

  return containerRef;
}

/**
 * useReducedMotion Hook
 *
 * Hook for checking if reduced motion is preferred.
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const manager = getAccessibilityManager();
    setReducedMotion(manager.shouldReduceMotion());

    const unsubscribe = manager.on('preferencesChanged', () => {
      setReducedMotion(manager.shouldReduceMotion());
    });

    // Also listen to system preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(manager.shouldReduceMotion());
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return reducedMotion;
}

/**
 * useHighContrast Hook
 *
 * Hook for checking if high contrast is preferred.
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const manager = getAccessibilityManager();
    setHighContrast(manager.shouldUseHighContrast());

    const unsubscribe = manager.on('preferencesChanged', () => {
      setHighContrast(manager.shouldUseHighContrast());
    });

    // Also listen to system preference changes
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    const handleChange = () => setHighContrast(manager.shouldUseHighContrast());
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return highContrast;
}

/**
 * useCaptionStyles Hook
 *
 * Hook for getting current caption styles based on preferences.
 */
export function useCaptionStyles(): React.CSSProperties {
  const manager = useMemo(() => getAccessibilityManager(), []);
  const [styles, setStyles] = useState<React.CSSProperties>(
    manager.getCaptionStyles()
  );

  useEffect(() => {
    const unsubscribe = manager.on('preferencesChanged', () => {
      setStyles(manager.getCaptionStyles());
    });
    return unsubscribe;
  }, [manager]);

  return styles;
}

/**
 * useColorBlindSafePalette Hook
 *
 * Hook for getting color blind safe colors.
 */
export function useColorBlindSafePalette(): Record<string, string> {
  const manager = useMemo(() => getAccessibilityManager(), []);
  const [palette, setPalette] = useState<Record<string, string>>(
    manager.getColorBlindSafePalette()
  );

  useEffect(() => {
    const unsubscribe = manager.on('preferencesChanged', () => {
      setPalette(manager.getColorBlindSafePalette());
    });
    return unsubscribe;
  }, [manager]);

  return palette;
}

/**
 * useKeyboardNavigation Hook
 *
 * Hook for handling keyboard navigation within a list.
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    wrap?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
    onSelect?: (index: number) => void;
  } = {}
) {
  const { wrap = true, orientation = 'vertical', onSelect } = options;
  const [currentIndex, setCurrentIndex] = useState(0);
  const manager = useMemo(() => getAccessibilityManager(), []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const validKeys =
        orientation === 'both'
          ? ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
          : orientation === 'horizontal'
          ? ['ArrowLeft', 'ArrowRight', 'Home', 'End']
          : ['ArrowUp', 'ArrowDown', 'Home', 'End'];

      if (!validKeys.includes(e.key)) return;

      e.preventDefault();
      const newIndex = manager.handleArrowNavigation(
        items,
        currentIndex,
        e.key,
        wrap
      );
      setCurrentIndex(newIndex);

      if (e.key === 'Enter' || e.key === ' ') {
        onSelect?.(currentIndex);
      }
    },
    [items, currentIndex, wrap, manager, onSelect]
  );

  useEffect(() => {
    const container = items[0]?.parentElement;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [items, handleKeyDown]);

  return { currentIndex, setCurrentIndex };
}

/**
 * useAriaLive Hook
 *
 * Hook for managing an ARIA live region.
 */
export function useAriaLive(mode: 'polite' | 'assertive' = 'polite') {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = useCallback(
    (newMessage: string, clearDelay?: number) => {
      // Clear previous message first to force re-announcement
      setMessage('');
      requestAnimationFrame(() => {
        setMessage(newMessage);

        if (clearDelay) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => setMessage(''), clearDelay);
        }
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const AriaLiveRegion = useMemo(
    () =>
      function LiveRegion() {
        return (
          <div
            role="status"
            aria-live={mode}
            aria-atomic="true"
            className="sr-only"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {message}
          </div>
        );
      },
    [message, mode]
  );

  return { announce, AriaLiveRegion, message };
}

/**
 * useSkipLink Hook
 *
 * Hook for creating skip links.
 */
export function useSkipLink(targetId: string, label: string) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [targetId]
  );

  const SkipLink = useMemo(
    () =>
      function Skip() {
        return (
          <a
            ref={linkRef}
            href={`#${targetId}`}
            onClick={handleClick}
            className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded"
          >
            {label}
          </a>
        );
      },
    [targetId, label, handleClick]
  );

  return { SkipLink, linkRef };
}
