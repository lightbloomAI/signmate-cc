'use client';

import { useAudioLevel } from './AudioVisualizer';

interface AudioMeterProps {
  stream?: MediaStream | null;
  orientation?: 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showPeak?: boolean;
  label?: string;
  clippingThreshold?: number;
  className?: string;
}

export function AudioMeter({
  stream,
  orientation = 'horizontal',
  size = 'medium',
  showLabel = true,
  showPeak = true,
  label = 'Input',
  clippingThreshold = 0.95,
  className = '',
}: AudioMeterProps) {
  const { level, peak, isActive } = useAudioLevel(stream ?? null);
  const isClipping = peak >= clippingThreshold;

  const dimensions = {
    small: { width: orientation === 'horizontal' ? 120 : 16, height: orientation === 'horizontal' ? 12 : 60 },
    medium: { width: orientation === 'horizontal' ? 180 : 20, height: orientation === 'horizontal' ? 16 : 80 },
    large: { width: orientation === 'horizontal' ? 240 : 24, height: orientation === 'horizontal' ? 20 : 120 },
  };

  const { width, height } = dimensions[size];

  const getColor = (value: number) => {
    if (value >= clippingThreshold) return '#ef4444';
    if (value >= 0.75) return '#f97316';
    if (value >= 0.5) return '#fbbf24';
    return '#22c55e';
  };

  const renderSegments = () => {
    const segmentCount = orientation === 'horizontal' ? 20 : 15;
    const segments = [];
    const segmentSize = orientation === 'horizontal'
      ? (width - (segmentCount - 1) * 2) / segmentCount
      : (height - (segmentCount - 1) * 2) / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const threshold = (i + 1) / segmentCount;
      const isLit = level >= threshold;
      const isPeakSegment = showPeak && peak >= threshold && peak < threshold + (1 / segmentCount);

      let color = '#1f2937';
      if (isLit) {
        color = getColor(threshold);
      } else if (isPeakSegment) {
        color = getColor(peak);
      }

      if (orientation === 'horizontal') {
        segments.push(
          <div
            key={i}
            style={{
              width: segmentSize,
              height: '100%',
              background: color,
              borderRadius: 2,
              transition: isLit ? 'none' : 'background 0.1s ease',
            }}
          />
        );
      } else {
        segments.push(
          <div
            key={i}
            style={{
              width: '100%',
              height: segmentSize,
              background: color,
              borderRadius: 2,
              transition: isLit ? 'none' : 'background 0.1s ease',
            }}
          />
        );
      }
    }

    return orientation === 'vertical' ? segments.reverse() : segments;
  };

  return (
    <div className={`audio-meter ${className}`}>
      <style jsx>{`
        .audio-meter {
          display: flex;
          flex-direction: ${orientation === 'horizontal' ? 'column' : 'row'};
          align-items: ${orientation === 'horizontal' ? 'stretch' : 'flex-end'};
          gap: 6px;
        }

        .meter-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: ${size === 'small' ? '10px' : size === 'medium' ? '11px' : '12px'};
          color: #9ca3af;
        }

        .meter-track {
          display: flex;
          flex-direction: ${orientation === 'horizontal' ? 'row' : 'column'};
          gap: 2px;
          width: ${width}px;
          height: ${height}px;
          padding: 2px;
          background: #111827;
          border-radius: 4px;
          border: 1px solid #374151;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${isActive ? '#22c55e' : '#374151'};
          animation: ${isActive ? 'pulse 1s infinite' : 'none'};
        }

        .clipping-indicator {
          font-size: ${size === 'small' ? '9px' : '10px'};
          font-weight: 600;
          color: #ef4444;
          animation: blink 0.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .db-scale {
          display: flex;
          flex-direction: ${orientation === 'horizontal' ? 'row' : 'column-reverse'};
          justify-content: space-between;
          font-size: 9px;
          color: #6b7280;
          padding: 0 2px;
        }

        .no-signal {
          font-size: ${size === 'small' ? '9px' : '10px'};
          color: #6b7280;
          font-style: italic;
        }
      `}</style>

      {showLabel && (
        <div className="meter-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot" />
            {label}
          </span>
          {stream && (
            <span>
              {isClipping ? (
                <span className="clipping-indicator">CLIP</span>
              ) : (
                `${Math.round(level * 100)}%`
              )}
            </span>
          )}
        </div>
      )}

      {stream ? (
        <>
          <div className="meter-track">{renderSegments()}</div>
          <div className="db-scale">
            <span>-∞</span>
            <span>-12</span>
            <span>-6</span>
            <span>0</span>
          </div>
        </>
      ) : (
        <span className="no-signal">No signal</span>
      )}
    </div>
  );
}

// Compact level indicator for inline use
interface LevelIndicatorProps {
  stream?: MediaStream | null;
  size?: number;
}

export function LevelIndicator({ stream, size = 12 }: LevelIndicatorProps) {
  const { level, isActive } = useAudioLevel(stream ?? null);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: !stream || !isActive
          ? '#374151'
          : level < 0.5
            ? '#22c55e'
            : level < 0.8
              ? '#fbbf24'
              : '#ef4444',
        transition: 'background 0.1s ease',
        animation: isActive ? 'pulse 1s infinite' : 'none',
      }}
    />
  );
}
