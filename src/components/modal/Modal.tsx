'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

const SIZE_CONFIG = {
  small: { maxWidth: '400px', width: '90%' },
  medium: { maxWidth: '600px', width: '90%' },
  large: { maxWidth: '800px', width: '90%' },
  fullscreen: { maxWidth: '100%', width: '100%', height: '100%' },
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer,
  className = '',
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstFocusable?.focus();

    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnOverlayClick && event.target === event.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  if (!mounted || !isOpen) return null;

  const sizeConfig = SIZE_CONFIG[size];

  const modalContent = (
    <div
      className={`modal-overlay ${isOpen ? 'open' : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-container {
          display: flex;
          flex-direction: column;
          background: #111827;
          border-radius: 12px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          animation: slideIn 0.2s ease;
          overflow: hidden;
        }

        .modal-container.fullscreen {
          border-radius: 0;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }

        .close-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: #374151;
          color: #f9fafb;
        }

        .modal-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          background: #1f2937;
          border-top: 1px solid #374151;
        }
      `}</style>

      <div
        ref={modalRef}
        className={`modal-container ${size === 'fullscreen' ? 'fullscreen' : ''} ${className}`}
        style={{
          maxWidth: sizeConfig.maxWidth,
          width: sizeConfig.width,
          maxHeight: size === 'fullscreen' ? '100%' : '90vh',
        }}
      >
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 id="modal-title" className="modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                className="close-button"
                onClick={onClose}
                aria-label="Close modal"
              >
                ×
              </button>
            )}
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Confirm Dialog
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'secondary' : 'primary'}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: '#9ca3af', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// Alert Dialog
interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  buttonLabel?: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
}

const ALERT_ICONS: Record<string, { icon: string; color: string }> = {
  info: { icon: 'ℹ', color: '#3b82f6' },
  success: { icon: '✓', color: '#10b981' },
  warning: { icon: '⚠', color: '#f59e0b' },
  error: { icon: '✕', color: '#ef4444' },
};

export function AlertDialog({
  isOpen,
  onClose,
  title,
  message,
  buttonLabel = 'OK',
  variant = 'info',
}: AlertDialogProps) {
  const config = ALERT_ICONS[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      showCloseButton={false}
      footer={<Button onClick={onClose}>{buttonLabel}</Button>}
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <div
          style={{
            width: 56,
            height: 56,
            margin: '0 auto 16px',
            background: `${config.color}20`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            color: config.color,
          }}
        >
          {config.icon}
        </div>
        {title && (
          <h3
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#f9fafb',
              marginBottom: 8,
            }}
          >
            {title}
          </h3>
        )}
        <p style={{ color: '#9ca3af', lineHeight: 1.6 }}>{message}</p>
      </div>
    </Modal>
  );
}

// Drawer (slide-in panel)
interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'bottom';
  size?: 'small' | 'medium' | 'large';
}

const DRAWER_SIZES = {
  small: 300,
  medium: 400,
  large: 500,
};

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'medium',
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const sizeValue = DRAWER_SIZES[size];

  const getPositionStyles = () => {
    switch (position) {
      case 'left':
        return {
          left: 0,
          top: 0,
          bottom: 0,
          width: sizeValue,
          animation: 'slideInLeft 0.3s ease',
        };
      case 'right':
        return {
          right: 0,
          top: 0,
          bottom: 0,
          width: sizeValue,
          animation: 'slideInRight 0.3s ease',
        };
      case 'bottom':
        return {
          left: 0,
          right: 0,
          bottom: 0,
          height: sizeValue,
          animation: 'slideInBottom 0.3s ease',
        };
    }
  };

  const drawerContent = (
    <div className="drawer-overlay" onClick={onClose}>
      <style jsx>{`
        .drawer-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          background: rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes slideInBottom {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .drawer-panel {
          position: absolute;
          display: flex;
          flex-direction: column;
          background: #111827;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .drawer-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }

        .drawer-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #9ca3af;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .drawer-close:hover {
          background: #374151;
          color: #f9fafb;
        }

        .drawer-body {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
        }
      `}</style>

      <div
        className="drawer-panel"
        style={getPositionStyles()}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="drawer-header">
            <h3 className="drawer-title">{title}</h3>
            <button className="drawer-close" onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
}

// Hook for managing modal state
export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return { isOpen, open, close, toggle };
}
