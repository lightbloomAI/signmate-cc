'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  sessionRecorder,
  sessionPlayer,
  downloadRecording,
  importRecording,
  type SessionRecording,
  type SessionStats,
  type SessionEvent,
} from '@/lib/session';

interface SessionManagerProps {
  onClose?: () => void;
  compact?: boolean;
}

type ViewMode = 'record' | 'playback' | 'history';

// Storage key for session history
const SESSION_HISTORY_KEY = 'signmate_session_history';
const MAX_STORED_SESSIONS = 20;

// Session history entry (stored without full events for efficiency)
interface SessionHistoryEntry {
  id: string;
  name: string;
  eventName?: string;
  venue?: string;
  startTime: number;
  duration: number;
  stats: SessionStats;
}

export function SessionManager({ onClose, compact = false }: SessionManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentStats, setCurrentStats] = useState<SessionStats | null>(null);
  const [eventCount, setEventCount] = useState(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loadedRecording, setLoadedRecording] = useState<SessionRecording | null>(null);

  // Session history
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Marker input
  const [markerLabel, setMarkerLabel] = useState('');
  const [markerNotes, setMarkerNotes] = useState('');
  const [showMarkerInput, setShowMarkerInput] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load session history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_HISTORY_KEY);
      if (stored) {
        setSessionHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load session history:', e);
    }
  }, []);

  // Update duration timer during recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(sessionRecorder.getDuration());
        setCurrentStats(sessionRecorder.getStats());
        setEventCount(sessionRecorder.getEventCount());
      }, 100);
    } else if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Setup playback callbacks
  useEffect(() => {
    sessionPlayer.setCallbacks({
      onStateChange: (state) => {
        setIsPlaying(state === 'playing');
      },
      onProgress: (current, total, progress) => {
        setPlaybackTime(current);
        setPlaybackDuration(total);
        setPlaybackProgress(progress);
      },
    });
  }, []);

  const startRecording = useCallback(() => {
    sessionRecorder.start({
      name: `Session ${new Date().toLocaleString()}`,
    });
    setIsRecording(true);
    setIsPaused(false);
    setRecordingDuration(0);
    setCurrentStats(null);
    setEventCount(0);
  }, []);

  const stopRecording = useCallback(() => {
    const recording = sessionRecorder.stop();
    setIsRecording(false);
    setIsPaused(false);

    if (recording) {
      // Save to history
      const historyEntry: SessionHistoryEntry = {
        id: recording.metadata.id,
        name: recording.metadata.name,
        eventName: recording.metadata.eventName,
        venue: recording.metadata.venue,
        startTime: recording.metadata.startTime,
        duration: recording.metadata.duration || 0,
        stats: recording.metadata.stats,
      };

      const newHistory = [historyEntry, ...sessionHistory].slice(0, MAX_STORED_SESSIONS);
      setSessionHistory(newHistory);

      try {
        localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(newHistory));
        // Also store the full recording
        localStorage.setItem(`signmate_session_${recording.metadata.id}`, JSON.stringify(recording));
      } catch (e) {
        console.error('Failed to save session:', e);
      }

      // Load into player for immediate playback
      setLoadedRecording(recording);
      setViewMode('playback');
    }
  }, [sessionHistory]);

  const pauseRecording = useCallback(() => {
    sessionRecorder.pause();
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    sessionRecorder.resume();
    setIsPaused(false);
  }, []);

  const addMarker = useCallback(() => {
    if (markerLabel.trim()) {
      sessionRecorder.addMarker(markerLabel.trim(), undefined, markerNotes.trim() || undefined);
      setMarkerLabel('');
      setMarkerNotes('');
      setShowMarkerInput(false);
    }
  }, [markerLabel, markerNotes]);

  const loadSession = useCallback((sessionId: string) => {
    try {
      const stored = localStorage.getItem(`signmate_session_${sessionId}`);
      if (stored) {
        const recording = importRecording(stored);
        setLoadedRecording(recording);
        sessionPlayer.load(recording);
        setSelectedHistoryId(sessionId);
        setViewMode('playback');
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    }
  }, []);

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const recording = importRecording(e.target?.result as string);
        setLoadedRecording(recording);
        sessionPlayer.load(recording);
        setViewMode('playback');
      } catch (error) {
        console.error('Failed to import recording:', error);
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      sessionPlayer.pause();
    } else {
      if (loadedRecording && sessionPlayer.getRecording() !== loadedRecording) {
        sessionPlayer.load(loadedRecording);
      }
      sessionPlayer.play();
    }
  }, [isPlaying, loadedRecording]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(e.target.value);
    const time = progress * playbackDuration;
    sessionPlayer.seek(time);
  }, [playbackDuration]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    sessionPlayer.setSpeed(speed);
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    const newHistory = sessionHistory.filter((s) => s.id !== sessionId);
    setSessionHistory(newHistory);

    try {
      localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(newHistory));
      localStorage.removeItem(`signmate_session_${sessionId}`);
    } catch (e) {
      console.error('Failed to delete session:', e);
    }

    if (selectedHistoryId === sessionId) {
      setSelectedHistoryId(null);
      setLoadedRecording(null);
    }
  }, [sessionHistory, selectedHistoryId]);

  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (compact) {
    return (
      <div className="session-compact">
        <style jsx>{`
          .session-compact {
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
          }
          .compact-status {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
          }
          .recording-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            animation: pulse 1s infinite;
          }
          .recording-dot.paused {
            background: #f59e0b;
            animation: none;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .status-text {
            font-size: 13px;
            color: #e5e7eb;
          }
          .duration {
            font-family: monospace;
            font-size: 13px;
            color: #9ca3af;
            margin-left: auto;
          }
          .compact-controls {
            display: flex;
            gap: 8px;
          }
        `}</style>

        {isRecording ? (
          <>
            <div className="compact-status">
              <div className={`recording-dot ${isPaused ? 'paused' : ''}`} />
              <span className="status-text">{isPaused ? 'Paused' : 'Recording'}</span>
              <span className="duration">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="compact-controls">
              {isPaused ? (
                <Button size="small" onClick={resumeRecording}>Resume</Button>
              ) : (
                <Button size="small" variant="secondary" onClick={pauseRecording}>Pause</Button>
              )}
              <Button size="small" variant="danger" onClick={stopRecording}>Stop</Button>
            </div>
          </>
        ) : (
          <Button size="small" onClick={startRecording}>Start Recording</Button>
        )}
      </div>
    );
  }

  return (
    <div className="session-manager">
      <style jsx>{`
        .session-manager {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 600px;
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

        .view-tabs {
          display: flex;
          gap: 4px;
          padding: 0 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .tab {
          padding: 10px 16px;
          font-size: 13px;
          color: #9ca3af;
          background: transparent;
          border: none;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .tab:hover {
          color: #e5e7eb;
        }

        .tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .record-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .recording-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .recording-dot-large {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 1s infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .recording-dot-large.paused {
          background: #f59e0b;
          animation: none;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        .recording-time {
          font-size: 36px;
          font-weight: 700;
          font-family: monospace;
          color: #f9fafb;
        }

        .recording-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          width: 100%;
          max-width: 400px;
        }

        .stat {
          text-align: center;
          padding: 12px;
          background: #1f2937;
          border-radius: 8px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #2563eb;
        }

        .stat-label {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .record-controls {
          display: flex;
          gap: 12px;
        }

        .marker-section {
          width: 100%;
          max-width: 400px;
          margin-top: 20px;
        }

        .marker-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .marker-input {
          width: 100%;
          padding: 8px 12px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 6px;
          color: #f9fafb;
          font-size: 13px;
        }

        .marker-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .marker-actions {
          display: flex;
          gap: 8px;
        }

        .idle-state {
          text-align: center;
          padding: 40px;
        }

        .idle-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #1f2937;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          font-size: 32px;
        }

        .idle-title {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 8px;
        }

        .idle-description {
          font-size: 13px;
          color: #9ca3af;
          margin-bottom: 20px;
        }

        .playback-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .playback-info {
          background: #1f2937;
          border-radius: 8px;
          padding: 16px;
        }

        .playback-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin-bottom: 8px;
        }

        .playback-meta {
          font-size: 12px;
          color: #9ca3af;
        }

        .playback-controls {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .progress-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          appearance: none;
          background: #374151;
          border-radius: 3px;
          cursor: pointer;
        }

        .progress-bar::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
        }

        .time-display {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-family: monospace;
          color: #9ca3af;
        }

        .speed-controls {
          display: flex;
          gap: 4px;
        }

        .speed-btn {
          padding: 4px 8px;
          font-size: 11px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
        }

        .speed-btn:hover {
          background: #374151;
        }

        .speed-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
        }

        .no-recording {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
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

        .history-item:hover {
          border-color: #4b5563;
          background: #263445;
        }

        .history-item.selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.1);
        }

        .history-info {
          flex: 1;
        }

        .history-name {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
          margin-bottom: 4px;
        }

        .history-meta {
          font-size: 12px;
          color: #9ca3af;
        }

        .history-stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #6b7280;
        }

        .history-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          padding: 6px 10px;
          font-size: 11px;
          background: transparent;
          border: 1px solid #374151;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
        }

        .action-btn:hover {
          background: #374151;
          color: #f9fafb;
        }

        .action-btn.danger:hover {
          background: #7f1d1d;
          border-color: #7f1d1d;
          color: #fecaca;
        }

        .empty-history {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }

        .import-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #374151;
        }

        .import-btn {
          display: block;
          width: 100%;
          padding: 12px;
          background: #1f2937;
          border: 2px dashed #374151;
          border-radius: 8px;
          color: #9ca3af;
          font-size: 13px;
          cursor: pointer;
          text-align: center;
        }

        .import-btn:hover {
          border-color: #4b5563;
          color: #e5e7eb;
        }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />

      <div className="header">
        <h2 className="title">Session Manager</h2>
        {onClose && (
          <Button variant="ghost" size="small" onClick={onClose}>
            ×
          </Button>
        )}
      </div>

      <div className="view-tabs">
        <button
          className={`tab ${viewMode === 'record' ? 'active' : ''}`}
          onClick={() => setViewMode('record')}
        >
          Record
        </button>
        <button
          className={`tab ${viewMode === 'playback' ? 'active' : ''}`}
          onClick={() => setViewMode('playback')}
        >
          Playback
        </button>
        <button
          className={`tab ${viewMode === 'history' ? 'active' : ''}`}
          onClick={() => setViewMode('history')}
        >
          History ({sessionHistory.length})
        </button>
      </div>

      <div className="content">
        {viewMode === 'record' && (
          <div className="record-section">
            {isRecording ? (
              <>
                <div className="recording-indicator">
                  <div className={`recording-dot-large ${isPaused ? 'paused' : ''}`}>
                    {isPaused ? '⏸' : '●'}
                  </div>
                  <div className="recording-time">{formatDuration(recordingDuration)}</div>
                </div>

                {currentStats && (
                  <div className="recording-stats">
                    <div className="stat">
                      <div className="stat-value">{currentStats.totalWords}</div>
                      <div className="stat-label">Words</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{currentStats.totalSigns}</div>
                      <div className="stat-label">Signs</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{eventCount}</div>
                      <div className="stat-label">Events</div>
                    </div>
                  </div>
                )}

                <div className="record-controls">
                  {isPaused ? (
                    <Button onClick={resumeRecording}>Resume</Button>
                  ) : (
                    <Button variant="secondary" onClick={pauseRecording}>Pause</Button>
                  )}
                  <Button variant="danger" onClick={stopRecording}>Stop Recording</Button>
                </div>

                <div className="marker-section">
                  {showMarkerInput ? (
                    <div className="marker-input-group">
                      <input
                        type="text"
                        className="marker-input"
                        placeholder="Marker label (e.g., 'Important moment')"
                        value={markerLabel}
                        onChange={(e) => setMarkerLabel(e.target.value)}
                        autoFocus
                      />
                      <input
                        type="text"
                        className="marker-input"
                        placeholder="Notes (optional)"
                        value={markerNotes}
                        onChange={(e) => setMarkerNotes(e.target.value)}
                      />
                      <div className="marker-actions">
                        <Button size="small" onClick={addMarker} disabled={!markerLabel.trim()}>
                          Add Marker
                        </Button>
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => {
                            setShowMarkerInput(false);
                            setMarkerLabel('');
                            setMarkerNotes('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setShowMarkerInput(true)}
                      style={{ width: '100%' }}
                    >
                      + Add Marker
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="idle-state">
                <div className="idle-icon">●</div>
                <div className="idle-title">Ready to Record</div>
                <div className="idle-description">
                  Record your interpretation session to review, share, or replay later.
                </div>
                <Button onClick={startRecording}>Start Recording</Button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'playback' && (
          <div className="playback-section">
            {loadedRecording ? (
              <>
                <div className="playback-info">
                  <div className="playback-title">{loadedRecording.metadata.name}</div>
                  <div className="playback-meta">
                    {formatDate(loadedRecording.metadata.startTime)} •{' '}
                    {formatDuration(loadedRecording.metadata.duration || 0)} •{' '}
                    {loadedRecording.metadata.stats.totalWords} words •{' '}
                    {loadedRecording.metadata.stats.totalSigns} signs
                  </div>
                </div>

                <div className="playback-controls">
                  <Button onClick={handlePlayPause}>
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </Button>

                  <div className="progress-section">
                    <input
                      type="range"
                      className="progress-bar"
                      min="0"
                      max="1"
                      step="0.001"
                      value={playbackProgress}
                      onChange={handleSeek}
                    />
                    <div className="time-display">
                      <span>{formatDuration(playbackTime)}</span>
                      <span>{formatDuration(playbackDuration)}</span>
                    </div>
                  </div>
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

                <Button
                  variant="secondary"
                  onClick={() => loadedRecording && downloadRecording(loadedRecording)}
                >
                  Download Recording
                </Button>
              </>
            ) : (
              <div className="no-recording">
                <p>No recording loaded</p>
                <p style={{ marginTop: 8 }}>
                  Select a session from History or import a recording file.
                </p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'history' && (
          <>
            {sessionHistory.length === 0 ? (
              <div className="empty-history">
                <p>No recorded sessions yet</p>
                <p style={{ marginTop: 8 }}>
                  Start a recording to create your first session.
                </p>
              </div>
            ) : (
              <div className="history-list">
                {sessionHistory.map((session) => (
                  <div
                    key={session.id}
                    className={`history-item ${selectedHistoryId === session.id ? 'selected' : ''}`}
                    onClick={() => loadSession(session.id)}
                  >
                    <div className="history-info">
                      <div className="history-name">{session.name}</div>
                      <div className="history-meta">
                        {formatDate(session.startTime)} • {formatDuration(session.duration)}
                      </div>
                      <div className="history-stats">
                        <span>{session.stats.totalWords} words</span>
                        <span>{session.stats.totalSigns} signs</span>
                        <span>Avg {session.stats.averageLatency}ms latency</span>
                      </div>
                    </div>
                    <div className="history-actions">
                      <button
                        className="action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="import-section">
              <button
                className="import-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Import Recording File
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
