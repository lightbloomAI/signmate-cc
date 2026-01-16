'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  notificationManager,
  type Notification,
  type NotificationType,
  type NotificationPosition,
} from '@/lib/notifications';

interface ToastContainerProps {
  position?: NotificationPosition;
}

const typeIcons: Record<NotificationType, string> = {
  info: 'ℹ',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

const typeColors: Record<NotificationType, { bg: string; border: string; icon: string }> = {
  info: {
    bg: 'rgba(37, 99, 235, 0.1)',
    border: '#2563eb',
    icon: '#3b82f6',
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: '#10b981',
    icon: '#10b981',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: '#f59e0b',
    icon: '#f59e0b',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: '#ef4444',
    icon: '#ef4444',
  },
};

const positionStyles: Record<NotificationPosition, React.CSSProperties> = {
  'top-right': { top: 16, right: 16 },
  'top-left': { top: 16, left: 16 },
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
  'bottom-center': { bottom: 16, left: '50%', transform: 'translateX(-50%)' },
};

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  useEffect(() => {
    return notificationManager.subscribe(setNotifications);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDismissing((prev) => new Set(prev).add(id));

    // Wait for animation then remove
    setTimeout(() => {
      notificationManager.dismiss(id);
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div
      className="toast-container"
      style={positionStyles[position]}
      role="region"
      aria-label="Notifications"
    >
      <style jsx>{`
        .toast-container {
          position: fixed;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
          max-width: 400px;
          width: calc(100vw - 32px);
        }

        .toast {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: #1f2937;
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          pointer-events: auto;
          animation: slideIn 0.2s ease-out;
          border-left: 3px solid;
        }

        .toast.dismissing {
          animation: slideOut 0.2s ease-in forwards;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(20px);
          }
        }

        .toast-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .toast-content {
          flex: 1;
          min-width: 0;
        }

        .toast-title {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 2px;
        }

        .toast-message {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.4;
        }

        .toast-action {
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          background: transparent;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #e5e7eb;
          cursor: pointer;
          margin-top: 8px;
        }

        .toast-action:hover {
          background: #374151;
        }

        .toast-dismiss {
          padding: 4px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .toast-dismiss:hover {
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.1);
        }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: currentColor;
          border-radius: 0 0 0 8px;
          animation: progress linear forwards;
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>

      {notifications.map((notification) => {
        const colors = typeColors[notification.type];
        const isDismissing = dismissing.has(notification.id);

        return (
          <div
            key={notification.id}
            className={`toast ${isDismissing ? 'dismissing' : ''}`}
            style={{
              background: colors.bg,
              borderLeftColor: colors.border,
            }}
            role="alert"
            aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
          >
            <div
              className="toast-icon"
              style={{
                background: `${colors.icon}20`,
                color: colors.icon,
              }}
            >
              {typeIcons[notification.type]}
            </div>

            <div className="toast-content">
              <div className="toast-title">{notification.title}</div>
              {notification.message && (
                <div className="toast-message">{notification.message}</div>
              )}
              {notification.action && (
                <button
                  className="toast-action"
                  onClick={() => {
                    notification.action?.onClick();
                    handleDismiss(notification.id);
                  }}
                >
                  {notification.action.label}
                </button>
              )}
            </div>

            {notification.dismissible && (
              <button
                className="toast-dismiss"
                onClick={() => handleDismiss(notification.id)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            )}

            {notification.duration && notification.duration > 0 && (
              <div
                className="toast-progress"
                style={{
                  color: colors.border,
                  animationDuration: `${notification.duration}ms`,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
