/**
 * Keyboard Navigation Manager for SignMate
 * Provides comprehensive keyboard controls for live event operation
 */

type KeyHandler = (event: KeyboardEvent) => void;
type KeyCombo = string; // e.g., 'ctrl+shift+s', 'f', 'escape'

interface KeyBinding {
  combo: KeyCombo;
  handler: KeyHandler;
  description: string;
  category: 'pipeline' | 'display' | 'navigation' | 'recording' | 'emergency';
  enabled: boolean;
  preventDefault?: boolean;
}

interface KeyboardManagerOptions {
  enabled?: boolean;
  enableInInputs?: boolean;
  globalScope?: boolean;
}

class KeyboardManager {
  private bindings: Map<KeyCombo, KeyBinding> = new Map();
  private enabled: boolean = true;
  private enableInInputs: boolean = false;
  private listeners: Set<(bindings: KeyBinding[]) => void> = new Set();
  private pressedKeys: Set<string> = new Set();

  constructor(options: KeyboardManagerOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.enableInInputs = options.enableInInputs ?? false;

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;

    // Track pressed keys for combos
    this.pressedKeys.add(event.key.toLowerCase());

    // Skip if in input field and not enabled
    if (!this.enableInInputs && this.isInputElement(event.target as Element)) {
      return;
    }

    const combo = this.eventToCombo(event);
    const binding = this.bindings.get(combo);

    if (binding && binding.enabled) {
      if (binding.preventDefault !== false) {
        event.preventDefault();
      }
      binding.handler(event);
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.pressedKeys.delete(event.key.toLowerCase());
  };

  private handleBlur = (): void => {
    this.pressedKeys.clear();
  };

  private isInputElement(element: Element | null): boolean {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (element as HTMLElement).isContentEditable
    );
  }

  private eventToCombo(event: KeyboardEvent): KeyCombo {
    const parts: string[] = [];

    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');

    // Normalize key names
    let key = event.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'arrowup') key = 'up';
    if (key === 'arrowdown') key = 'down';
    if (key === 'arrowleft') key = 'left';
    if (key === 'arrowright') key = 'right';

    // Don't add modifier keys as the main key
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      parts.push(key);
    }

    return parts.join('+');
  }

  /**
   * Register a keyboard binding
   */
  register(
    combo: KeyCombo,
    handler: KeyHandler,
    options: {
      description: string;
      category: KeyBinding['category'];
      enabled?: boolean;
      preventDefault?: boolean;
    }
  ): () => void {
    const normalizedCombo = this.normalizeCombo(combo);

    const binding: KeyBinding = {
      combo: normalizedCombo,
      handler,
      description: options.description,
      category: options.category,
      enabled: options.enabled ?? true,
      preventDefault: options.preventDefault,
    };

    this.bindings.set(normalizedCombo, binding);
    this.notifyListeners();

    // Return unregister function
    return () => {
      this.bindings.delete(normalizedCombo);
      this.notifyListeners();
    };
  }

  /**
   * Unregister a keyboard binding
   */
  unregister(combo: KeyCombo): void {
    const normalizedCombo = this.normalizeCombo(combo);
    this.bindings.delete(normalizedCombo);
    this.notifyListeners();
  }

  /**
   * Enable or disable a specific binding
   */
  setBindingEnabled(combo: KeyCombo, enabled: boolean): void {
    const normalizedCombo = this.normalizeCombo(combo);
    const binding = this.bindings.get(normalizedCombo);
    if (binding) {
      binding.enabled = enabled;
      this.notifyListeners();
    }
  }

  /**
   * Enable or disable all bindings in a category
   */
  setCategoryEnabled(category: KeyBinding['category'], enabled: boolean): void {
    this.bindings.forEach((binding) => {
      if (binding.category === category) {
        binding.enabled = enabled;
      }
    });
    this.notifyListeners();
  }

  /**
   * Enable or disable the entire keyboard manager
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get all registered bindings
   */
  getBindings(): KeyBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Get bindings by category
   */
  getBindingsByCategory(category: KeyBinding['category']): KeyBinding[] {
    return this.getBindings().filter((b) => b.category === category);
  }

  /**
   * Subscribe to binding changes
   */
  subscribe(callback: (bindings: KeyBinding[]) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Check if a key is currently pressed
   */
  isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key.toLowerCase());
  }

  /**
   * Normalize a key combo string
   */
  private normalizeCombo(combo: KeyCombo): KeyCombo {
    const parts = combo.toLowerCase().split('+');
    const modifiers: string[] = [];
    let key = '';

    parts.forEach((part) => {
      const trimmed = part.trim();
      if (['ctrl', 'control', 'cmd', 'meta'].includes(trimmed)) {
        modifiers.push('ctrl');
      } else if (trimmed === 'alt') {
        modifiers.push('alt');
      } else if (trimmed === 'shift') {
        modifiers.push('shift');
      } else {
        key = trimmed;
      }
    });

    // Sort modifiers for consistent comparison
    modifiers.sort();

    return [...modifiers, key].filter(Boolean).join('+');
  }

  private notifyListeners(): void {
    const bindings = this.getBindings();
    this.listeners.forEach((cb) => cb(bindings));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
    this.bindings.clear();
    this.listeners.clear();
    this.pressedKeys.clear();
  }
}

