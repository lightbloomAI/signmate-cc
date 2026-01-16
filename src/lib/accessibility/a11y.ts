/**
 * Accessibility utilities for SignMate
 * Provides helpers for ARIA, focus management, and screen reader announcements
 */

// Announcement priority levels
export type AnnouncePriority = 'polite' | 'assertive';

// Live region element reference
let liveRegion: HTMLElement | null = null;

/**
 * Initialize the live region for screen reader announcements
 * Should be called once when the app loads
 */
export function initLiveRegion(): void {
  if (typeof document === 'undefined') return;
  if (liveRegion) return;

  liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.setAttribute('role', 'status');
  liveRegion.className = 'sr-only';
  liveRegion.style.cssText = `
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
  document.body.appendChild(liveRegion);
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: AnnouncePriority = 'polite'): void {
  if (typeof document === 'undefined') return;

  // Initialize if needed
  if (!liveRegion) {
    initLiveRegion();
  }

  if (!liveRegion) return;

  // Update priority if needed
  liveRegion.setAttribute('aria-live', priority);

  // Clear and set message (triggers announcement)
  liveRegion.textContent = '';

  // Use requestAnimationFrame to ensure the clear happens first
  requestAnimationFrame(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  });
}

/**
 * Announce an error message assertively
 */
export function announceError(message: string): void {
  announce(`Error: ${message}`, 'assertive');
}

/**
 * Announce a success message politely
 */
export function announceSuccess(message: string): void {
  announce(message, 'polite');
}

/**
 * Focus trap - keeps focus within a container
 */
export function createFocusTrap(container: HTMLElement): {
  activate: () => void;
  deactivate: () => void;
} {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  let previouslyFocused: Element | null = null;

  function getFocusableElements(): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return {
    activate: () => {
      previouslyFocused = document.activeElement;
      container.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    },
    deactivate: () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Restore previous focus
      if (previouslyFocused && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    },
  };
}

/**
 * Skip link helper - creates skip navigation links
 */
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = label;
  link.style.cssText = `
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
    z-index: 10000;
  `;

  link.addEventListener('focus', () => {
    link.style.cssText = `
      position: fixed;
      left: 16px;
      top: 16px;
      width: auto;
      height: auto;
      overflow: visible;
      z-index: 10000;
      padding: 12px 24px;
      background: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
    `;
  });

  link.addEventListener('blur', () => {
    link.style.cssText = `
      position: absolute;
      left: -10000px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
      z-index: 10000;
    `;
  });

  return link;
}

/**
 * Manage focus on route changes (for SPA navigation)
 */
export function focusOnNavigate(element: HTMLElement): void {
  // Set tabindex to make non-interactive elements focusable
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }

  element.focus();

  // Announce page change
  const pageTitle = document.title || 'Page loaded';
  announce(pageTitle);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(forced-colors: active)').matches ||
    window.matchMedia('(-ms-high-contrast: active)').matches
  );
}

/**
 * Check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix: string = 'signmate'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * ARIA attribute helpers
 */
export const ariaLabels = {
  // Pipeline controls
  startPipeline: 'Start interpretation',
  stopPipeline: 'Stop interpretation',
  pausePipeline: 'Pause interpretation',
  resumePipeline: 'Resume interpretation',

  // Avatar controls
  pauseAvatar: 'Pause avatar animation',
  resumeAvatar: 'Resume avatar animation',

  // Recording controls
  startRecording: 'Start recording session',
  stopRecording: 'Stop recording session',
  pauseRecording: 'Pause recording',
  resumeRecording: 'Resume recording',
  addMarker: 'Add bookmark marker',

  // Playback controls
  playRecording: 'Play recording',
  pausePlayback: 'Pause playback',
  seekForward: 'Skip forward',
  seekBackward: 'Skip backward',

  // Display modes
  fullscreen: 'Toggle fullscreen mode',
  compactMode: 'Switch to compact display',
  standardMode: 'Switch to standard display',
  splitMode: 'Switch to split display',

  // Settings
  openSettings: 'Open settings panel',
  closeSettings: 'Close settings panel',
  saveSettings: 'Save settings',
  resetSettings: 'Reset to default settings',

  // Audio
  muteAudio: 'Mute audio',
  unmuteAudio: 'Unmute audio',
  adjustVolume: 'Adjust volume',

  // Captions
  showCaptions: 'Show captions',
  hideCaptions: 'Hide captions',

  // Navigation
  mainContent: 'Main content',
  avatarDisplay: 'Avatar display area',
  captionDisplay: 'Caption display area',
  controlPanel: 'Control panel',
  signQueue: 'Sign queue',
};

/**
 * Status descriptions for screen readers
 */
export function getStatusDescription(status: string, context?: Record<string, unknown>): string {
  const descriptions: Record<string, string | ((ctx: Record<string, unknown>) => string)> = {
    idle: 'Interpretation not active',
    initializing: 'Starting interpretation system',
    listening: 'Listening for speech',
    processing: 'Processing speech',
    signing: (ctx) => `Signing: ${ctx?.currentSign || 'sign'}`,
    paused: 'Interpretation paused',
    error: (ctx) => `Error: ${ctx?.errorMessage || 'An error occurred'}`,
    recording: 'Recording session',
    playing: 'Playing recorded session',
  };

  const description = descriptions[status];
  if (typeof description === 'function') {
    return description(context || {});
  }
  return description || status;
}

/**
 * Format duration for screen readers
 */
export function formatDurationForSR(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minPart = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  const secPart = seconds > 0 ? ` and ${seconds} second${seconds !== 1 ? 's' : ''}` : '';

  return minPart + secPart;
}

/**
 * Format sign information for screen readers
 */
export function formatSignForSR(sign: {
  gloss: string;
  duration: number;
  handshape?: { dominant: string };
}): string {
  const parts = [
    `Sign: ${sign.gloss}`,
    `Duration: ${formatDurationForSR(sign.duration)}`,
  ];

  if (sign.handshape?.dominant) {
    parts.push(`Handshape: ${sign.handshape.dominant}`);
  }

  return parts.join('. ');
}

// ============================================
// Keyboard Shortcuts Types and Utilities
// ============================================

export interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  category: 'pipeline' | 'display' | 'navigation' | 'emergency';
  enabled: boolean;
}

/**
 * Default keyboard shortcuts for SignMate
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Pipeline controls
  {
    id: 'start-stop',
    keys: ['Space'],
    description: 'Start/Stop interpretation',
    category: 'pipeline',
    enabled: true,
  },
  {
    id: 'pause-resume',
    keys: ['P'],
    description: 'Pause/Resume avatar',
    category: 'pipeline',
    enabled: true,
  },
  {
    id: 'clear-queue',
    keys: ['C'],
    description: 'Clear sign queue',
    category: 'pipeline',
    enabled: true,
  },

  // Display controls
  {
    id: 'toggle-captions',
    keys: ['T'],
    description: 'Toggle captions',
    category: 'display',
    enabled: true,
  },
  {
    id: 'toggle-fullscreen',
    keys: ['F'],
    description: 'Toggle fullscreen',
    category: 'display',
    enabled: true,
  },
  {
    id: 'next-display',
    keys: ['→'],
    description: 'Next display mode',
    category: 'display',
    enabled: true,
  },
  {
    id: 'prev-display',
    keys: ['←'],
    description: 'Previous display mode',
    category: 'display',
    enabled: true,
  },

  // Navigation
  {
    id: 'show-shortcuts',
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open-settings',
    keys: ['Ctrl', 'Comma'],
    description: 'Open settings',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'open-glossary',
    keys: ['G'],
    description: 'Open glossary',
    category: 'navigation',
    enabled: true,
  },

  // Emergency
  {
    id: 'emergency-stop',
    keys: ['Esc'],
    description: 'Emergency stop',
    category: 'emergency',
    enabled: true,
  },
];

/**
 * Format key combination for display
 */
export function formatKeyCombo(keys: string[]): string {
  const keyMap: Record<string, string> = {
    Space: '␣',
    Escape: 'Esc',
    Esc: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    '→': '→',
    '←': '←',
    Control: 'Ctrl',
    Ctrl: 'Ctrl',
    Alt: 'Alt',
    Shift: 'Shift',
    Meta: '⌘',
    Comma: ',',
    Period: '.',
    Enter: '↵',
    Backspace: '⌫',
    Delete: 'Del',
    Tab: 'Tab',
  };

  return keys.map((key) => keyMap[key] || key).join(' + ');
}

/**
 * Simple focus trap function (returns cleanup function)
 */
export function trapFocus(container: HTMLElement): () => void {
  const trap = createFocusTrap(container);
  trap.activate();
  return () => trap.deactivate();
}
