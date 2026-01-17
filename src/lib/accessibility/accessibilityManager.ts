/**
 * Accessibility Manager
 *
 * Comprehensive accessibility system for SignMate including
 * screen reader support, focus management, and reduced motion.
 */

// Accessibility preferences
export interface AccessibilityPreferences {
  // Visual
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

  // Audio
  visualAlerts: boolean;
  captionsEnabled: boolean;
  captionSize: 'small' | 'medium' | 'large' | 'extra-large';
  captionBackground: 'transparent' | 'semi-transparent' | 'solid';

  // Interaction
  focusIndicators: 'default' | 'enhanced' | 'high-visibility';
  keyboardOnly: boolean;
  autoFocusDisabled: boolean;

  // Screen reader
  screenReaderOptimized: boolean;
  verboseDescriptions: boolean;
  announceTranslations: boolean;
}

// Announcement priorities for screen readers
export type AnnouncementPriority = 'polite' | 'assertive';

// Focus trap options
export interface FocusTrapOptions {
  initialFocus?: string | HTMLElement;
  returnFocus?: boolean;
  allowOutsideClick?: boolean;
  escapeDeactivates?: boolean;
}

// Default preferences
const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
  largeText: false,
  colorBlindMode: 'none',
  visualAlerts: false,
  captionsEnabled: true,
  captionSize: 'medium',
  captionBackground: 'semi-transparent',
  focusIndicators: 'default',
  keyboardOnly: false,
  autoFocusDisabled: false,
  screenReaderOptimized: false,
  verboseDescriptions: false,
  announceTranslations: true,
};

// Storage key
const STORAGE_KEY = 'signmate:accessibility';

// Event types
export type AccessibilityEventType =
  | 'preferencesChanged'
  | 'announcement'
  | 'focusTrapped'
  | 'focusReleased';

export interface AccessibilityEvent {
  type: AccessibilityEventType;
  payload?: unknown;
}

type EventHandler = (event: AccessibilityEvent) => void;

/**
 * AccessibilityManager Class
 *
 * Manages accessibility features including screen reader announcements,
 * focus management, and user preferences.
 */
export class AccessibilityManager {
  private preferences: AccessibilityPreferences;
  private eventHandlers: Map<AccessibilityEventType, Set<EventHandler>> = new Map();
  private liveRegion: HTMLElement | null = null;
  private activeFocusTraps: Map<string, { container: HTMLElement; previousFocus: HTMLElement | null }> = new Map();
  private mediaQueryReducedMotion: MediaQueryList | null = null;
  private mediaQueryHighContrast: MediaQueryList | null = null;

  constructor() {
    this.preferences = this.loadPreferences();
    this.setupMediaQueries();
    this.createLiveRegion();
  }

  private loadPreferences(): AccessibilityPreferences {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore errors
    }

