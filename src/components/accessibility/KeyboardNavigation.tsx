'use client';

import { useEffect, useCallback, useState, useRef } from 'react';

interface KeyBinding {
  key: string;
  modifiers?: Array<'ctrl' | 'alt' | 'shift' | 'meta'>;
  action: () => void;
  description: string;
  category: 'pipeline' | 'display' | 'navigation' | 'accessibility';
  enabled?: boolean;
}

interface KeyboardNavigationProps {
  bindings: KeyBinding[];
  enabled?: boolean;
  onKeyPress?: (binding: KeyBinding) => void;
  children?: React.ReactNode;
}

interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  originalTabIndex: number | null;
}

export function KeyboardNavigation({
  bindings,
  enabled = true,
  onKeyPress,
  children,
}: KeyboardNavigationProps) {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Update active keys
      setActiveKeys((prev) => new Set(prev).add(event.key.toLowerCase()));

      // Check for matching binding
      for (const binding of bindings) {
        if (binding.enabled === false) continue;

        const keyMatches = event.key.toLowerCase() === binding.key.toLowerCase();
        const ctrlMatches =
          (!binding.modifiers?.includes('ctrl') && !event.ctrlKey) ||
          (binding.modifiers?.includes('ctrl') && event.ctrlKey);
        const altMatches =
          (!binding.modifiers?.includes('alt') && !event.altKey) ||
          (binding.modifiers?.includes('alt') && event.altKey);
        const shiftMatches =
          (!binding.modifiers?.includes('shift') && !event.shiftKey) ||
          (binding.modifiers?.includes('shift') && event.shiftKey);
        const metaMatches =
          (!binding.modifiers?.includes('meta') && !event.metaKey) ||
          (binding.modifiers?.includes('meta') && event.metaKey);

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          event.preventDefault();
          binding.action();
          onKeyPress?.(binding);
          return;
        }
      }
    },
    [enabled, bindings, onKeyPress]
  );

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(event.key.toLowerCase());
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return (
    <div ref={containerRef} className="keyboard-navigation">
      {children}
    </div>
  );
}

// Hook for managing focus within a container
export function useFocusManager(containerRef: React.RefObject<HTMLElement | null>) {
  const [focusableElements, setFocusableElements] = useState<FocusableElement[]>([]);
  const [currentFocusIndex, setCurrentFocusIndex] = useState(-1);

  // Find all focusable elements
  const updateFocusableElements = useCallback(() => {
    if (!containerRef.current) return;

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(selector)
    );

    setFocusableElements(
      elements.map((element, index) => ({
        element,
        tabIndex: index,
        originalTabIndex: element.getAttribute('tabindex')
          ? parseInt(element.getAttribute('tabindex')!, 10)
          : null,
      }))
    );
  }, [containerRef]);

  // Focus next element
  const focusNext = useCallback(() => {
    if (focusableElements.length === 0) return;

    const nextIndex = (currentFocusIndex + 1) % focusableElements.length;
    focusableElements[nextIndex].element.focus();
    setCurrentFocusIndex(nextIndex);
  }, [focusableElements, currentFocusIndex]);

  // Focus previous element
  const focusPrevious = useCallback(() => {
    if (focusableElements.length === 0) return;

    const prevIndex =
      currentFocusIndex <= 0
        ? focusableElements.length - 1
        : currentFocusIndex - 1;
    focusableElements[prevIndex].element.focus();
    setCurrentFocusIndex(prevIndex);
  }, [focusableElements, currentFocusIndex]);

  // Focus first element
  const focusFirst = useCallback(() => {
    if (focusableElements.length === 0) return;

    focusableElements[0].element.focus();
    setCurrentFocusIndex(0);
  }, [focusableElements]);

  // Focus last element
  const focusLast = useCallback(() => {
    if (focusableElements.length === 0) return;

    const lastIndex = focusableElements.length - 1;
    focusableElements[lastIndex].element.focus();
    setCurrentFocusIndex(lastIndex);
  }, [focusableElements]);

  // Track focus changes
  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      const index = focusableElements.findIndex((f) => f.element === target);
      if (index >= 0) {
        setCurrentFocusIndex(index);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [focusableElements]);

  // Update focusable elements on mount and when container changes
  useEffect(() => {
    updateFocusableElements();

    // Observe DOM changes
    if (!containerRef.current) return;

    const observer = new MutationObserver(updateFocusableElements);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex'],
    });

    return () => observer.disconnect();
  }, [containerRef, updateFocusableElements]);

  return {
    focusableElements,
    currentFocusIndex,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    updateFocusableElements,
  };
}

