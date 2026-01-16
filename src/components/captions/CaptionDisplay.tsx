'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TranscriptionSegment } from '@/types';

interface CaptionDisplayProps {
  currentSegment?: TranscriptionSegment;
  recentSegments?: TranscriptionSegment[];
  maxLines?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  highlightColor?: string;
  position?: 'top' | 'bottom' | 'center';
  showWordHighlight?: boolean;
  showTimestamp?: boolean;
  showConfidence?: boolean;
  fadeOutDuration?: number;
  className?: string;
}

export function CaptionDisplay({
  currentSegment,
  recentSegments = [],
  maxLines = 2,
  fontSize = 24,
  fontFamily = 'system-ui, sans-serif',
  textColor = '#ffffff',
  backgroundColor = 'rgba(0, 0, 0, 0.75)',
  highlightColor = '#fbbf24',
  position = 'bottom',
  showWordHighlight = true,
  showTimestamp = false,
  showConfidence = false,
  fadeOutDuration = 5000,
  className = '',
}: CaptionDisplayProps) {
  const [displayedSegments, setDisplayedSegments] = useState<
    Array<TranscriptionSegment & { opacity: number }>
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fadeTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update displayed segments
  useEffect(() => {
    if (!currentSegment) return;

    setDisplayedSegments((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === currentSegment.id);

      if (existingIndex >= 0) {
        // Update existing segment
        const updated = [...prev];
        updated[existingIndex] = { ...currentSegment, opacity: 1 };
        return updated;
      } else {
        // Add new segment
        const newSegments = [...prev, { ...currentSegment, opacity: 1 }];
        // Keep only recent segments (more than maxLines to allow smooth transitions)
        return newSegments.slice(-maxLines * 2);
      }
    });

    // Clear existing timeout for this segment
    const existingTimeout = fadeTimeoutRefs.current.get(currentSegment.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set fade out for finalized segments
    if (currentSegment.isFinal && fadeOutDuration > 0) {
      const timeout = setTimeout(() => {
        setDisplayedSegments((prev) =>
          prev.map((s) => (s.id === currentSegment.id ? { ...s, opacity: 0 } : s))
        );
        // Remove from list after fade animation
        setTimeout(() => {
          setDisplayedSegments((prev) => prev.filter((s) => s.id !== currentSegment.id));
        }, 500);
      }, fadeOutDuration);
      fadeTimeoutRefs.current.set(currentSegment.id, timeout);
    }

    // Capture current ref value for cleanup
    const timeoutRefs = fadeTimeoutRefs.current;
    return () => {
      timeoutRefs.forEach((timeout) => clearTimeout(timeout));
    };
  }, [currentSegment, fadeOutDuration, maxLines]);

  // Add recent segments
  useEffect(() => {
    if (recentSegments.length > 0) {
      const newSegments = recentSegments
        .filter((s) => !displayedSegments.find((d) => d.id === s.id))
        .map((s) => ({ ...s, opacity: 1 }));

      if (newSegments.length > 0) {
        setDisplayedSegments((prev) => [...prev, ...newSegments].slice(-maxLines * 2));
      }
    }
  }, [recentSegments, displayedSegments, maxLines]);

  const getPositionStyles = useCallback(() => {
    switch (position) {
      case 'top':
        return { top: '20px', bottom: 'auto' };
      case 'center':
        return { top: '50%', transform: 'translateY(-50%)' };
      default:
        return { bottom: '20px', top: 'auto' };
    }
  }, [position]);

  const visibleSegments = displayedSegments.filter((s) => s.opacity > 0).slice(-maxLines);

  if (visibleSegments.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className={`caption-display ${className}`}>
      <style jsx>{`
        .caption-display {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 1200px;
          z-index: 50;
          ${position === 'top' ? 'top: 20px;' : position === 'center' ? 'top: 50%; margin-top: -30px;' : 'bottom: 20px;'}
        }

        .caption-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .caption-line {
          display: inline-block;
          padding: 12px 24px;
          background: ${backgroundColor};
          border-radius: 8px;
          backdrop-filter: blur(8px);
          transition: opacity 0.5s ease;
          max-width: 100%;
        }

        .caption-text {
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          font-weight: 500;
          color: ${textColor};
          line-height: 1.4;
          text-align: center;
          word-wrap: break-word;
        }

        .word {
          display: inline;
          transition: color 0.15s ease;
        }

        .word.current {
          color: ${highlightColor};
          font-weight: 600;
        }

        .word.interim {
          color: rgba(255, 255, 255, 0.7);
        }

        .caption-meta {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        .confidence-bar {
          width: 50px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .confidence-fill.high {
          background: #22c55e;
        }

        .confidence-fill.medium {
          background: #fbbf24;
        }

        .confidence-fill.low {
          background: #ef4444;
        }
      `}</style>

      <div className="caption-container">
        {visibleSegments.map((segment) => (
          <div
            key={segment.id}
            className="caption-line"
            style={{ opacity: segment.opacity }}
          >
            <div className="caption-text">
              {showWordHighlight ? (
                <WordHighlightedText
                  text={segment.text}
                  isInterim={!segment.isFinal}
                />
              ) : (
                <span className={segment.isFinal ? '' : 'word interim'}>
                  {segment.text}
                </span>
              )}
            </div>

            {(showTimestamp || showConfidence) && (
              <div className="caption-meta">
                {showTimestamp && (
                  <span>{formatTime(segment.startTime)}</span>
                )}
                {showConfidence && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div className="confidence-bar">
                      <div
                        className={`confidence-fill ${
                          segment.confidence > 0.9
                            ? 'high'
                            : segment.confidence > 0.7
                              ? 'medium'
                              : 'low'
                        }`}
                        style={{ width: `${segment.confidence * 100}%` }}
                      />
                    </div>
                    {Math.round(segment.confidence * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Word-level highlighting component
interface WordHighlightedTextProps {
  text: string;
  isInterim: boolean;
  currentWordIndex?: number;
}

function WordHighlightedText({
  text,
  isInterim,
  currentWordIndex,
}: WordHighlightedTextProps) {
  const words = text.split(/(\s+)/);

  return (
    <>
      {words.map((word, index) => {
        if (word.match(/^\s+$/)) {
          return <span key={index}>{word}</span>;
        }

        const isCurrent = currentWordIndex !== undefined && Math.floor(index / 2) === currentWordIndex;
        const isLast = index === words.length - 1 && isInterim;

        return (
          <span
            key={index}
            className={`word ${isCurrent ? 'current' : ''} ${isLast ? 'current' : ''} ${isInterim && !isCurrent && !isLast ? 'interim' : ''}`}
          >
            {word}
          </span>
        );
      })}
    </>
  );
}

// Caption history component for review
interface CaptionHistoryProps {
  segments: TranscriptionSegment[];
  maxHeight?: number;
  showTimestamps?: boolean;
  className?: string;
}

export function CaptionHistory({
  segments,
  maxHeight = 300,
  showTimestamps = true,
  className = '',
}: CaptionHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments]);

  return (
    <div className={`caption-history ${className}`}>
      <style jsx>{`
        .caption-history {
          background: #111827;
          border-radius: 8px;
          overflow: hidden;
        }

        .history-header {
          padding: 12px 16px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
          font-size: 13px;
          font-weight: 600;
          color: #f9fafb;
        }

        .history-content {
          max-height: ${maxHeight}px;
          overflow-y: auto;
          padding: 8px;
        }

        .history-item {
          display: flex;
          gap: 12px;
          padding: 8px 12px;
          border-radius: 6px;
          margin-bottom: 4px;
        }

        .history-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .history-time {
          font-size: 11px;
          color: #6b7280;
          font-family: monospace;
          flex-shrink: 0;
          padding-top: 2px;
        }

        .history-text {
          font-size: 14px;
          color: #e5e7eb;
          line-height: 1.5;
        }

        .history-text.interim {
          color: #9ca3af;
          font-style: italic;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 14px;
        }
      `}</style>

      <div className="history-header">
        Transcription History ({segments.length})
      </div>

      <div className="history-content" ref={containerRef}>
        {segments.length === 0 ? (
          <div className="empty-state">No transcriptions yet</div>
        ) : (
          segments.map((segment) => (
            <div key={segment.id} className="history-item">
              {showTimestamps && (
                <span className="history-time">{formatTime(segment.startTime)}</span>
              )}
              <span className={`history-text ${segment.isFinal ? '' : 'interim'}`}>
                {segment.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Utility function to format time
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}
