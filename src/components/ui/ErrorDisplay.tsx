'use client';

import { useState } from 'react';
import { ErrorSeverity, ErrorMetadataMap, type SignMateError, type ErrorCode } from '@/lib/errors/types';

interface ErrorDisplayProps {
  errors: SignMateError[];
  onDismiss?: (errorId: string) => void;
  onDismissAll?: () => void;
  compact?: boolean;
  maxVisible?: number;
}

export function ErrorDisplay({
  errors,
  onDismiss,
  onDismissAll,
  compact = false,
  maxVisible = 3,
}: ErrorDisplayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (errors.length === 0) return null;

  const visibleErrors = errors.slice(-maxVisible);
  const hiddenCount = errors.length - maxVisible;

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return { bg: '#7f1d1d', border: '#ef4444', text: '#fca5a5' };
      case ErrorSeverity.HIGH:
        return { bg: '#7c2d12', border: '#f97316', text: '#fed7aa' };
      case ErrorSeverity.MEDIUM:
        return { bg: '#78350f', border: '#f59e0b', text: '#fde68a' };
      case ErrorSeverity.LOW:
      default:
        return { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' };
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return '!!';
      case ErrorSeverity.HIGH:
        return '!';
      case ErrorSeverity.MEDIUM:
        return '^';
      case ErrorSeverity.LOW:
      default:
        return 'i';
    }
  };

  const getRecoveryAction = (error: SignMateError) => {
    const metadata = ErrorMetadataMap[error.code as ErrorCode];
    return metadata?.recoveryAction;
  };

  if (compact) {
    return (
      <div className="error-display-compact">
        <style jsx>{`
          .error-display-compact {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: ${getSeverityColor(visibleErrors[visibleErrors.length - 1]?.severity || ErrorSeverity.LOW).bg};
            border-left: 3px solid ${getSeverityColor(visibleErrors[visibleErrors.length - 1]?.severity || ErrorSeverity.LOW).border};
            border-radius: 4px;
            font-size: 13px;
          }
          .error-count {
            background: rgba(255, 255, 255, 0.15);
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 11px;
          }
          .error-message {
            flex: 1;
            color: ${getSeverityColor(visibleErrors[visibleErrors.length - 1]?.severity || ErrorSeverity.LOW).text};
          }
          .dismiss-btn {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            padding: 4px;
            font-size: 16px;
            line-height: 1;
          }
          .dismiss-btn:hover {
            color: white;
          }
        `}</style>
        <span className="error-count">{errors.length}</span>
        <span className="error-message">
          {visibleErrors[visibleErrors.length - 1]?.message}
        </span>
        {onDismissAll && (
          <button className="dismiss-btn" onClick={onDismissAll} title="Dismiss all">
            x
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="error-display">
      <style jsx>{`
        .error-display {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-width: 400px;
        }
        .error-card {
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid;
          transition: all 0.2s ease;
        }
        .error-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .severity-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
        }
        .error-content {
          flex: 1;
          min-width: 0;
        }
        .error-message-text {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .error-code {
          font-size: 11px;
          opacity: 0.7;
          font-family: monospace;
        }
        .error-details {
          margin-top: 8px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          font-size: 12px;
          opacity: 0.9;
        }
        .recovery-action {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .recovery-label {
          opacity: 0.7;
          font-size: 10px;
          text-transform: uppercase;
        }
        .dismiss-button {
          background: none;
          border: none;
          color: inherit;
          opacity: 0.6;
          cursor: pointer;
          padding: 4px;
          font-size: 18px;
          line-height: 1;
          margin-left: auto;
        }
        .dismiss-button:hover {
          opacity: 1;
        }
        .expand-button {
          background: none;
          border: none;
          color: inherit;
          opacity: 0.6;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 11px;
          margin-top: 4px;
        }
        .expand-button:hover {
          opacity: 1;
          text-decoration: underline;
        }
        .hidden-count {
          text-align: center;
          font-size: 12px;
          opacity: 0.7;
          padding: 4px;
        }
        .dismiss-all {
          text-align: center;
          padding: 8px;
        }
        .dismiss-all-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.8);
          padding: 6px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .dismiss-all-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {hiddenCount > 0 && (
        <div className="hidden-count">
          +{hiddenCount} more error{hiddenCount > 1 ? 's' : ''}
        </div>
      )}

      {visibleErrors.map((error) => {
        const colors = getSeverityColor(error.severity);
        const isExpanded = expandedId === error.id;
        const recovery = getRecoveryAction(error);

        return (
          <div
            key={error.id}
            className="error-card"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            <div className="error-header">
              <div
                className="severity-badge"
                style={{ backgroundColor: colors.border, color: colors.bg }}
              >
                {getSeverityIcon(error.severity)}
              </div>
              <div className="error-content">
                <div className="error-message-text">{error.message}</div>
                <div className="error-code">{error.code}</div>
                {error.details && (
                  <button
                    className="expand-button"
                    onClick={() => setExpandedId(isExpanded ? null : error.id)}
                  >
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </button>
                )}
              </div>
              {onDismiss && (
                <button
                  className="dismiss-button"
                  onClick={() => onDismiss(error.id)}
                  title="Dismiss"
                >
                  x
                </button>
              )}
            </div>

            {isExpanded && error.details && (
              <div className="error-details">{error.details}</div>
            )}

            {recovery && (
              <div className="recovery-action">
                <span className="recovery-label">Action:</span>
                {recovery}
              </div>
            )}
          </div>
        );
      })}

      {errors.length > 1 && onDismissAll && (
        <div className="dismiss-all">
          <button className="dismiss-all-btn" onClick={onDismissAll}>
            Dismiss all ({errors.length})
          </button>
        </div>
      )}
    </div>
  );
}
