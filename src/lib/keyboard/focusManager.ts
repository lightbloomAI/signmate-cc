/**
 * Focus Manager for SignMate
 *
 * Provides focus trapping, focus restoration, and roving tabindex
 * for enhanced keyboard navigation and accessibility.
 */

/**
 * Focus trap configuration
 */
export interface FocusTrapConfig {
  container: HTMLElement;
  initialFocus?: HTMLElement | string;
  returnFocus?: HTMLElement;
  allowOutsideClick?: boolean;
  escapeDeactivates?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

/**
 * Roving tabindex configuration
 */
export interface RovingTabIndexConfig {
  container: HTMLElement;
  selector: string;
  orientation?: 'horizontal' | 'vertical' | 'both';
  wrap?: boolean;
  onSelect?: (element: HTMLElement, index: number) => void;
}

/**
 * Focus Trap Class
 *
 * Traps keyboard focus within a container element.
 */
export class FocusTrap {
  private config: FocusTrapConfig;
  private isActive = false;
  private previousFocus: HTMLElement | null = null;

  constructor(config: FocusTrapConfig) {
    this.config = config;
  }

  /**
   * Activate the focus trap
   */
  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.previousFocus = document.activeElement as HTMLElement;

    // Add event listeners
    this.config.container.addEventListener('keydown', this.handleKeyDown);

    if (!this.config.allowOutsideClick) {
      document.addEventListener('mousedown', this.handleOutsideClick, true);
      document.addEventListener('touchstart', this.handleOutsideClick, true);
    }

    // Focus initial element
    this.focusInitial();

    this.config.onActivate?.();
  }

  /**
   * Deactivate the focus trap
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;

    // Remove event listeners
    this.config.container.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousedown', this.handleOutsideClick, true);
    document.removeEventListener('touchstart', this.handleOutsideClick, true);

    // Restore focus
    const returnTo = this.config.returnFocus || this.previousFocus;
    if (returnTo && document.contains(returnTo)) {
      returnTo.focus();
    }

    this.config.onDeactivate?.();
  }

  /**
   * Focus the initial element
   */
  private focusInitial(): void {
    let element: HTMLElement | null = null;

    if (this.config.initialFocus) {
      if (typeof this.config.initialFocus === 'string') {
        element = this.config.container.querySelector(this.config.initialFocus);
      } else {
        element = this.config.initialFocus;
      }
    }

    if (!element) {
      const focusable = this.getFocusableElements();
      element = focusable[0] || null;
    }

    if (element) {
      element.focus();
    } else {
      // If no focusable element, focus the container itself
      this.config.container.tabIndex = -1;
      this.config.container.focus();
    }
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.config.escapeDeactivates !== false) {
      event.preventDefault();
      this.deactivate();
      return;
    }

