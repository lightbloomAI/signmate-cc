export {
  keyboardManager,
  registerDefaultBindings,
  formatKeyCombo,
  type KeyBinding,
  type KeyCombo,
  type KeyHandler,
} from './keyboardManager';

// Focus management
export {
  focusManager,
  FocusTrap,
  RovingTabIndex,
  getFocusableElements,
  focusFirst,
  focusLast,
  isFocusable,
  createSkipLink,
  type FocusTrapConfig,
  type RovingTabIndexConfig,
} from './focusManager';

// React hooks
export {
  useKeyboardShortcut,
  useKeyboardShortcuts,
  useKeyboardBindings,
  useKeyPressed,
  useFocusTrap,
  useRovingTabIndex,
  useFocusOnMount,
  useFocusReturn,
  useFocusableElements,
  useArrowNavigation,
  useKeyboardEnabled,
} from './useKeyboard';
