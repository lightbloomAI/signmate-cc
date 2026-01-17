'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { keyboardManager, type KeyBinding, type KeyCombo, formatKeyCombo } from './keyboardManager';
import {
  focusManager,
  FocusTrap,
  RovingTabIndex,
  getFocusableElements,
  focusFirst,
  focusLast,
  type FocusTrapConfig,
  type RovingTabIndexConfig,
} from './focusManager';

/**
 * Hook to register a keyboard shortcut
 */
export function useKeyboardShortcut(
  combo: KeyCombo,
  handler: (event: KeyboardEvent) => void,
  options: {
    description: string;
    category: KeyBinding['category'];
    enabled?: boolean;
    preventDefault?: boolean;
  }
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (options.enabled === false) return;

    const wrappedHandler = (event: KeyboardEvent) => {
      handlerRef.current(event);
    };

    return keyboardManager.register(combo, wrappedHandler, options);
  }, [combo, options.description, options.category, options.enabled, options.preventDefault, options]);
}

/**
 * Hook to register multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{
    combo: KeyCombo;
    handler: (event: KeyboardEvent) => void;
    description: string;
    category: KeyBinding['category'];
    enabled?: boolean;
  }>
): void {
  useEffect(() => {
    const unregisters = shortcuts
      .filter((s) => s.enabled !== false)
      .map((shortcut) =>
        keyboardManager.register(shortcut.combo, shortcut.handler, {
          description: shortcut.description,
          category: shortcut.category,
        })
      );

    return () => {
      unregisters.forEach((unregister) => unregister());
    };
  }, [shortcuts]);
}

/**
 * Hook to get all keyboard bindings
 */
export function useKeyboardBindings(): KeyBinding[] {
  const [bindings, setBindings] = useState<KeyBinding[]>(
    keyboardManager.getBindings()
  );

  useEffect(() => {
    return keyboardManager.subscribe(setBindings);
  }, []);

  return bindings;
}

/**
 * Hook to check if a key is currently pressed
 */
export function useKeyPressed(key: string): boolean {
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === key.toLowerCase()) {
        setIsPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === key.toLowerCase()) {
        setIsPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [key]);

  return isPressed;
}

/**
 * Hook to create a focus trap
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options?: Omit<FocusTrapConfig, 'container'> & { enabled?: boolean }
): {
  activate: () => void;
  deactivate: () => void;
  isActive: boolean;
} {
  const [isActive, setIsActive] = useState(false);
  const trapRef = useRef<FocusTrap | null>(null);

  const activate = useCallback(() => {
    if (!containerRef.current) return;

    trapRef.current = focusManager.trap({
      container: containerRef.current,
      ...options,
      onActivate: () => {
        setIsActive(true);
        options?.onActivate?.();
      },
      onDeactivate: () => {
        setIsActive(false);
        options?.onDeactivate?.();
      },
    });
  }, [containerRef, options]);

  const deactivate = useCallback(() => {
    if (trapRef.current) {
      trapRef.current.deactivate();
      trapRef.current = null;
    }
  }, []);

  // Auto-activate if enabled
  useEffect(() => {
    if (options?.enabled && containerRef.current) {
      activate();
    }

    return () => {
      deactivate();
    };
  }, [options?.enabled, activate, deactivate, containerRef]);

  return { activate, deactivate, isActive };
}

/**
 * Hook for roving tabindex navigation
 */
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement>,
  selector: string,
  options?: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    onSelect?: (element: HTMLElement, index: number) => void;
  }
): {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
} {
  const [currentIndex, setCurrentIndex] = useState(0);
  const rovingRef = useRef<RovingTabIndex | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    rovingRef.current = focusManager.createRoving({
      container: containerRef.current,
      selector,
      ...options,
      onSelect: (element, index) => {
        setCurrentIndex(index);
        options?.onSelect?.(element, index);
      },
    });

    return () => {
      if (containerRef.current) {
        focusManager.removeRoving(containerRef.current);
      }
    };
  }, [containerRef, selector, options]);

  const setIndex = useCallback((index: number) => {
    rovingRef.current?.setCurrentIndex(index);
  }, []);

  return { currentIndex, setCurrentIndex: setIndex };
}

/**
 * Hook to manage focus on navigation or route changes
 */
export function useFocusOnMount(
  ref: React.RefObject<HTMLElement>,
  options?: { delay?: number }
): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const timer = setTimeout(() => {
      element.focus();
    }, options?.delay || 0);

    return () => clearTimeout(timer);
  }, [ref, options?.delay]);
}

/**
 * Hook to restore focus when component unmounts
 */
export function useFocusReturn(): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, []);
}

/**
 * Hook to get focusable elements in a container
 */
export function useFocusableElements(
  containerRef: React.RefObject<HTMLElement>
): HTMLElement[] {
  const [elements, setElements] = useState<HTMLElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateElements = () => {
      setElements(getFocusableElements(containerRef.current!));
    };

    // Initial update
    updateElements();

    // Watch for DOM changes
    const observer = new MutationObserver(updateElements);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'hidden'],
    });

    return () => observer.disconnect();
  }, [containerRef]);

  return elements;
}

/**
 * Hook for arrow key navigation in lists/grids
 */
export function useArrowNavigation(options: {
  onUp?: () => void;
  onDown?: () => void;
  onLeft?: () => void;
  onRight?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}): void {
  useEffect(() => {
    if (options.enabled === false) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          options.onUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          options.onDown?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          options.onLeft?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          options.onRight?.();
          break;
        case 'Enter':
          options.onEnter?.();
          break;
        case 'Escape':
          options.onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options]);
}

/**
 * Hook to enable/disable keyboard manager
 */
export function useKeyboardEnabled(enabled: boolean): void {
  useEffect(() => {
    keyboardManager.setEnabled(enabled);
  }, [enabled]);
}

// Re-export utilities
export { formatKeyCombo, focusFirst, focusLast, getFocusableElements };
