export {
  // Announcement functions
  initLiveRegion,
  announce,
  announceError,
  announceSuccess,

  // Focus management
  createFocusTrap,
  createSkipLink,
  focusOnNavigate,
  trapFocus,

  // User preferences
  prefersReducedMotion,
  prefersHighContrast,
  prefersDarkMode,

  // Utilities
  generateId,
  ariaLabels,
  getStatusDescription,
  formatDurationForSR,
  formatSignForSR,

  // Keyboard shortcuts
  DEFAULT_SHORTCUTS,
  formatKeyCombo,

  // Types
  type AnnouncePriority,
  type KeyboardShortcut,
} from './a11y';

// New Accessibility Manager system
export {
  AccessibilityManager,
  getAccessibilityManager,
  createAccessibilityManager,
  type AccessibilityPreferences,
  type AnnouncementPriority,
  type FocusTrapOptions,
  type AccessibilityEventType,
  type AccessibilityEvent,
} from './accessibilityManager';

export {
  useAccessibility,
  useAnnounce,
  useFocusTrap,
  useReducedMotion,
  useHighContrast,
  useCaptionStyles,
  useColorBlindSafePalette,
  useKeyboardNavigation,
  useAriaLive,
  useSkipLink,
} from './useAccessibility.js';
