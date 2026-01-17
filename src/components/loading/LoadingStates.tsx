'use client';

import { useState, useEffect } from 'react';

// Basic Spinner
interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const SPINNER_SIZES = {
  small: 16,
  medium: 24,
  large: 40,
};

export function Spinner({
  size = 'medium',
  color = '#2563eb',
  className = '',
}: SpinnerProps) {
  const sizeValue = SPINNER_SIZES[size];

  return (
    <div className={`spinner ${className}`}>
      <style jsx>{`
        .spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <svg
        width={sizeValue}
        height={sizeValue}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" opacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// Loading Dots
interface LoadingDotsProps {
  size?: number;
  color?: string;
  count?: number;
}

export function LoadingDots({
  size = 8,
  color = '#2563eb',
  count = 3,
}: LoadingDotsProps) {
  return (
    <div className="loading-dots">
      <style jsx>{`
        .loading-dots {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        .dot {
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite;
        }
        .dot:nth-child(1) {
          animation-delay: 0s;
        }
        .dot:nth-child(2) {
          animation-delay: 0.16s;
        }
        .dot:nth-child(3) {
          animation-delay: 0.32s;
        }
        @keyframes bounce {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="dot"
          style={{
            width: size,
            height: size,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

// Pulse Loader
interface PulseLoaderProps {
  size?: number;
  color?: string;
}

export function PulseLoader({ size = 40, color = '#2563eb' }: PulseLoaderProps) {
  return (
    <div
      className="pulse-loader"
      style={{ width: size, height: size }}
    >
      <style jsx>{`
        .pulse-loader {
          position: relative;
        }
        .pulse-loader::before,
        .pulse-loader::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: ${color};
          animation: pulse 2s ease-out infinite;
        }
        .pulse-loader::after {
          animation-delay: 1s;
        }
        @keyframes pulse {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Skeleton Components
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
    >
      <style jsx>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            #1f2937 25%,
            #374151 50%,
            #1f2937 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

// Skeleton Text
interface SkeletonTextProps {
  lines?: number;
  width?: string;
  spacing?: number;
}

export function SkeletonText({
  lines = 3,
  width = '100%',
  spacing = 8,
}: SkeletonTextProps) {
  return (
    <div className="skeleton-text" style={{ width }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '70%' : '100%'}
          height={14}
          className={i > 0 ? `mt-${spacing}` : ''}
        />
      ))}
      <style jsx>{`
        .skeleton-text {
          display: flex;
          flex-direction: column;
          gap: ${spacing}px;
        }
      `}</style>
    </div>
  );
}

// Skeleton Avatar
interface SkeletonAvatarProps {
  size?: number;
}

export function SkeletonAvatar({ size = 48 }: SkeletonAvatarProps) {
  return <Skeleton width={size} height={size} borderRadius="50%" />;
}

// Skeleton Card
export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <style jsx>{`
        .skeleton-card {
          padding: 16px;
          background: #1f2937;
          border-radius: 12px;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>

      <div className="card-header">
        <SkeletonAvatar size={40} />
        <div style={{ flex: 1 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} className="mt-2" />
        </div>
      </div>

      <div className="card-body">
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="80%" height={14} />
      </div>
    </div>
  );
}

// Loading Overlay
interface LoadingOverlayProps {
  visible?: boolean;
  message?: string;
  blur?: boolean;
}

export function LoadingOverlay({
  visible = true,
  message,
  blur = true,
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div className={`loading-overlay ${blur ? 'blur' : ''}`}>
      <style jsx>{`
        .loading-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(17, 24, 39, 0.9);
        }
        .loading-overlay.blur {
          backdrop-filter: blur(4px);
        }
        .loading-message {
          margin-top: 16px;
          font-size: 14px;
          color: #9ca3af;
        }
      `}</style>

      <Spinner size="large" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}

// Progress Bar
interface ProgressBarProps {
  progress: number;
  showPercentage?: boolean;
  height?: number;
  color?: string;
  animated?: boolean;
}

export function ProgressBar({
  progress,
  showPercentage = false,
  height = 4,
  color = '#2563eb',
  animated = true,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="progress-container">
      <style jsx>{`
        .progress-container {
          width: 100%;
        }
        .progress-bar {
          width: 100%;
          background: #374151;
          border-radius: 9999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 9999px;
          transition: width 0.3s ease;
        }
        .progress-fill.animated {
          background: linear-gradient(
            90deg,
            ${color} 0%,
            ${color}88 50%,
            ${color} 100%
          );
          background-size: 200% 100%;
          animation: progressShimmer 1.5s infinite;
        }
        @keyframes progressShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .progress-percentage {
          margin-top: 4px;
          font-size: 12px;
          color: #9ca3af;
          text-align: right;
        }
      `}</style>

      <div className="progress-bar" style={{ height }}>
        <div
          className={`progress-fill ${animated ? 'animated' : ''}`}
          style={{
            width: `${clampedProgress}%`,
            background: animated ? undefined : color,
          }}
        />
      </div>
      {showPercentage && (
        <div className="progress-percentage">{Math.round(clampedProgress)}%</div>
      )}
    </div>
  );
}

// Loading State with Timeout
interface LoadingStateProps {
  loading: boolean;
  timeout?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  timeoutMessage?: string;
  onTimeout?: () => void;
}

export function LoadingState({
  loading,
  timeout = 30000,
  children,
  fallback,
  timeoutMessage = 'This is taking longer than expected...',
  onTimeout,
}: LoadingStateProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [loading, timeout, onTimeout]);

  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="loading-state">
      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .timeout-message {
          margin-top: 16px;
          font-size: 13px;
          color: #f59e0b;
        }
      `}</style>

      {fallback || <Spinner size="large" />}
      {timedOut && <p className="timeout-message">{timeoutMessage}</p>}
    </div>
  );
}

// Pipeline Loading State
interface PipelineLoadingProps {
  stage: 'audio' | 'speech' | 'translation' | 'rendering';
  progress?: number;
}

const PIPELINE_STAGES = {
  audio: { label: 'Capturing Audio', icon: '🎙' },
  speech: { label: 'Recognizing Speech', icon: '💬' },
  translation: { label: 'Translating to ASL', icon: '🤟' },
  rendering: { label: 'Rendering Avatar', icon: '👤' },
};

export function PipelineLoading({ stage, progress }: PipelineLoadingProps) {
  const config = PIPELINE_STAGES[stage];

  return (
    <div className="pipeline-loading">
      <style jsx>{`
        .pipeline-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px;
          background: #1f2937;
          border-radius: 12px;
        }
        .stage-icon {
          font-size: 32px;
          margin-bottom: 12px;
          animation: bounce 1s ease-in-out infinite;
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .stage-label {
          font-size: 14px;
          font-weight: 500;
          color: #e5e7eb;
          margin-bottom: 16px;
        }
        .progress-wrapper {
          width: 200px;
        }
      `}</style>

      <div className="stage-icon">{config.icon}</div>
      <div className="stage-label">{config.label}</div>
      {progress !== undefined && (
        <div className="progress-wrapper">
          <ProgressBar progress={progress} showPercentage animated />
        </div>
      )}
      {progress === undefined && <LoadingDots />}
    </div>
  );
}
