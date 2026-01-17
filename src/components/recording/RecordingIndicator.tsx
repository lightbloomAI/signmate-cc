'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

interface RecordingIndicatorProps {
  state?: RecordingState;
  duration?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';
  showDuration?: boolean;
  showPulse?: boolean;
  size?: 'small' | 'medium' | 'large';
  onStateChange?: (state: RecordingState) => void;
  label?: string;
}

const STATE_CONFIG: Record<
  RecordingState,
  { color: string; label: string; icon: string }
> = {
  idle: { color: '#6b7280', label: 'Ready', icon: '○' },
  recording: { color: '#ef4444', label: 'Recording', icon: '●' },
  paused: { color: '#f59e0b', label: 'Paused', icon: '⏸' },
  processing: { color: '#3b82f6', label: 'Processing', icon: '◐' },
};

const SIZE_CONFIG = {
  small: { dot: 8, font: 11, padding: '4px 10px' },
  medium: { dot: 10, font: 13, padding: '6px 14px' },
  large: { dot: 14, font: 16, padding: '8px 18px' },
};

export function RecordingIndicator({
  state = 'idle',
  duration = 0,
  position = 'top-right',
  showDuration = true,
  showPulse = true,
  size = 'medium',
  onStateChange,
  label,
}: RecordingIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track elapsed time when recording
  useEffect(() => {
    if (state === 'recording') {
      intervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state]);

  // Reset elapsed time when state changes to idle
  useEffect(() => {
    if (state === 'idle') {
      setElapsedTime(0);
    }
  }, [state]);

  // Sync with external duration
  useEffect(() => {
    if (duration !== elapsedTime && duration > 0) {
      setElapsedTime(duration);
    }
  }, [duration, elapsedTime]);

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
    'top-center': { top: 16, left: '50%', transform: 'translateX(-50%)' },
  };

  const config = STATE_CONFIG[state];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className="recording-indicator"
      style={positionStyles[position]}
      role="status"
      aria-live="polite"
      aria-label={`${config.label}${showDuration && state === 'recording' ? ` - ${formatDuration(elapsedTime)}` : ''}`}
    >
      <style jsx>{`
        .recording-indicator {
          position: fixed;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(17, 24, 39, 0.95);
          border-radius: 24px;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .indicator-dot {
          border-radius: 50%;
          flex-shrink: 0;
        }

        .indicator-dot.pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .indicator-dot.spin {
          animation: spin 1s linear infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.9);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .indicator-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .indicator-label {
          color: #e5e7eb;
          font-weight: 500;
        }

        .indicator-duration {
          color: #9ca3af;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .indicator-divider {
          width: 1px;
          height: 16px;
          background: #374151;
        }
      `}</style>

      <div
        className={`indicator-dot ${showPulse && state === 'recording' ? 'pulse' : ''} ${state === 'processing' ? 'spin' : ''}`}
        style={{
          width: sizeConfig.dot,
          height: sizeConfig.dot,
          background: config.color,
          padding: sizeConfig.padding,
        }}
      />

      <div className="indicator-content">
        <span
          className="indicator-label"
          style={{ fontSize: sizeConfig.font, color: config.color }}
        >
          {label || config.label}
        </span>

        {showDuration && (state === 'recording' || state === 'paused') && (
          <>
            <div className="indicator-divider" />
            <span
              className="indicator-duration"
              style={{ fontSize: sizeConfig.font }}
            >
              {formatDuration(elapsedTime)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// Full-screen recording overlay
interface RecordingOverlayProps {
  visible?: boolean;
  state?: RecordingState;
  message?: string;
  onDismiss?: () => void;
}

export function RecordingOverlay({
  visible = false,
  state = 'recording',
  message,
  onDismiss,
}: RecordingOverlayProps) {
  if (!visible) return null;

  const config = STATE_CONFIG[state];

  return (
    <div className="recording-overlay" onClick={onDismiss}>
      <style jsx>{`
        .recording-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .overlay-icon {
          font-size: 64px;
          margin-bottom: 24px;
        }

        .overlay-icon.pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }

        .overlay-icon.spin {
          animation: spin 2s linear infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .overlay-label {
          font-size: 24px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 8px;
        }

        .overlay-message {
          font-size: 14px;
          color: #9ca3af;
          text-align: center;
          max-width: 300px;
        }

        .overlay-dismiss {
          margin-top: 24px;
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>

      <div
        className={`overlay-icon ${state === 'recording' ? 'pulse' : ''} ${state === 'processing' ? 'spin' : ''}`}
        style={{ color: config.color }}
      >
        {config.icon}
      </div>

      <div className="overlay-label" style={{ color: config.color }}>
        {config.label}
      </div>

      {message && <div className="overlay-message">{message}</div>}

      {onDismiss && (
        <div className="overlay-dismiss">Click anywhere to dismiss</div>
      )}
    </div>
  );
}

// Minimal recording dot
interface RecordingDotProps {
  active?: boolean;
  color?: string;
  size?: number;
  pulse?: boolean;
}

export function RecordingDot({
  active = false,
  color = '#ef4444',
  size = 8,
  pulse = true,
}: RecordingDotProps) {
  return (
    <div
      className="recording-dot"
      style={{
        width: size,
        height: size,
        background: active ? color : '#6b7280',
        borderRadius: '50%',
        animation: active && pulse ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }}
      role="status"
      aria-label={active ? 'Recording active' : 'Recording inactive'}
    >
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}

// Hook for managing recording state
export function useRecordingState(options: {
  onStart?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  maxDuration?: number;
} = {}) {
  const { onStart, onStop, onPause, onResume, maxDuration } = options;
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    setState('recording');
    setDuration(0);
    onStart?.();

    intervalRef.current = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        if (maxDuration && newDuration >= maxDuration) {
          stop();
        }
        return newDuration;
      });
    }, 1000);
  }, [onStart, maxDuration]);

  const stop = useCallback(() => {
    setState('idle');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onStop?.();
  }, [onStop]);

  const pause = useCallback(() => {
    setState('paused');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    onPause?.();
  }, [onPause]);

  const resume = useCallback(() => {
    setState('recording');
    onResume?.();

    intervalRef.current = setInterval(() => {
      setDuration((prev) => {
        const newDuration = prev + 1;
        if (maxDuration && newDuration >= maxDuration) {
          stop();
        }
        return newDuration;
      });
    }, 1000);
  }, [onResume, maxDuration, stop]);

  const setProcessing = useCallback(() => {
    setState('processing');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    state,
    duration,
    isRecording: state === 'recording',
    isPaused: state === 'paused',
    isProcessing: state === 'processing',
    isIdle: state === 'idle',
    start,
    stop,
    pause,
    resume,
    setProcessing,
  };
}

export type { RecordingState };