// Singleton instance
export const keyboardManager = new KeyboardManager();

// Default bindings for SignMate
export function registerDefaultBindings(handlers: {
  onTogglePipeline?: () => void;
  onPausePipeline?: () => void;
  onResumePipeline?: () => void;
  onToggleRecording?: () => void;
  onAddMarker?: () => void;
  onToggleFullscreen?: () => void;
  onToggleCaptions?: () => void;
  onToggleSettings?: () => void;
  onToggleHealth?: () => void;
  onToggleMetrics?: () => void;
  onToggleShortcuts?: () => void;
  onEmergencyStop?: () => void;
  onSpeedUp?: () => void;
  onSlowDown?: () => void;
  onNextDisplay?: () => void;
  onPrevDisplay?: () => void;
}): () => void {
  const unregisters: (() => void)[] = [];

  // Pipeline controls
  if (handlers.onTogglePipeline) {
    unregisters.push(
      keyboardManager.register('space', handlers.onTogglePipeline, {
        description: 'Toggle pipeline (start/stop)',
        category: 'pipeline',
      })
    );
  }

  if (handlers.onPausePipeline) {
    unregisters.push(
      keyboardManager.register('p', handlers.onPausePipeline, {
        description: 'Pause pipeline',
        category: 'pipeline',
      })
    );
  }

  // Recording controls
  if (handlers.onToggleRecording) {
    unregisters.push(
      keyboardManager.register('r', handlers.onToggleRecording, {
        description: 'Toggle recording',
        category: 'recording',
      })
    );
  }

  if (handlers.onAddMarker) {
    unregisters.push(
      keyboardManager.register('m', handlers.onAddMarker, {
        description: 'Add marker',
        category: 'recording',
      })
    );
  }

  // Display controls
  if (handlers.onToggleFullscreen) {
    unregisters.push(
      keyboardManager.register('f', handlers.onToggleFullscreen, {
        description: 'Toggle fullscreen',
        category: 'display',
      })
    );
  }

  if (handlers.onToggleCaptions) {
    unregisters.push(
      keyboardManager.register('c', handlers.onToggleCaptions, {
        description: 'Toggle captions',
        category: 'display',
      })
    );
  }

  if (handlers.onNextDisplay) {
    unregisters.push(
      keyboardManager.register('right', handlers.onNextDisplay, {
        description: 'Next display mode',
        category: 'display',
      })
    );
  }

  if (handlers.onPrevDisplay) {
    unregisters.push(
      keyboardManager.register('left', handlers.onPrevDisplay, {
        description: 'Previous display mode',
        category: 'display',
      })
    );
  }

  // Speed controls
  if (handlers.onSpeedUp) {
    unregisters.push(
      keyboardManager.register(']', handlers.onSpeedUp, {
        description: 'Increase sign speed',
        category: 'pipeline',
      })
    );
  }

  if (handlers.onSlowDown) {
    unregisters.push(
      keyboardManager.register('[', handlers.onSlowDown, {
        description: 'Decrease sign speed',
        category: 'pipeline',
      })
    );
  }

  // Navigation
  if (handlers.onToggleSettings) {
    unregisters.push(
      keyboardManager.register('s', handlers.onToggleSettings, {
        description: 'Toggle settings panel',
        category: 'navigation',
      })
    );
  }

  if (handlers.onToggleHealth) {
    unregisters.push(
      keyboardManager.register('h', handlers.onToggleHealth, {
        description: 'Toggle health check panel',
        category: 'navigation',
      })
    );
  }

  if (handlers.onToggleMetrics) {
    unregisters.push(
      keyboardManager.register('shift+m', handlers.onToggleMetrics, {
        description: 'Toggle metrics dashboard',
        category: 'navigation',
      })
    );
  }

  if (handlers.onToggleShortcuts) {
    unregisters.push(
      keyboardManager.register('shift+?', handlers.onToggleShortcuts, {
        description: 'Show keyboard shortcuts',
        category: 'navigation',
      })
    );
  }

  // Emergency
  if (handlers.onEmergencyStop) {
    unregisters.push(
      keyboardManager.register('escape', handlers.onEmergencyStop, {
        description: 'Emergency stop / Close panel',
        category: 'emergency',
      })
    );
  }

  // Return cleanup function
  return () => {
    unregisters.forEach((unregister) => unregister());
  };
}

// Format a key combo for display
export function formatKeyCombo(combo: KeyCombo): string {
  const parts = combo.split('+');
  const formatted = parts.map((part) => {
    const map: Record<string, string> = {
      ctrl: '⌃',
      alt: '⌥',
      shift: '⇧',
      space: 'Space',
      up: '↑',
      down: '↓',
      left: '←',
      right: '→',
      escape: 'Esc',
      enter: '↵',
      backspace: '⌫',
      tab: '⇥',
    };
    return map[part] || part.toUpperCase();
  });
  return formatted.join('');
}

export type { KeyBinding, KeyCombo, KeyHandler };
