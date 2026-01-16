'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  retryable?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          showDetails={this.props.showDetails}
          onRetry={this.props.retryable ? this.handleRetry : undefined}
        />
      );
    }

    return this.props.children;
  }
}

// Error display component
interface ErrorDisplayProps {
  error: Error | null;
  errorInfo?: ErrorInfo | null;
  showDetails?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'page' | 'card' | 'inline' | 'toast';
  className?: string;
}

export function ErrorDisplay({
  error,
  errorInfo,
  showDetails = false,
  onRetry,
  onDismiss,
  variant = 'card',
  className = '',
}: ErrorDisplayProps) {
  const getMessage = () => {
    if (!error) return 'An unexpected error occurred';
    if (error.message.includes('network') || error.message.includes('Network')) {
      return 'Network connection error. Please check your internet connection.';
    }
    if (error.message.includes('permission') || error.message.includes('Permission')) {
      return 'Permission denied. Please check your browser settings.';
    }
    if (error.message.includes('microphone') || error.message.includes('Microphone')) {
      return 'Microphone access error. Please grant microphone permissions.';
    }
    return error.message || 'An unexpected error occurred';
  };

  if (variant === 'page') {
    return (
      <div className={`error-page ${className}`}>
        <style jsx>{`
          .error-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
          }

          .error-icon {
            width: 80px;
            height: 80px;
            background: rgba(239, 68, 68, 0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin-bottom: 24px;
          }

          .error-title {
            font-size: 28px;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 12px;
            text-align: center;
          }

          .error-message {
            font-size: 16px;
            color: #94a3b8;
            text-align: center;
            max-width: 500px;
            line-height: 1.6;
            margin-bottom: 24px;
          }

          .error-actions {
            display: flex;
            gap: 12px;
          }

          .error-button {
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .error-button.primary {
            background: #2563eb;
            color: white;
          }

          .error-button.primary:hover {
            background: #1d4ed8;
          }

          .error-button.secondary {
            background: rgba(100, 116, 139, 0.2);
            color: #e2e8f0;
            border: 1px solid rgba(148, 163, 184, 0.2);
          }

          .error-button.secondary:hover {
            background: rgba(100, 116, 139, 0.3);
          }

          .error-details {
            margin-top: 32px;
            padding: 16px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            max-width: 600px;
            width: 100%;
            overflow: auto;
          }

          .error-details-title {
            font-size: 12px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .error-stack {
            font-size: 12px;
            font-family: monospace;
            color: #ef4444;
            white-space: pre-wrap;
            word-break: break-word;
          }
        `}</style>

        <div className="error-icon">⚠</div>
        <h1 className="error-title">Something went wrong</h1>
        <p className="error-message">{getMessage()}</p>

        <div className="error-actions">
          {onRetry && (
            <button className="error-button primary" onClick={onRetry}>
              Try Again
            </button>
          )}
          <button
            className="error-button secondary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>

        {showDetails && error?.stack && (
          <div className="error-details">
            <div className="error-details-title">Error Details</div>
            <pre className="error-stack">{error.stack}</pre>
            {errorInfo?.componentStack && (
              <>
                <div className="error-details-title" style={{ marginTop: 16 }}>
                  Component Stack
                </div>
                <pre className="error-stack">{errorInfo.componentStack}</pre>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`error-inline ${className}`}>
        <style jsx>{`
          .error-inline {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 6px;
            font-size: 13px;
            color: #fca5a5;
          }

          .error-inline-icon {
            flex-shrink: 0;
          }

          .error-inline-message {
            flex: 1;
          }

          .error-inline-action {
            flex-shrink: 0;
            padding: 4px 8px;
            background: transparent;
            border: 1px solid rgba(239, 68, 68, 0.5);
            border-radius: 4px;
            color: #fca5a5;
            font-size: 11px;
            cursor: pointer;
          }

          .error-inline-action:hover {
            background: rgba(239, 68, 68, 0.2);
          }
        `}</style>

        <span className="error-inline-icon">⚠</span>
        <span className="error-inline-message">{getMessage()}</span>
        {onRetry && (
          <button className="error-inline-action" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="error-inline-action" onClick={onDismiss}>
            ×
          </button>
        )}
      </div>
    );
  }

  if (variant === 'toast') {
    return (
      <div className={`error-toast ${className}`}>
        <style jsx>{`
          .error-toast {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 14px 16px;
            background: #1f2937;
            border: 1px solid #374151;
            border-left: 4px solid #ef4444;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            animation: slideIn 0.3s ease;
          }

          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          .toast-icon {
            width: 32px;
            height: 32px;
            background: rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            flex-shrink: 0;
          }

          .toast-content {
            flex: 1;
            min-width: 0;
          }

          .toast-title {
            font-size: 14px;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 4px;
          }

          .toast-message {
            font-size: 13px;
            color: #9ca3af;
            line-height: 1.4;
          }

          .toast-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
          }

          .toast-button {
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .toast-button.retry {
            background: #ef4444;
            color: white;
          }

          .toast-button.retry:hover {
            background: #dc2626;
          }

          .toast-button.dismiss {
            background: #374151;
            color: #e5e7eb;
          }

          .toast-button.dismiss:hover {
            background: #4b5563;
          }

          .toast-close {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: #6b7280;
            cursor: pointer;
            border-radius: 4px;
          }

          .toast-close:hover {
            background: #374151;
            color: #f8fafc;
          }
        `}</style>

        <div className="toast-icon">⚠</div>
        <div className="toast-content">
          <div className="toast-title">Error</div>
          <div className="toast-message">{getMessage()}</div>
          {(onRetry || onDismiss) && (
            <div className="toast-actions">
              {onRetry && (
                <button className="toast-button retry" onClick={onRetry}>
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button className="toast-button dismiss" onClick={onDismiss}>
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`error-card ${className}`}>
      <style jsx>{`
        .error-card {
          padding: 24px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 12px;
          max-width: 500px;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 16px;
        }

        .card-icon {
          width: 48px;
          height: 48px;
          background: rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .card-message {
          font-size: 14px;
          color: #9ca3af;
          line-height: 1.5;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }

        .card-button {
          flex: 1;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .card-button.primary {
          background: #2563eb;
          color: white;
        }

        .card-button.primary:hover {
          background: #1d4ed8;
        }

        .card-button.secondary {
          background: #374151;
          color: #e5e7eb;
        }

        .card-button.secondary:hover {
          background: #4b5563;
        }

        .card-details {
          margin-top: 16px;
          padding: 12px;
          background: #111827;
          border-radius: 8px;
          font-size: 11px;
          font-family: monospace;
          color: #ef4444;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 200px;
          overflow: auto;
        }
      `}</style>

      <div className="card-header">
        <div className="card-icon">⚠</div>
        <div>
          <h3 className="card-title">Something went wrong</h3>
          <p className="card-message">{getMessage()}</p>
        </div>
      </div>

      {showDetails && error?.stack && (
        <pre className="card-details">{error.stack}</pre>
      )}

      <div className="card-actions">
        {onRetry && (
          <button className="card-button primary" onClick={onRetry}>
            Try Again
          </button>
        )}
        {onDismiss && (
          <button className="card-button secondary" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
