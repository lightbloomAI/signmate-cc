'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { demoMode, getAvailableScripts, type DemoScript } from '@/lib/demo';

interface DemoControllerProps {
  onTranscription?: (text: string, isFinal: boolean) => void;
  onTranslation?: (signs: unknown[], sourceText: string) => void;
  onStateChange?: (isPlaying: boolean) => void;
  onClose?: () => void;
  onExitDemo?: () => void;
  compact?: boolean;
}

export function DemoController({
  onTranscription,
  onTranslation,
  onStateChange,
  onClose,
  onExitDemo,
  compact = false,
}: DemoControllerProps) {
  const [scripts] = useState(() => getAvailableScripts());
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentText, setCurrentText] = useState('');

  // Setup demo callbacks
  useEffect(() => {
    demoMode.setCallbacks({
      onTranscription: (text, isFinal) => {
        setCurrentText(text);
        onTranscription?.(text, isFinal);
      },
      onTranslation: (signs, sourceText) => {
        onTranslation?.(signs, sourceText);
      },
      onProgress: (current, total, prog) => {
        setCurrentTime(current);
        setTotalTime(total);
        setProgress(prog);
      },
      onStateChange: (state) => {
        const playing = state === 'playing';
        const paused = state === 'paused';
        setIsPlaying(playing);
        setIsPaused(paused);
        onStateChange?.(playing);

        if (state === 'complete') {
          setCurrentText('');
        }
      },
      onComplete: () => {
        setCurrentText('');
      },
    });

    return () => {
      demoMode.stop();
    };
  }, [onTranscription, onTranslation, onStateChange]);

  const handleScriptSelect = useCallback((scriptId: string) => {
    setSelectedScript(scriptId);
    demoMode.load(scriptId);
    setCurrentText('');
    setProgress(0);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      demoMode.pause();
    } else {
      if (!selectedScript && scripts.length > 0) {
        handleScriptSelect(scripts[0].id);
      }
      demoMode.play();
    }
  }, [isPlaying, selectedScript, scripts, handleScriptSelect]);

  const handleStop = useCallback(() => {
    demoMode.stop();
    setCurrentText('');
    setProgress(0);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const prog = parseFloat(e.target.value);
    const time = prog * totalTime;
    demoMode.seek(time);
  }, [totalTime]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    demoMode.setSpeed(speed);
  }, []);

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="demo-compact">
        <style jsx>{`
          .demo-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .demo-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
          }
          .status-dot.playing {
            animation: pulse 1s infinite;
          }
          .status-dot.paused {
            background: #f59e0b;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .status-text {
            font-size: 13px;
            color: #e5e7eb;
            flex: 1;
          }
          .current-text {
            font-size: 12px;
            color: #9ca3af;
            margin-bottom: 8px;
            min-height: 18px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .compact-controls {
            display: flex;
            gap: 8px;
          }
        `}</style>

        <div className="demo-status">
          <div className={`status-dot ${isPlaying ? 'playing' : isPaused ? 'paused' : ''}`} />
          <span className="status-text">
            {isPlaying ? 'Demo Playing' : isPaused ? 'Paused' : 'Demo Mode'}
          </span>
        </div>
        {currentText && <div className="current-text">{currentText}</div>}
        <div className="compact-controls">
          <Button size="small" onClick={handlePlayPause}>
            {isPlaying ? 'Pause' : 'Play Demo'}
          </Button>
          {(isPlaying || isPaused) && (
            <Button size="small" variant="secondary" onClick={handleStop}>
              Stop
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="demo-controller">
      <style jsx>{`
        .demo-controller {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          max-height: 500px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
        }

        .badge {
          background: #10b981;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .content {
          padding: 20px;
          overflow-y: auto;
        }

        .script-section {
          margin-bottom: 20px;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .script-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .script-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .script-item:hover {
          border-color: #4b5563;
          background: #263445;
        }

        .script-item.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .script-info {
          flex: 1;
        }

        .script-name {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
          margin-bottom: 2px;
        }

        .script-desc {
          font-size: 12px;
          color: #9ca3af;
        }

        .script-duration {
          font-size: 12px;
          color: #6b7280;
          font-family: monospace;
        }

        .playback-section {
          background: #1f2937;
          border-radius: 8px;
          padding: 16px;
        }

        .now-playing {
          margin-bottom: 16px;
        }

        .now-playing-label {
          font-size: 11px;
          color: #9ca3af;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .now-playing-text {
          font-size: 16px;
          color: #f9fafb;
          min-height: 24px;
        }

        .progress-section {
          margin-bottom: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          appearance: none;
          background: #374151;
          border-radius: 3px;
          cursor: pointer;
          margin-bottom: 8px;
        }

        .progress-bar::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
        }

        .time-display {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-family: monospace;
          color: #9ca3af;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .play-btn {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #10b981;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .play-btn:hover {
          background: #059669;
          transform: scale(1.05);
        }

        .play-btn:disabled {
          background: #374151;
          cursor: not-allowed;
          transform: none;
        }

        .secondary-controls {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          padding: 8px 12px;
          background: transparent;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: #374151;
          color: #f9fafb;
        }

        .speed-controls {
          margin-left: auto;
          display: flex;
          gap: 4px;
        }

        .speed-btn {
          padding: 4px 8px;
          font-size: 11px;
          background: transparent;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
        }

        .speed-btn:hover {
          background: #374151;
        }

        .speed-btn.active {
          background: #10b981;
          border-color: #10b981;
          color: #fff;
        }

        .no-script {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 13px;
        }
      `}</style>

      <div className="header">
        <h2 className="title">Demo Mode</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge">Demo</span>
          {onExitDemo && (
            <Button variant="secondary" size="small" onClick={onExitDemo}>
              Exit Demo
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="small" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </div>

      <div className="content">
        <div className="script-section">
          <div className="section-label">Select Demo Script</div>
          <div className="script-list">
            {scripts.map((script) => (
              <div
                key={script.id}
                className={`script-item ${selectedScript === script.id ? 'selected' : ''}`}
                onClick={() => handleScriptSelect(script.id)}
              >
                <div className="script-info">
                  <div className="script-name">{script.name}</div>
                  <div className="script-desc">{script.description}</div>
                </div>
                <div className="script-duration">{formatTime(script.duration)}</div>
              </div>
            ))}
          </div>
        </div>

        {selectedScript && (
          <div className="playback-section">
            <div className="now-playing">
              <div className="now-playing-label">Now Playing</div>
              <div className="now-playing-text">
                {currentText || (isPlaying ? 'Starting...' : 'Ready to play')}
              </div>
            </div>

            <div className="progress-section">
              <input
                type="range"
                className="progress-bar"
                min="0"
                max="1"
                step="0.001"
                value={progress}
                onChange={handleSeek}
              />
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(totalTime)}</span>
              </div>
            </div>

            <div className="controls">
              <button
                className="play-btn"
                onClick={handlePlayPause}
                aria-label={isPlaying ? 'Pause demo' : 'Play demo'}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <div className="secondary-controls">
                <button className="control-btn" onClick={handleStop}>
                  ⏹ Stop
                </button>
              </div>

              <div className="speed-controls">
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <button
                    key={speed}
                    className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!selectedScript && (
          <div className="no-script">
            Select a demo script above to get started
          </div>
        )}
      </div>
    </div>
  );
}
