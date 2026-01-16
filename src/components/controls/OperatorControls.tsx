'use client';

import { useState, useCallback } from 'react';
import { useSignMateStore } from '@/store';
import { Button } from '@/components/ui/Button';
import { useSessionRecording } from '@/hooks/useSessionRecording';
import type { AudioSourceType } from '@/types';

interface OperatorControlsProps {
  onPause?: () => void;
  onResume?: () => void;
  onSwitchAudioSource?: (source: AudioSourceType) => void;
  onAddMarker?: (label: string) => void;
  availableAudioSources?: AudioSourceType[];
  compact?: boolean;
}

export function OperatorControls({
  onPause,
  onResume,
  onSwitchAudioSource,
  onAddMarker,
  availableAudioSources = ['microphone'],
  compact = false,
}: OperatorControlsProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [showMarkerInput, setShowMarkerInput] = useState(false);
  const [markerLabel, setMarkerLabel] = useState('');

  const { pipelineStatus, avatarState } = useSignMateStore();
  const { isRecording, startRecording, stopRecording, addMarker, duration, eventCount } =
    useSessionRecording();

  const handlePauseToggle = useCallback(() => {
    if (isPaused) {
      onResume?.();
      setIsPaused(false);
    } else {
      onPause?.();
      setIsPaused(true);
    }
  }, [isPaused, onPause, onResume]);

  const handleAddMarker = useCallback(() => {
    if (markerLabel.trim()) {
      addMarker(markerLabel.trim());
      onAddMarker?.(markerLabel.trim());
      setMarkerLabel('');
      setShowMarkerInput(false);
    }
  }, [markerLabel, addMarker, onAddMarker]);

  const handleMarkerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAddMarker();
      } else if (e.key === 'Escape') {
        setShowMarkerInput(false);
        setMarkerLabel('');
      }
    },
    [handleAddMarker]
  );

  if (compact) {
    return (
      <div className="operator-controls-compact">
        <style jsx>{`
          .operator-controls-compact {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.6);
            border-radius: 8px;
            backdrop-filter: blur(8px);
          }
          .control-btn {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1f2937;
            border: none;
            border-radius: 6px;
            color: #e5e7eb;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.15s ease;
          }
          .control-btn:hover {
            background: #374151;
          }
          .control-btn.active {
            background: #2563eb;
          }
          .control-btn.recording {
            background: #dc2626;
          }
          .control-btn.paused {
            background: #ca8a04;
          }
          .divider {
            width: 1px;
            height: 20px;
            background: #374151;
          }
          .stat {
            font-size: 12px;
            color: #9ca3af;
          }
          .stat-value {
            color: #e5e7eb;
            font-weight: 600;
          }
        `}</style>

        <button
          className={`control-btn ${isPaused ? 'paused' : ''}`}
          onClick={handlePauseToggle}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? '▶' : '⏸'}
        </button>

        <button
          className={`control-btn ${isRecording ? 'recording' : ''}`}
          onClick={() => (isRecording ? stopRecording() : startRecording())}
          title={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          ●
        </button>

        <div className="divider" />

        <span className="stat">
          <span className="stat-value">{pipelineStatus.latency.toFixed(0)}</span>ms
        </span>
        <span className="stat">
          <span className="stat-value">{avatarState.queue?.length || 0}</span> queued
        </span>
      </div>
    );
  }

  return (
    <div className="operator-controls">
      <style jsx>{`
        .operator-controls {
          background: #1f2937;
          border-radius: 12px;
          padding: 16px;
        }
        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .controls-title {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge.live {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        .status-badge.paused {
          background: rgba(202, 138, 4, 0.2);
          color: #ca8a04;
        }
        .status-badge.recording {
          background: rgba(220, 38, 38, 0.2);
          color: #dc2626;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        .controls-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }
        .control-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 12px 8px;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .control-button:hover {
          background: #1f2937;
          border-color: #4b5563;
        }
        .control-button.active {
          background: #2563eb;
          border-color: #2563eb;
        }
        .control-button.recording {
          background: #dc2626;
          border-color: #dc2626;
        }
        .control-icon {
          font-size: 20px;
          color: #e5e7eb;
        }
        .control-label {
          font-size: 11px;
          color: #9ca3af;
          text-align: center;
        }
        .active .control-label,
        .recording .control-label {
          color: rgba(255, 255, 255, 0.9);
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #374151;
        }
        .stat-item {
          text-align: center;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #f9fafb;
        }
        .stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }
        .audio-sources {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #374151;
        }
        .audio-sources-title {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          margin-bottom: 8px;
        }
        .audio-source-buttons {
          display: flex;
          gap: 8px;
        }
        .marker-input-container {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #374151;
        }
        .marker-input-row {
          display: flex;
          gap: 8px;
        }
        .marker-input {
          flex: 1;
          padding: 8px 12px;
          background: #111827;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 13px;
        }
        .marker-input:focus {
          outline: none;
          border-color: #2563eb;
        }
        .marker-input::placeholder {
          color: #6b7280;
        }
        .recording-info {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(220, 38, 38, 0.1);
          border-radius: 6px;
          font-size: 12px;
          color: #fca5a5;
        }
        .recording-time {
          font-weight: 600;
          color: #dc2626;
        }
      `}</style>

      <div className="controls-header">
        <span className="controls-title">Operator Controls</span>
        <div className="status-badges" style={{ display: 'flex', gap: 8 }}>
          {isRecording && (
            <span className="status-badge recording">
              <span className="status-dot" />
              REC
            </span>
          )}
          <span className={`status-badge ${isPaused ? 'paused' : 'live'}`}>
            <span className="status-dot" />
            {isPaused ? 'PAUSED' : 'LIVE'}
          </span>
        </div>
      </div>

      <div className="controls-grid">
        <button
          className={`control-button ${isPaused ? '' : ''}`}
          onClick={handlePauseToggle}
        >
          <span className="control-icon">{isPaused ? '▶' : '⏸'}</span>
          <span className="control-label">{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <button
          className={`control-button ${isRecording ? 'recording' : ''}`}
          onClick={() => (isRecording ? stopRecording() : startRecording())}
        >
          <span className="control-icon">{isRecording ? '⏹' : '●'}</span>
          <span className="control-label">{isRecording ? 'Stop Rec' : 'Record'}</span>
        </button>

        <button
          className="control-button"
          onClick={() => setShowMarkerInput(!showMarkerInput)}
          disabled={!isRecording}
          style={{ opacity: isRecording ? 1 : 0.5 }}
        >
          <span className="control-icon">🏷</span>
          <span className="control-label">Add Marker</span>
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-item">
          <div className="stat-value">{pipelineStatus.latency.toFixed(0)}</div>
          <div className="stat-label">Latency (ms)</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{avatarState.queue?.length || 0}</div>
          <div className="stat-label">Queued</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{eventCount}</div>
          <div className="stat-label">Events</div>
        </div>
      </div>

      {availableAudioSources.length > 1 && (
        <div className="audio-sources">
          <div className="audio-sources-title">Audio Source</div>
          <div className="audio-source-buttons">
            {availableAudioSources.map((source) => (
              <Button
                key={source}
                variant="secondary"
                size="small"
                onClick={() => onSwitchAudioSource?.(source)}
              >
                {source === 'microphone'
                  ? '🎤 Mic'
                  : source === 'av-system'
                    ? '🔌 AV'
                    : '📡 Stream'}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showMarkerInput && isRecording && (
        <div className="marker-input-container">
          <div className="marker-input-row">
            <input
              type="text"
              className="marker-input"
              placeholder="Enter marker label..."
              value={markerLabel}
              onChange={(e) => setMarkerLabel(e.target.value)}
              onKeyDown={handleMarkerKeyDown}
              autoFocus
            />
            <Button variant="primary" size="small" onClick={handleAddMarker}>
              Add
            </Button>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="recording-info">
          Recording:{' '}
          <span className="recording-time">
            {Math.floor(duration / 1000)}s
          </span>{' '}
          · {eventCount} events
        </div>
      )}
    </div>
  );
}
