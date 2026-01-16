'use client';

import { useEffect, useCallback, useRef } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface ShortcutDefinition {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: KeyHandler;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutDefinition[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Keep shortcuts ref updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          if (preventDefault) {
            event.preventDefault();
          }
          shortcut.handler(event);
          return;
        }
      }
    },
    [enabled, preventDefault]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

// Pre-defined shortcuts for SignMate operators
export function useOperatorShortcuts(handlers: {
  onStartStop?: () => void;
  onPauseResume?: () => void;
  onClearQueue?: () => void;
  onToggleCaptions?: () => void;
  onToggleFullscreen?: () => void;
  onNextDisplay?: () => void;
  onPreviousDisplay?: () => void;
  onEmergencyStop?: () => void;
}): void {
  const shortcuts: ShortcutDefinition[] = [
    // Space - Start/Stop pipeline
    {
      key: ' ',
      handler: () => handlers.onStartStop?.(),
      description: 'Start/Stop interpretation',
    },
    // P - Pause/Resume avatar animation
    {
      key: 'p',
      handler: () => handlers.onPauseResume?.(),
      description: 'Pause/Resume animation',
    },
    // C - Clear sign queue
    {
      key: 'c',
      handler: () => handlers.onClearQueue?.(),
      description: 'Clear sign queue',
    },
    // T - Toggle captions
    {
      key: 't',
      handler: () => handlers.onToggleCaptions?.(),
      description: 'Toggle captions',
    },
    // F - Toggle fullscreen
    {
      key: 'f',
      handler: () => handlers.onToggleFullscreen?.(),
      description: 'Toggle fullscreen',
    },
    // Right Arrow - Next display mode
    {
      key: 'ArrowRight',
      handler: () => handlers.onNextDisplay?.(),
      description: 'Next display mode',
    },
    // Left Arrow - Previous display mode
    {
      key: 'ArrowLeft',
      handler: () => handlers.onPreviousDisplay?.(),
      description: 'Previous display mode',
    },
    // Escape - Emergency stop
    {
      key: 'Escape',
      handler: () => handlers.onEmergencyStop?.(),
      description: 'Emergency stop',
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
