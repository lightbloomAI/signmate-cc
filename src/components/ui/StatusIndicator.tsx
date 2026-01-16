'use client';

type Status = 'idle' | 'active' | 'processing' | 'error' | 'warning';

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  pulse?: boolean;
}

export function StatusIndicator({
  status,
  label,
  showLabel = true,
  size = 'medium',
  pulse = true,
}: StatusIndicatorProps) {
  const getStatusColor = (s: Status) => {
    switch (s) {
      case 'active':
      case 'processing':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#fbbf24';
      case 'idle':
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (s: Status) => {
    switch (s) {
      case 'active':
        return 'Active';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'idle':
      default:
        return 'Idle';
    }
  };

  const getDotSize = (s: 'small' | 'medium' | 'large') => {
    switch (s) {
      case 'small':
        return 6;
      case 'large':
        return 12;
      case 'medium':
      default:
        return 8;
    }
  };

  const getFontSize = (s: 'small' | 'medium' | 'large') => {
    switch (s) {
      case 'small':
        return 10;
      case 'large':
        return 14;
      case 'medium':
      default:
        return 12;
    }
  };

  const color = getStatusColor(status);
  const displayLabel = label || getStatusLabel(status);
  const dotSize = getDotSize(size);
  const fontSize = getFontSize(size);
  const shouldPulse = pulse && (status === 'active' || status === 'processing');

  return (
    <div className="status-indicator">
      <style jsx>{`
        .status-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .status-dot {
          width: ${dotSize}px;
          height: ${dotSize}px;
          border-radius: 50%;
          background-color: ${color};
          flex-shrink: 0;
        }
        .status-dot.pulse {
          animation: statusPulse 2s ease-in-out infinite;
        }
        .status-label {
          font-size: ${fontSize}px;
          color: ${color};
          text-transform: capitalize;
          font-weight: 500;
        }
        @keyframes statusPulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 ${color}40;
          }
          50% {
            opacity: 0.7;
            box-shadow: 0 0 0 4px ${color}00;
          }
        }
      `}</style>
      <div className={`status-dot ${shouldPulse ? 'pulse' : ''}`} />
      {showLabel && <span className="status-label">{displayLabel}</span>}
    </div>
  );
}
