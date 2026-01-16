'use client';

import { AvatarRenderer } from '@/components/avatar';
import type { AvatarConfig, AvatarState, TranscriptionSegment, PipelineStatus } from '@/types';

interface ConfidenceMonitorProps {
  avatarConfig: AvatarConfig;
  avatarState: AvatarState;
  transcription?: TranscriptionSegment;
  pipelineStatus: PipelineStatus;
  recentTranscriptions: TranscriptionSegment[];
  onSignComplete?: () => void;
}

export function ConfidenceMonitor({
  avatarConfig,
  avatarState,
  transcription,
  pipelineStatus,
  recentTranscriptions,
  onSignComplete,
}: ConfidenceMonitorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'processing':
      case 'animating':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const latencyStatus =
    pipelineStatus.latency < 300
      ? 'excellent'
      : pipelineStatus.latency < 500
        ? 'good'
        : 'warning';

  return (
    <div className="confidence-monitor">
      <style jsx>{`
        .confidence-monitor {
          width: 100%;
          height: 100%;
          min-height: 600px;
          background: #0f0f0f;
          display: grid;
          grid-template-columns: 1fr 300px;
          grid-template-rows: auto 1fr auto;
          gap: 1px;
          border-radius: 8px;
          overflow: hidden;
        }

        .header {
          grid-column: 1 / -1;
          background: #1a1a1a;
          padding: 12px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #333;
        }

        .header-title {
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .latency-badge {
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .latency-excellent {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .latency-good {
          background: rgba(234, 179, 8, 0.2);
          color: #eab308;
        }

        .latency-warning {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .main-view {
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
        }

        .avatar-section {
          flex: 1;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .current-caption {
          padding: 16px 20px;
          background: #222;
          border-top: 1px solid #333;
        }

        .caption-label {
          color: #666;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .caption-text {
          color: #fff;
          font-size: 18px;
          line-height: 1.4;
        }

        .sidebar {
          background: #1a1a1a;
          display: flex;
          flex-direction: column;
          border-left: 1px solid #333;
        }

        .status-section {
          padding: 16px;
          border-bottom: 1px solid #333;
        }

        .section-title {
          color: #666;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .status-label {
          color: #999;
          font-size: 12px;
        }

        .status-value {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-text {
          color: #fff;
          font-size: 12px;
          text-transform: capitalize;
        }

        .transcript-section {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
        }

        .transcript-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .transcript-item {
          padding: 8px 12px;
          background: #222;
          border-radius: 4px;
          border-left: 3px solid #2563eb;
        }

        .transcript-text {
          color: #fff;
          font-size: 13px;
          line-height: 1.4;
        }

        .transcript-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          color: #666;
          font-size: 10px;
        }

        .current-sign {
          padding: 16px;
          border-top: 1px solid #333;
          background: #222;
        }

        .sign-gloss {
          color: #2563eb;
          font-size: 24px;
          font-weight: 700;
          text-transform: uppercase;
          text-align: center;
        }

        .sign-details {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 8px;
        }

        .sign-detail {
          color: #666;
          font-size: 11px;
        }
      `}</style>

      <div className="header">
        <span className="header-title">Confidence Monitor</span>
        <span className={`latency-badge latency-${latencyStatus}`}>
          {pipelineStatus.latency}ms latency
        </span>
      </div>

      <div className="main-view">
        <div className="avatar-section">
          <AvatarRenderer
            config={avatarConfig}
            state={avatarState}
            onSignComplete={onSignComplete}
            className="w-full h-full max-h-96"
          />
        </div>

        <div className="current-caption">
          <div className="caption-label">Current Speech</div>
          <div className="caption-text">
            {transcription?.text || 'Waiting for speech...'}
          </div>
        </div>
      </div>

      <div className="sidebar">
        <div className="status-section">
          <div className="section-title">Pipeline Status</div>

          <div className="status-item">
            <span className="status-label">Audio</span>
            <div className="status-value">
              <div
                className="status-dot"
                style={{ background: getStatusColor(pipelineStatus.audioCapture) }}
              />
              <span className="status-text">{pipelineStatus.audioCapture}</span>
            </div>
          </div>

          <div className="status-item">
            <span className="status-label">Speech</span>
            <div className="status-value">
              <div
                className="status-dot"
                style={{ background: getStatusColor(pipelineStatus.speechRecognition) }}
              />
              <span className="status-text">{pipelineStatus.speechRecognition}</span>
            </div>
          </div>

          <div className="status-item">
            <span className="status-label">Translation</span>
            <div className="status-value">
              <div
                className="status-dot"
                style={{ background: getStatusColor(pipelineStatus.aslTranslation) }}
              />
              <span className="status-text">{pipelineStatus.aslTranslation}</span>
            </div>
          </div>

          <div className="status-item">
            <span className="status-label">Avatar</span>
            <div className="status-value">
              <div
                className="status-dot"
                style={{ background: getStatusColor(pipelineStatus.avatarRendering) }}
              />
              <span className="status-text">{pipelineStatus.avatarRendering}</span>
            </div>
          </div>
        </div>

        <div className="transcript-section">
          <div className="section-title">Recent Transcriptions</div>
          <div className="transcript-list">
            {recentTranscriptions.slice(-5).reverse().map((segment) => (
              <div key={segment.id} className="transcript-item">
                <div className="transcript-text">{segment.text}</div>
                <div className="transcript-meta">
                  <span>{Math.round(segment.confidence * 100)}% confidence</span>
                  <span>{segment.isFinal ? 'Final' : 'Interim'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {avatarState.currentSign && (
          <div className="current-sign">
            <div className="sign-gloss">{avatarState.currentSign.gloss}</div>
            <div className="sign-details">
              <span className="sign-detail">
                {avatarState.currentSign.duration}ms
              </span>
              <span className="sign-detail">
                {avatarState.currentSign.movement.type}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
