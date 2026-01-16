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