    return { ...DEFAULT_PREFERENCES };
  }

  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch {
      // Ignore errors
    }
  }

  private setupMediaQueries(): void {
    if (typeof window === 'undefined') return;

    // Reduced motion
    this.mediaQueryReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.mediaQueryReducedMotion.addEventListener('change', (e) => {
      if (!this.preferences.reducedMotion) {
        this.emit({ type: 'preferencesChanged', payload: { reducedMotion: e.matches } });
      }
    });

    // High contrast
    this.mediaQueryHighContrast = window.matchMedia('(prefers-contrast: more)');
    this.mediaQueryHighContrast.addEventListener('change', (e) => {
      if (!this.preferences.highContrast) {
        this.emit({ type: 'preferencesChanged', payload: { highContrast: e.matches } });
      }
    });
  }

  private createLiveRegion(): void {
    if (typeof document === 'undefined') return;

    // Create polite region
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'sr-only';
    this.liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.liveRegion);
  }

  // Event system
  on(type: AccessibilityEventType, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  off(type: AccessibilityEventType, handler: EventHandler): void {
    this.eventHandlers.get(type)?.delete(handler);
  }

  private emit(event: AccessibilityEvent): void {
    this.eventHandlers.get(event.type)?.forEach(handler => handler(event));
  }

  // Preferences management
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<AccessibilityPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
    this.applyPreferences();
    this.emit({ type: 'preferencesChanged', payload: updates });
  }

  resetPreferences(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.savePreferences();
    this.applyPreferences();
    this.emit({ type: 'preferencesChanged', payload: this.preferences });
  }

  private applyPreferences(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Reduced motion
    root.classList.toggle('reduce-motion', this.preferences.reducedMotion || this.prefersReducedMotion());

    // High contrast
    root.classList.toggle('high-contrast', this.preferences.highContrast || this.prefersHighContrast());

    // Large text
    root.classList.toggle('large-text', this.preferences.largeText);

    // Color blind mode
    root.setAttribute('data-color-blind-mode', this.preferences.colorBlindMode);

    // Focus indicators
    root.setAttribute('data-focus-mode', this.preferences.focusIndicators);

    // Keyboard only
    root.classList.toggle('keyboard-only', this.preferences.keyboardOnly);
  }

  // System preference detection
  prefersReducedMotion(): boolean {
    return this.mediaQueryReducedMotion?.matches ?? false;
  }

  prefersHighContrast(): boolean {
    return this.mediaQueryHighContrast?.matches ?? false;
  }

  shouldReduceMotion(): boolean {
    return this.preferences.reducedMotion || this.prefersReducedMotion();
  }

  shouldUseHighContrast(): boolean {
    return this.preferences.highContrast || this.prefersHighContrast();
  }

  // Screen reader announcements
  announce(message: string, priority: AnnouncementPriority = 'polite'): void {
    if (!this.liveRegion) return;

    // Update aria-live attribute based on priority
    this.liveRegion.setAttribute('aria-live', priority);

    // Clear and set new message (force announcement)
    this.liveRegion.textContent = '';
    requestAnimationFrame(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    });

    this.emit({ type: 'announcement', payload: { message, priority } });
  }

  announceTranslation(text: string, signGloss: string): void {
    if (!this.preferences.announceTranslations) return;

    const message = this.preferences.verboseDescriptions
      ? `Translation: "${text}" is being signed as ${signGloss}`
      : `Signing: ${signGloss}`;

    this.announce(message, 'polite');
  }

  // Focus management
  trapFocus(id: string, container: HTMLElement, options: FocusTrapOptions = {}): void {
    const previousFocus = document.activeElement as HTMLElement | null;
    this.activeFocusTraps.set(id, { container, previousFocus });

    // Get focusable elements
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    // Set initial focus
    if (options.initialFocus) {
      const initialElement = typeof options.initialFocus === 'string'
        ? container.querySelector<HTMLElement>(options.initialFocus)
        : options.initialFocus;
      initialElement?.focus();
    } else {
      focusableElements[0].focus();
    }

    // Setup trap handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }

      if (e.key === 'Escape' && options.escapeDeactivates !== false) {
        this.releaseFocus(id, options.returnFocus);
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.setAttribute('data-focus-trap-handler', 'true');

    this.emit({ type: 'focusTrapped', payload: { id } });
  }

  releaseFocus(id: string, returnFocus: boolean = true): void {
    const trap = this.activeFocusTraps.get(id);
    if (!trap) return;

    this.activeFocusTraps.delete(id);

    if (returnFocus && trap.previousFocus) {
      trap.previousFocus.focus();
    }

    this.emit({ type: 'focusReleased', payload: { id } });
  }

  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];

    return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(', ')))
      .filter(el => {
        const style = getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }

  // Skip link management
  createSkipLink(targetId: string, label: string): HTMLAnchorElement {
    const link = document.createElement('a');
    link.href = `#${targetId}`;
    link.className = 'skip-link';
    link.textContent = label;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView();
      }
    });
    return link;
  }

  // Keyboard navigation helpers
  handleArrowNavigation(
    elements: HTMLElement[],
    currentIndex: number,
    key: string,
    wrap: boolean = true
  ): number {
    let newIndex = currentIndex;

    switch (key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = currentIndex + 1;
        if (newIndex >= elements.length) {
          newIndex = wrap ? 0 : elements.length - 1;
        }
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = currentIndex - 1;
        if (newIndex < 0) {
          newIndex = wrap ? elements.length - 1 : 0;
        }
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = elements.length - 1;
        break;
    }

    if (newIndex !== currentIndex && elements[newIndex]) {
      elements[newIndex].focus();
    }

    return newIndex;
  }

  // ARIA helpers
  setAriaExpanded(element: HTMLElement, expanded: boolean): void {
    element.setAttribute('aria-expanded', String(expanded));
  }

  setAriaSelected(element: HTMLElement, selected: boolean): void {
    element.setAttribute('aria-selected', String(selected));
  }

  setAriaChecked(element: HTMLElement, checked: boolean | 'mixed'): void {
    element.setAttribute('aria-checked', String(checked));
  }

  setAriaDisabled(element: HTMLElement, disabled: boolean): void {
    element.setAttribute('aria-disabled', String(disabled));
  }

  setAriaCurrent(element: HTMLElement, value: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false'): void {
    element.setAttribute('aria-current', value);
  }

  // Caption style generation
  getCaptionStyles(): React.CSSProperties {
    const sizes = {
      small: '0.875rem',
      medium: '1rem',
      large: '1.25rem',
      'extra-large': '1.5rem',
    };

    const backgrounds = {
      transparent: 'transparent',
      'semi-transparent': 'rgba(0, 0, 0, 0.7)',
      solid: '#000000',
    };

    return {
      fontSize: sizes[this.preferences.captionSize],
      backgroundColor: backgrounds[this.preferences.captionBackground],
      padding: this.preferences.captionBackground !== 'transparent' ? '0.5rem 1rem' : '0',
      borderRadius: '0.25rem',
    };
  }

  // Color blind safe palette
  getColorBlindSafePalette(): Record<string, string> {
    const palettes: Record<string, Record<string, string>> = {
      none: {
        primary: '#3b82f6',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#06b6d4',
      },
      protanopia: {
        primary: '#0066cc',
        success: '#009e73',
        warning: '#f0e442',
        error: '#d55e00',
        info: '#56b4e9',
      },
      deuteranopia: {
        primary: '#0066cc',
        success: '#009e73',
        warning: '#f0e442',
        error: '#d55e00',
        info: '#56b4e9',
      },
      tritanopia: {
        primary: '#e69f00',
        success: '#009e73',
        warning: '#f0e442',
        error: '#cc79a7',
        info: '#56b4e9',
      },
    };

    return palettes[this.preferences.colorBlindMode] || palettes.none;
  }

  // Cleanup
  destroy(): void {
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    this.eventHandlers.clear();
    this.activeFocusTraps.clear();
  }
}

// Singleton instance
let accessibilityInstance: AccessibilityManager | null = null;

export function getAccessibilityManager(): AccessibilityManager {
  if (!accessibilityInstance) {
    accessibilityInstance = new AccessibilityManager();
  }
  return accessibilityInstance;
}

export function createAccessibilityManager(): AccessibilityManager {
  return new AccessibilityManager();
}
