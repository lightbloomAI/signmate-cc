'use client';

import { AvatarRenderer } from '@/components/avatar';
import type { AvatarConfig, AvatarState, TranscriptionSegment } from '@/types';

interface LivestreamOverlayProps {
  avatarConfig: AvatarConfig;
  avatarState: AvatarState;
  transcription?: TranscriptionSegment;
  showCaptions: boolean;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size: 'small' | 'medium' | 'large';
  onSignComplete?: () => void;
}

export function LivestreamOverlay({
  avatarConfig,
  avatarState,
  transcription,
  showCaptions,
  position,
  size,
  onSignComplete,
}: LivestreamOverlayProps) {
  const sizeMap = {
    small: { width: 200, height: 250 },
    medium: { width: 300, height: 375 },
    large: { width: 400, height: 500 },
  };

  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  };

  const dimensions = sizeMap[size];
  const posStyle = positionStyles[position];

  return (
    <div
      className="livestream-overlay"
      style={{
        ...posStyle,
        width: dimensions.width,
        height: dimensions.height,
      }}
    >
      <style jsx>{`
        .livestream-overlay {
          position: fixed;
          background: transparent;
          border-radius: 12px;
          overflow: hidden;
          z-index: 1000;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .overlay-container {
          width: 100%;
          height: 100%;
          position: relative;
          background: linear-gradient(
            135deg,
            rgba(26, 26, 46, 0.95) 0%,
            rgba(22, 33, 62, 0.95) 100%
          );
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .avatar-wrapper {
          width: 100%;
          height: ${showCaptions ? '75%' : '100%'};
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .caption-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 25%;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .caption-text {
          color: #ffffff;
          font-size: ${size === 'small' ? '11px' : size === 'medium' ? '13px' : '15px'};
          text-align: center;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .live-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          padding: 3px 8px;
          background: #ef4444;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          background: #fff;
          border-radius: 50%;
          animation: blink 1s infinite;
        }

        .live-text {
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .sign-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          padding: 3px 8px;
          background: rgba(37, 99, 235, 0.9);
          border-radius: 4px;
          color: #fff;
          font-size: ${size === 'small' ? '8px' : '10px'};
          font-weight: 600;
          text-transform: uppercase;
        }

        .drag-handle {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 24px;
          cursor: move;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.05) 0%,
            transparent 100%
          );
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="overlay-container">
        <div className="drag-handle" />

        <div className="live-badge">
          <div className="live-dot" />
          <span className="live-text">ASL</span>
        </div>

        {avatarState.currentSign && (
          <div className="sign-badge">{avatarState.currentSign.gloss}</div>
        )}

        <div className="avatar-wrapper">
          <AvatarRenderer
            config={avatarConfig}
            state={avatarState}
            onSignComplete={onSignComplete}
            className="w-full h-full"
          />
        </div>

        {showCaptions && (
          <div className="caption-bar">
            <p className="caption-text">
              {transcription?.text || ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
