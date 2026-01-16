'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSignMateStore } from '@/store';
import type { ASLSign } from '@/types';

interface SignQueueDisplayProps {
  maxVisible?: number;
  showCurrentSign?: boolean;
  showDuration?: boolean;
  showProgress?: boolean;
  compact?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function SignQueueDisplay({
  maxVisible = 5,
  showCurrentSign = true,
  showDuration = true,
  showProgress = true,
  compact = false,
  orientation = 'horizontal',
  className = '',
}: SignQueueDisplayProps) {
  const { avatarState } = useSignMateStore();
  const { currentSign, queue, isAnimating } = avatarState;

  const [signProgress, setSignProgress] = useState(0);
  const [animationStart, setAnimationStart] = useState<number | null>(null);

  // Track animation progress
  useEffect(() => {
    if (!currentSign || !isAnimating) {
      setSignProgress(0);
      setAnimationStart(null);
      return;
    }

    setAnimationStart(Date.now());
    const duration = currentSign.duration;

    const updateProgress = () => {
      if (!animationStart) return;
      const elapsed = Date.now() - animationStart;
      const progress = Math.min(1, elapsed / duration);
      setSignProgress(progress);

      if (progress < 1 && isAnimating) {
        requestAnimationFrame(updateProgress);
      }
    };

    requestAnimationFrame(updateProgress);
  }, [currentSign, isAnimating, animationStart]);

  // Reset animation start when sign changes
  useEffect(() => {
    if (currentSign) {
      setAnimationStart(Date.now());
    }
  }, [currentSign]);

  const visibleQueue = queue.slice(0, maxVisible);
  const remainingCount = Math.max(0, queue.length - maxVisible);

  if (!currentSign && queue.length === 0) {
    return (
      <div className={`sign-queue-empty ${className}`}>
        <style jsx>{`
          .sign-queue-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${compact ? '8px 12px' : '16px 20px'};
            background: rgba(31, 41, 55, 0.5);
            border-radius: 8px;
            color: #6b7280;
            font-size: ${compact ? '12px' : '14px'};
          }
        `}</style>
        <span>No signs queued</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`sign-queue-compact ${className}`}>
        <style jsx>{`
          .sign-queue-compact {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(31, 41, 55, 0.8);
            border-radius: 8px;
            backdrop-filter: blur(8px);
          }

          .current-sign-compact {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            background: #2563eb;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            color: white;
          }

          .progress-mini {
            width: 24px;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            overflow: hidden;
          }

          .progress-fill-mini {
            height: 100%;
            background: white;
            transition: width 0.1s linear;
          }

          .queue-count-compact {
            font-size: 12px;
            color: #9ca3af;
          }

          .divider {
            width: 1px;
            height: 16px;
            background: #374151;
          }

          .queue-preview {
            display: flex;
            gap: 4px;
          }

          .queue-chip {
            padding: 2px 8px;
            background: #374151;
            border-radius: 4px;
            font-size: 11px;
            color: #e5e7eb;
          }
        `}</style>

        {currentSign && (
          <div className="current-sign-compact">
            <span>{currentSign.gloss}</span>
            {showProgress && (
              <div className="progress-mini">
                <div
                  className="progress-fill-mini"
                  style={{ width: `${signProgress * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {queue.length > 0 && (
          <>
            <div className="divider" />
            <div className="queue-preview">
              {visibleQueue.slice(0, 3).map((sign, index) => (
                <span key={index} className="queue-chip">
                  {sign.gloss}
                </span>
              ))}
            </div>
            {queue.length > 3 && (
              <span className="queue-count-compact">+{queue.length - 3}</span>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className={`sign-queue ${orientation} ${className}`}
    >
      <style jsx>{`
        .sign-queue {
          display: flex;
          flex-direction: ${orientation === 'horizontal' ? 'row' : 'column'};
          gap: ${orientation === 'horizontal' ? '12px' : '8px'};
          padding: 16px;
          background: #1f2937;
          border-radius: 12px;
        }

        .sign-queue.horizontal {
          align-items: center;
          overflow-x: auto;
        }

        .sign-queue.vertical {
          max-height: 400px;
          overflow-y: auto;
        }

        .current-sign-section {
          flex-shrink: 0;
        }

        .section-label {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          margin-bottom: 6px;
        }

        .current-sign-card {
          padding: 12px 16px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border-radius: 10px;
          min-width: ${orientation === 'horizontal' ? '140px' : 'auto'};
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .sign-gloss {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }

        .sign-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.7);
        }

        .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 10px;
        }

        .progress-fill {
          height: 100%;
          background: white;
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .divider-line {
          width: ${orientation === 'horizontal' ? '1px' : '100%'};
          height: ${orientation === 'horizontal' ? '60px' : '1px'};
          background: #374151;
          flex-shrink: 0;
        }

        .queue-section {
          display: flex;
          flex-direction: ${orientation === 'horizontal' ? 'row' : 'column'};
          gap: 8px;
          flex: 1;
          min-width: 0;
        }

        .queue-item {
          padding: 10px 14px;
          background: #111827;
          border-radius: 8px;
          border: 1px solid #374151;
          min-width: ${orientation === 'horizontal' ? '100px' : 'auto'};
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .queue-item:hover {
          border-color: #4b5563;
          background: #1f2937;
        }

        .queue-item-gloss {
          font-size: 14px;
          font-weight: 600;
          color: #e5e7eb;
        }

        .queue-item-duration {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        .queue-item-index {
          font-size: 10px;
          color: #4b5563;
          margin-bottom: 4px;
        }

        .remaining-count {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 14px;
          background: #111827;
          border-radius: 8px;
          border: 1px dashed #374151;
          font-size: 13px;
          color: #6b7280;
          min-width: ${orientation === 'horizontal' ? '80px' : 'auto'};
        }

        .animation-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>

      {showCurrentSign && currentSign && (
        <div className="current-sign-section">
          <div className="section-label">Now Signing</div>
          <div className="current-sign-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="sign-gloss">{currentSign.gloss}</div>
              {isAnimating && <div className="animation-indicator" />}
            </div>
            <div className="sign-meta">
              {showDuration && <span>{currentSign.duration}ms</span>}
              <span>{currentSign.movement.type}</span>
            </div>
            {showProgress && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${signProgress * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <>
          {showCurrentSign && currentSign && <div className="divider-line" />}

          <div className="queue-section">
            {orientation === 'vertical' && <div className="section-label">Up Next ({queue.length})</div>}
            {visibleQueue.map((sign, index) => (
              <div key={`${sign.gloss}-${index}`} className="queue-item">
                {orientation === 'vertical' && (
                  <div className="queue-item-index">#{index + 1}</div>
                )}
                <div className="queue-item-gloss">{sign.gloss}</div>
                {showDuration && (
                  <div className="queue-item-duration">{sign.duration}ms</div>
                )}
              </div>
            ))}

            {remainingCount > 0 && (
              <div className="remaining-count">+{remainingCount} more</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Mini sign indicator for header bars
interface SignIndicatorProps {
  className?: string;
}

export function SignIndicator({ className = '' }: SignIndicatorProps) {
  const { avatarState } = useSignMateStore();
  const { currentSign, queue, isAnimating } = avatarState;

  return (
    <div className={`sign-indicator ${className}`}>
      <style jsx>{`
        .sign-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          font-size: 12px;
        }

        .indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${isAnimating ? '#22c55e' : '#374151'};
          transition: background 0.2s ease;
        }

        .indicator-dot.active {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .current-label {
          color: ${currentSign ? '#e5e7eb' : '#6b7280'};
          font-weight: 500;
        }

        .queue-badge {
          padding: 2px 6px;
          background: #374151;
          border-radius: 4px;
          color: #9ca3af;
          font-size: 10px;
        }
      `}</style>

      <div className={`indicator-dot ${isAnimating ? 'active' : ''}`} />
      <span className="current-label">
        {currentSign ? currentSign.gloss : 'Idle'}
      </span>
      {queue.length > 0 && (
        <span className="queue-badge">{queue.length}</span>
      )}
    </div>
  );
}
