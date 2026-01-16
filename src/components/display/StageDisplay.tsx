'use client';

import { AvatarRenderer } from '@/components/avatar';
import type { AvatarConfig, AvatarState, TranscriptionSegment } from '@/types';

interface StageDisplayProps {
  avatarConfig: AvatarConfig;
  avatarState: AvatarState;
  transcription?: TranscriptionSegment;
  showCaptions: boolean;
  onSignComplete?: () => void;
}

export function StageDisplay({
  avatarConfig,
  avatarState,
  transcription,
  showCaptions,
  onSignComplete,
}: StageDisplayProps) {
  return (
    <div className="stage-display">
      <style jsx>{`
        .stage-display {
          width: 100%;
          height: 100%;
          min-height: 500px;
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
        }

        .avatar-container {
          width: 100%;
          height: 80%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .caption-container {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          max-width: 80%;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.75);
          border-radius: 8px;
          backdrop-filter: blur(10px);
        }

        .caption-text {
          color: #ffffff;
          font-size: 24px;
          font-weight: 500;
          text-align: center;
          line-height: 1.4;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .gloss-indicator {
          position: absolute;
          top: 20px;
          right: 20px;
          padding: 8px 16px;
          background: rgba(37, 99, 235, 0.9);
          border-radius: 6px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .status-indicator {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse 2s infinite;
        }

        .status-text {
          color: #ffffff;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div className="status-indicator">
        <div className="status-dot" />
        <span className="status-text">Live Interpreting</span>
      </div>

      {avatarState.currentSign && (
        <div className="gloss-indicator">{avatarState.currentSign.gloss}</div>
      )}

      <div className="avatar-container">
        <AvatarRenderer
          config={avatarConfig}
          state={avatarState}
          onSignComplete={onSignComplete}
          className="w-full h-full"
        />
      </div>

      {showCaptions && transcription && transcription.text && (
        <div className="caption-container">
          <p className="caption-text">{transcription.text}</p>
        </div>
      )}
    </div>
  );
}