    if (event.key === 'Tab') {
      this.handleTab(event);
    }
  };

  /**
   * Handle tab navigation within trap
   */
  private handleTab(event: KeyboardEvent): void {
    const focusable = this.getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;

    if (event.shiftKey) {
      // Shift+Tab: go backwards
      if (current === first || !this.config.container.contains(current)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      // Tab: go forwards
      if (current === last || !this.config.container.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  /**
   * Handle clicks outside the trap
   */
  private handleOutsideClick = (event: Event): void => {
    if (!this.config.container.contains(event.target as Node)) {
      event.preventDefault();
      event.stopPropagation();
      // Re-focus within the trap
      this.focusInitial();
    }
  };

  /**
   * Get focusable elements within container
   */
  private getFocusableElements(): HTMLElement[] {
    return getFocusableElements(this.config.container);
  }

  /**
   * Check if trap is active
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FocusTrapConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Roving TabIndex Manager
 *
 * Implements roving tabindex pattern for keyboard navigation within groups.
 */
export class RovingTabIndex {
  private config: RovingTabIndexConfig;
  private currentIndex = 0;

  constructor(config: RovingTabIndexConfig) {
    this.config = config;
    this.init();
  }

  /**
   * Initialize roving tabindex
   */
  private init(): void {
    const elements = this.getElements();

    // Set initial tabindex values
    elements.forEach((el, index) => {
      el.tabIndex = index === this.currentIndex ? 0 : -1;
    });

    // Add event listeners
    this.config.container.addEventListener('keydown', this.handleKeyDown);
    this.config.container.addEventListener('focusin', this.handleFocusIn);
  }

  /**
   * Handle keydown for arrow navigation
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const elements = this.getElements();
    if (elements.length === 0) return;

    let newIndex = this.currentIndex;
    const { orientation = 'both', wrap = true } = this.config;

    switch (event.key) {
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = wrap
            ? (this.currentIndex - 1 + elements.length) % elements.length
            : Math.max(0, this.currentIndex - 1);
        }
        break;

      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          newIndex = wrap
            ? (this.currentIndex + 1) % elements.length
            : Math.min(elements.length - 1, this.currentIndex + 1);
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = wrap
            ? (this.currentIndex - 1 + elements.length) % elements.length
            : Math.max(0, this.currentIndex - 1);
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          newIndex = wrap
            ? (this.currentIndex + 1) % elements.length
            : Math.min(elements.length - 1, this.currentIndex + 1);
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = elements.length - 1;
        break;

      default:
        return;
    }

    if (newIndex !== this.currentIndex) {
      this.setCurrentIndex(newIndex);
    }
  };

  /**
   * Handle focus in to track current element
   */
  private handleFocusIn = (event: FocusEvent): void => {
    const elements = this.getElements();
    const index = elements.indexOf(event.target as HTMLElement);
    if (index >= 0) {
      this.currentIndex = index;
    }
  };

  /**
   * Set the current active index
   */
  setCurrentIndex(index: number): void {
    const elements = this.getElements();
    if (index < 0 || index >= elements.length) return;

    // Update tabindex values
    elements[this.currentIndex].tabIndex = -1;
    elements[index].tabIndex = 0;
    elements[index].focus();

    this.currentIndex = index;
    this.config.onSelect?.(elements[index], index);
  }

  /**
   * Get elements matching selector
   */
  private getElements(): HTMLElement[] {
    return Array.from(
      this.config.container.querySelectorAll<HTMLElement>(this.config.selector)
    );
  }

  /**
   * Get current index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.config.container.removeEventListener('keydown', this.handleKeyDown);
    this.config.container.removeEventListener('focusin', this.handleFocusIn);
  }
}

/**
 * Focus Manager Singleton
 *
 * Manages focus state, focus stack, and active focus traps.
 */
class FocusManagerSingleton {
  private focusStack: HTMLElement[] = [];
  private activeTrap: FocusTrap | null = null;
  private rovingManagers = new Map<HTMLElement, RovingTabIndex>();

  /**
   * Create and activate a focus trap
   */
  trap(config: FocusTrapConfig): FocusTrap {
    // Deactivate any existing trap
    this.release();

    const trap = new FocusTrap(config);
    this.activeTrap = trap;
    trap.activate();

    return trap;
  }

  /**
   * Release the current focus trap
   */
  release(): void {
    if (this.activeTrap) {
      this.activeTrap.deactivate();
      this.activeTrap = null;
    }
  }

  /**
   * Push current focus to stack and focus new element
   */
  push(element: HTMLElement): void {
    const current = document.activeElement as HTMLElement;
    if (current && document.contains(current)) {
      this.focusStack.push(current);
    }
    element.focus();
  }

  /**
   * Pop focus stack and restore previous focus
   */
  pop(): void {
    const previous = this.focusStack.pop();
    if (previous && document.contains(previous)) {
      previous.focus();
    }
  }

  /**
   * Get focus stack
   */
  getStack(): HTMLElement[] {
    return [...this.focusStack];
  }

  /**
   * Clear focus stack
   */
  clearStack(): void {
    this.focusStack = [];
  }

  /**
   * Create a roving tabindex manager
   */
  createRoving(config: RovingTabIndexConfig): RovingTabIndex {
    const existing = this.rovingManagers.get(config.container);
    if (existing) {
      existing.destroy();
    }

    const roving = new RovingTabIndex(config);
    this.rovingManagers.set(config.container, roving);

    return roving;
  }

  /**
   * Remove a roving tabindex manager
   */
  removeRoving(container: HTMLElement): void {
    const roving = this.rovingManagers.get(container);
    if (roving) {
      roving.destroy();
      this.rovingManagers.delete(container);
    }
  }

  /**
   * Get the currently active trap
   */
  getActiveTrap(): FocusTrap | null {
    return this.activeTrap;
  }
}

// Singleton instance
export const focusManager = new FocusManagerSingleton();

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
    '[contenteditable="true"]:not([tabindex="-1"])',
  ].join(',');

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(selector)
  );

  // Filter out hidden elements
  return elements.filter((el) => {
    if (el.offsetParent === null) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

/**
 * Focus the first focusable element in a container
 */
export function focusFirst(container: HTMLElement): boolean {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[0].focus();
    return true;
  }
  return false;
}

/**
 * Focus the last focusable element in a container
 */
export function focusLast(container: HTMLElement): boolean {
  const elements = getFocusableElements(container);
  if (elements.length > 0) {
    elements[elements.length - 1].focus();
    return true;
  }
  return false;
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if ((element as HTMLButtonElement).disabled) return false;

  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none') return false;

  return true;
}

/**
 * Create a skip link that focuses a target element
 */
export function createSkipLink(
  targetId: string,
  label: string = 'Skip to main content'
): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = label;
  link.className = 'sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-black focus:p-4 focus:rounded';

  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.removeAttribute('tabindex');
    }
  });

  return link;
}
