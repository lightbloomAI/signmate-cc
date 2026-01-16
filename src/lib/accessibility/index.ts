/**
 * Accessibility utilities for SignMate
 */

// ARIA live region announcements
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  // Find or create live region
  let liveRegion = document.getElementById('signmate-announcer');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'signmate-announcer';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
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

  // Update priority if needed
  liveRegion.setAttribute('aria-live', priority);

  // Clear and set message (forces announcement)
  liveRegion.textContent = '';
  setTimeout(() => {
    liveRegion!.textContent = message;
  }, 50);
}

// Keyboard shortcut definition
export interface KeyboardShortcut {
  id: string;
  keys: string[]; // e.g., ['Ctrl', 'Shift', 'P']
  description: string;
  category: 'pipeline' | 'display' | 'navigation' | 'emergency';
  enabled: boolean;
}

// Default SignMate keyboard shortcuts
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
    description: 'Pause/Resume avatar animation',
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
  {
    id: 'mute-audio',
    keys: ['M'],
    description: 'Mute/Unmute audio input',
    category: 'pipeline',
    enabled: true,
  },

  // Display controls
  {
    id: 'toggle-captions',
    keys: ['T'],
    description: 'Toggle captions visibility',
    category: 'display',
    enabled: true,
  },
  {
    id: 'toggle-fullscreen',
    keys: ['F'],
    description: 'Toggle fullscreen mode',
    category: 'display',
    enabled: true,
  },
  {
    id: 'increase-size',
    keys: ['+'],
    description: 'Increase avatar size',
    category: 'display',
    enabled: true,
  },
  {
    id: 'decrease-size',
    keys: ['-'],
    description: 'Decrease avatar size',
    category: 'display',
    enabled: true,
  },

  // Navigation
  {
    id: 'next-display',
    keys: ['→'],
    description: 'Next display mode',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'prev-display',
    keys: ['←'],
    description: 'Previous display mode',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'show-shortcuts',
    keys: ['?'],
    description: 'Show keyboard shortcuts',
    category: 'navigation',
    enabled: true,
  },
  {
    id: 'show-stats',
    keys: ['S'],
    description: 'Show performance stats',
    category: 'navigation',
    enabled: true,
  },

  // Emergency
  {
    id: 'emergency-stop',
    keys: ['Escape'],
    description: 'Emergency stop all',
    category: 'emergency',
    enabled: true,
  },
  {
    id: 'reset-system',
    keys: ['Ctrl', 'R'],
    description: 'Reset system to initial state',
    category: 'emergency',
    enabled: true,
  },
];

// Format key combination for display
export function formatKeyCombo(keys: string[]): string {
  return keys
    .map((key) => {
      switch (key) {
        case 'Space':
          return '␣';
        case 'Escape':
          return 'Esc';
        case '→':
          return '→';
        case '←':
          return '←';
        case '↑':
          return '↑';
        case '↓':
          return '↓';
        default:
          return key;
      }
    })
    .join(' + ');
}

// Check if reduced motion is preferred
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check if high contrast is preferred
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

// Focus management utilities
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

// Generate skip links
export function createSkipLink(targetId: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.className = 'skip-link';
  link.textContent = label;
  link.style.cssText = `
    position: absolute;
    left: -9999px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;

  link.addEventListener('focus', () => {
    link.style.cssText = `
      position: fixed;
      left: 10px;
      top: 10px;
      z-index: 9999;
      padding: 8px 16px;
      background: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
    `;
  });

  link.addEventListener('blur', () => {
    link.style.cssText = `
      position: absolute;
      left: -9999px;
      top: auto;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
  });

  return link;
}