// Hook for skip link functionality
export function useSkipLinks(targets: Array<{ id: string; label: string }>) {
  const skipToTarget = useCallback((targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return { targets, skipToTarget };
}

// Skip Links Component
interface SkipLinksProps {
  links: Array<{ id: string; label: string }>;
}

export function SkipLinks({ links }: SkipLinksProps) {
  const { skipToTarget } = useSkipLinks(links);

  return (
    <div className="skip-links">
      <style jsx>{`
        .skip-links {
          position: absolute;
          top: -40px;
          left: 0;
          z-index: 10000;
        }
        .skip-link {
          position: absolute;
          top: 0;
          left: 0;
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          border-radius: 0 0 4px 0;
          transform: translateY(-100%);
          transition: transform 0.2s ease;
        }
        .skip-link:focus {
          transform: translateY(40px);
          outline: 2px solid #fff;
          outline-offset: 2px;
        }
      `}</style>

      {links.map((link, index) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          className="skip-link"
          style={{ left: `${index * 150}px` }}
          onClick={(e) => {
            e.preventDefault();
            skipToTarget(link.id);
          }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

// Focus Indicator Component
interface FocusIndicatorProps {
  visible?: boolean;
  style?: 'outline' | 'ring' | 'glow';
}

export function FocusIndicator({
  visible = true,
  style = 'ring',
}: FocusIndicatorProps) {
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target && target !== document.body) {
        setFocusedElement(target);
        setRect(target.getBoundingClientRect());
      }
    };

    const handleFocusOut = () => {
      setFocusedElement(null);
      setRect(null);
    };

    const handleScroll = () => {
      if (focusedElement) {
        setRect(focusedElement.getBoundingClientRect());
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [focusedElement]);

  if (!visible || !rect) return null;

  const getStyles = () => {
    switch (style) {
      case 'outline':
        return {
          border: '2px solid #2563eb',
          boxShadow: 'none',
        };
      case 'glow':
        return {
          border: '2px solid #2563eb',
          boxShadow: '0 0 12px rgba(37, 99, 235, 0.6)',
        };
      case 'ring':
      default:
        return {
          border: '2px solid #2563eb',
          boxShadow: '0 0 0 4px rgba(37, 99, 235, 0.25)',
        };
    }
  };

  return (
    <div
      className="focus-indicator"
      style={{
        position: 'fixed',
        top: rect.top - 2,
        left: rect.left - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        pointerEvents: 'none',
        borderRadius: '4px',
        transition: 'all 0.15s ease',
        zIndex: 9999,
        ...getStyles(),
      }}
    />
  );
}

// Roving Tab Index Manager
export function useRovingTabIndex(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string = '[role="option"], [role="menuitem"], [role="tab"]'
) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.querySelectorAll<HTMLElement>(selector);

    items.forEach((item, index) => {
      item.tabIndex = index === activeIndex ? 0 : -1;
    });
  }, [containerRef, selector, activeIndex]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!containerRef.current) return;

      const items = containerRef.current.querySelectorAll<HTMLElement>(selector);
      const itemCount = items.length;

      switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          setActiveIndex((prev) => (prev + 1) % itemCount);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          setActiveIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case 'Home':
          event.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setActiveIndex(itemCount - 1);
          break;
      }
    },
    [containerRef, selector]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const items = containerRef.current.querySelectorAll<HTMLElement>(selector);
    items[activeIndex]?.focus();
  }, [activeIndex, containerRef, selector]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

// Live Region for Announcements
interface LiveRegionProps {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

export function useLiveRegion({
  politeness = 'polite',
  atomic = true,
  relevant = 'additions',
}: LiveRegionProps = {}) {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!regionRef.current) {
      const region = document.createElement('div');
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', String(atomic));
      region.setAttribute('aria-relevant', relevant);
      region.style.cssText = `
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
      document.body.appendChild(region);
      regionRef.current = region;
    }

    return () => {
      if (regionRef.current) {
        document.body.removeChild(regionRef.current);
        regionRef.current = null;
      }
    };
  }, [politeness, atomic, relevant]);

  const announce = useCallback((text: string) => {
    setMessage(text);
    if (regionRef.current) {
      // Clear and re-set to trigger announcement
      regionRef.current.textContent = '';
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = text;
        }
      }, 50);
    }
  }, []);

  return { announce, message };
}
