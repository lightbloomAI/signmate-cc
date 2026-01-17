'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';

// Toast Types
export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  info: (message: string, options?: Partial<Toast>) => string;
  success: (message: string, options?: Partial<Toast>) => string;
  warning: (message: string, options?: Partial<Toast>) => string;
  error: (message: string, options?: Partial<Toast>) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Toast Provider
interface ToastProviderProps {
  children: React.ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId();
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration,
    };

    setToasts((prev) => {
      const updated = [newToast, ...prev];
      // Limit to maxToasts
      if (updated.length > maxToasts) {
        return updated.slice(0, maxToasts);
      }
      return updated;
    });

    return id;
  }, [generateId, defaultDuration, maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast?.onClose) {
        toast.onClose();
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    toasts.forEach((toast) => {
      if (toast.onClose) {
        toast.onClose();
      }
    });
    setToasts([]);
  }, [toasts]);

  // Convenience methods
  const info = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const success = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const warning = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const error = useCallback((message: string, options?: Partial<Toast>) => {
    return addToast({ type: 'error', message, ...options });
  }, [addToast]);

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    info,
    success,
    warning,
    error,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {mounted && <ToastContainer toasts={toasts} position={position} removeToast={removeToast} />}
    </ToastContext.Provider>
  );
}

// Toast Hook
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Container
interface ToastContainerProps {
  toasts: Toast[];
  position: ToastPosition;
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, position, removeToast }: ToastContainerProps) {
  const getPositionStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10001,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: '16px',
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top-left':
        return { ...base, top: 0, left: 0, alignItems: 'flex-start' };
      case 'top-center':
        return { ...base, top: 0, left: '50%', transform: 'translateX(-50%)', alignItems: 'center' };
      case 'top-right':
        return { ...base, top: 0, right: 0, alignItems: 'flex-end' };
      case 'bottom-left':
        return { ...base, bottom: 0, left: 0, alignItems: 'flex-start', flexDirection: 'column-reverse' };
      case 'bottom-center':
        return { ...base, bottom: 0, left: '50%', transform: 'translateX(-50%)', alignItems: 'center', flexDirection: 'column-reverse' };
      case 'bottom-right':
        return { ...base, bottom: 0, right: 0, alignItems: 'flex-end', flexDirection: 'column-reverse' };
    }
  };

  if (toasts.length === 0) return null;

  return createPortal(
    <div style={getPositionStyles()}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>,
    document.body
  );
}

// Toast Item
interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const TOAST_ICONS: Record<ToastType, { icon: string; color: string; bg: string }> = {
  info: { icon: 'ℹ', color: '#3b82f6', bg: '#1e3a5f' },
  success: { icon: '✓', color: '#10b981', bg: '#064e3b' },
  warning: { icon: '⚠', color: '#f59e0b', bg: '#78350f' },
  error: { icon: '✕', color: '#ef4444', bg: '#7f1d1d' },
};

function ToastItem({ toast, onClose }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const config = TOAST_ICONS[toast.type];

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    if (!toast.persistent && toast.duration) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, toast.duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [toast.duration, toast.persistent]);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 200);
  }, [onClose]);

  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!toast.persistent && toast.duration) {
      timerRef.current = setTimeout(() => {
        handleClose();
      }, toast.duration / 2);
    }
  }, [toast.persistent, toast.duration, handleClose]);

  return (
    <div
      className={`toast-item ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="polite"
    >
      <style jsx>{`
        .toast-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 300px;
          max-width: 420px;
          padding: 14px 16px;
          background: #1f2937;
          border-radius: 10px;
          border-left: 4px solid ${config.color};
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
          pointer-events: auto;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.2s ease;
        }

        .toast-item.visible {
          opacity: 1;
          transform: translateX(0);
        }

        .toast-item.exiting {
          opacity: 0;
          transform: translateX(100%);
        }

        .toast-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          background: ${config.bg};
          color: ${config.color};
        }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-title {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0 0 4px 0;
        }

        .toast-message {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .toast-action {
          margin-top: 8px;
        }

        .toast-action-button {
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 500;
          color: ${config.color};
          background: ${config.bg};
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toast-action-button:hover {
          filter: brightness(1.2);
        }

        .toast-close {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #6b7280;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toast-close:hover {
          background: #374151;
          color: #f9fafb;
        }
      `}</style>

      <div className="toast-icon">{config.icon}</div>

      <div className="toast-content">
        {toast.title && <h4 className="toast-title">{toast.title}</h4>}
        <p className="toast-message">{toast.message}</p>
        {toast.action && (
          <div className="toast-action">
            <button
              className="toast-action-button"
              onClick={() => {
                toast.action?.onClick();
                handleClose();
              }}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      <button className="toast-close" onClick={handleClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}

// Standalone Toast Component (for use without provider)
interface StandaloneToastProps {
  type: ToastType;
  title?: string;
  message: string;
  onClose: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function StandaloneToast({ type, title, message, onClose, action }: StandaloneToastProps) {
  const config = TOAST_ICONS[type];

  return (
    <div className="standalone-toast" role="alert">
      <style jsx>{`
        .standalone-toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #1f2937;
          border-radius: 10px;
          border-left: 4px solid ${config.color};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .toast-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          background: ${config.bg};
          color: ${config.color};
        }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-title {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0 0 4px 0;
        }

        .toast-message {
          font-size: 13px;
          color: #9ca3af;
          margin: 0;
          line-height: 1.5;
        }

        .toast-action {
          margin-top: 8px;
        }

        .toast-action-button {
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 500;
          color: ${config.color};
          background: ${config.bg};
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toast-action-button:hover {
          filter: brightness(1.2);
        }

        .toast-close {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #6b7280;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .toast-close:hover {
          background: #374151;
          color: #f9fafb;
        }
      `}</style>

      <div className="toast-icon">{config.icon}</div>

      <div className="toast-content">
        {title && <h4 className="toast-title">{title}</h4>}
        <p className="toast-message">{message}</p>
        {action && (
          <div className="toast-action">
            <button
              className="toast-action-button"
              onClick={() => {
                action.onClick();
                onClose();
              }}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        ×
      </button>
    </div>
  );
}

// Toast Queue for managing toasts outside of React
class ToastQueue {
  private listeners: Set<(toast: Omit<Toast, 'id'>) => void> = new Set();

  subscribe(listener: (toast: Omit<Toast, 'id'>) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(toast: Omit<Toast, 'id'>) {
    this.listeners.forEach((listener) => listener(toast));
  }

  info(message: string, options?: Partial<Toast>) {
    this.emit({ type: 'info', message, ...options });
  }

  success(message: string, options?: Partial<Toast>) {
    this.emit({ type: 'success', message, ...options });
  }

  warning(message: string, options?: Partial<Toast>) {
    this.emit({ type: 'warning', message, ...options });
  }

  error(message: string, options?: Partial<Toast>) {
    this.emit({ type: 'error', message, ...options });
  }
}

export const toastQueue = new ToastQueue();

// Hook to listen to toast queue
export function useToastQueue() {
  const toast = useToast();

  useEffect(() => {
    const unsubscribe = toastQueue.subscribe((toastData) => {
      toast.addToast(toastData);
    });

    return unsubscribe;
  }, [toast]);
}
