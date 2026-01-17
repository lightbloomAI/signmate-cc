'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { Button } from '@/components/ui/Button';

// Session Types
export type SessionStatus = 'idle' | 'preparing' | 'active' | 'paused' | 'ended';

export interface SessionStats {
  duration: number; // ms
  wordsTranslated: number;
  signsRendered: number;
  averageLatency: number;
  peakLatency: number;
  errorCount: number;
}

export interface Session {
  id: string;
  name: string;
  eventName?: string;
  status: SessionStatus;
  startedAt?: Date;
  endedAt?: Date;
  pausedDuration: number;
  stats: SessionStats;
  settings: SessionSettings;
}

export interface SessionSettings {
  sourceLanguage: string;
  targetSignLanguage: string;
  displayMode: string;
  captionsEnabled: boolean;
  recordingEnabled: boolean;
}

interface SessionContextType {
  currentSession: Session | null;
  sessions: Session[];
  createSession: (name: string, eventName?: string, settings?: Partial<SessionSettings>) => Session;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => void;
  updateStats: (stats: Partial<SessionStats>) => void;
  deleteSession: (id: string) => void;
  exportSession: (id: string) => string;
}

const SessionContext = createContext<SessionContextType | null>(null);

// Session Provider
interface SessionProviderProps {
  children: React.ReactNode;
  onSessionStart?: (session: Session) => void;
  onSessionEnd?: (session: Session) => void;
}

const DEFAULT_SETTINGS: SessionSettings = {
  sourceLanguage: 'en-US',
  targetSignLanguage: 'ASL',
  displayMode: 'stage',
  captionsEnabled: true,
  recordingEnabled: false,
};

const INITIAL_STATS: SessionStats = {
  duration: 0,
  wordsTranslated: 0,
  signsRendered: 0,
  averageLatency: 0,
  peakLatency: 0,
  errorCount: 0,
};

export function SessionProvider({ children, onSessionStart, onSessionEnd }: SessionProviderProps) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStartRef = useRef<number | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('signmate_sessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSessions(parsed.map((s: Session) => ({
          ...s,
          startedAt: s.startedAt ? new Date(s.startedAt) : undefined,
          endedAt: s.endedAt ? new Date(s.endedAt) : undefined,
        })));
      } catch {
        // Invalid data
      }
    }
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('signmate_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Update duration timer
  useEffect(() => {
    if (currentSession?.status === 'active') {
      timerRef.current = setInterval(() => {
        setCurrentSession((prev) => {
          if (!prev || !prev.startedAt) return prev;
          const now = Date.now();
          const elapsed = now - prev.startedAt.getTime() - prev.pausedDuration;
          return {
            ...prev,
            stats: { ...prev.stats, duration: elapsed },
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentSession?.status]);

  const generateId = useCallback(() => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const createSession = useCallback((
    name: string,
    eventName?: string,
    settings?: Partial<SessionSettings>
  ): Session => {
    const session: Session = {
      id: generateId(),
      name,
      eventName,
      status: 'idle',
      pausedDuration: 0,
      stats: { ...INITIAL_STATS },
      settings: { ...DEFAULT_SETTINGS, ...settings },
    };

    setCurrentSession(session);
    return session;
  }, [generateId]);

  const startSession = useCallback(() => {
    setCurrentSession((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        status: 'active' as SessionStatus,
        startedAt: new Date(),
      };
      onSessionStart?.(updated);
      return updated;
    });
  }, [onSessionStart]);

  const pauseSession = useCallback(() => {
    pauseStartRef.current = Date.now();
    setCurrentSession((prev) => {
      if (!prev) return prev;
      return { ...prev, status: 'paused' as SessionStatus };
    });
  }, []);

  const resumeSession = useCallback(() => {
    if (pauseStartRef.current) {
      const pauseDuration = Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
      setCurrentSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'active' as SessionStatus,
          pausedDuration: prev.pausedDuration + pauseDuration,
        };
      });
    }
  }, []);

  const endSession = useCallback(() => {
    setCurrentSession((prev) => {
      if (!prev) return prev;
      const ended = {
        ...prev,
        status: 'ended' as SessionStatus,
        endedAt: new Date(),
      };
      setSessions((sessions) => [ended, ...sessions]);
      onSessionEnd?.(ended);
      return null;
    });
  }, [onSessionEnd]);

  const updateStats = useCallback((stats: Partial<SessionStats>) => {
    setCurrentSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: { ...prev.stats, ...stats },
      };
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const exportSession = useCallback((id: string): string => {
    const session = sessions.find((s) => s.id === id);
    if (!session) return '';

    return JSON.stringify({
      ...session,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }, [sessions]);

  return (
    <SessionContext.Provider
      value={{
        currentSession,
        sessions,
        createSession,
        startSession,
        pauseSession,
        resumeSession,
        endSession,
        updateStats,
        deleteSession,
        exportSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

// Session Controls Component
interface SessionControlsProps {
  compact?: boolean;
}

export function SessionControls({ compact = false }: SessionControlsProps) {
  const { currentSession, startSession, pauseSession, resumeSession, endSession } = useSession();

  if (!currentSession) {
    return null;
  }

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0) {
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (currentSession.status) {
      case 'active':
        return '#10b981';
      case 'paused':
        return '#f59e0b';
      case 'ended':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  const getStatusLabel = () => {
    switch (currentSession.status) {
      case 'idle':
        return 'Ready';
      case 'preparing':
        return 'Preparing...';
      case 'active':
        return 'Live';
      case 'paused':
        return 'Paused';
      case 'ended':
        return 'Ended';
    }
  };

  if (compact) {
    return (
      <div className="session-controls-compact">
        <style jsx>{`
          .session-controls-compact {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: ${currentSession.status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none'};
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          .session-info {
            font-size: 13px;
            color: #e5e7eb;
          }
          .session-timer {
            font-family: monospace;
            font-size: 14px;
            color: #f9fafb;
            font-weight: 500;
          }
          .controls {
            display: flex;
            gap: 8px;
          }
        `}</style>

        <div className="status-dot" style={{ background: getStatusColor() }} />
        <span className="session-info">{currentSession.name}</span>
        <span className="session-timer">{formatDuration(currentSession.stats.duration)}</span>

        <div className="controls">
          {currentSession.status === 'idle' && (
            <Button size="small" onClick={startSession}>Start</Button>
          )}
          {currentSession.status === 'active' && (
            <>
              <Button size="small" variant="ghost" onClick={pauseSession}>Pause</Button>
              <Button size="small" variant="secondary" onClick={endSession}>End</Button>
            </>
          )}
          {currentSession.status === 'paused' && (
            <>
              <Button size="small" onClick={resumeSession}>Resume</Button>
              <Button size="small" variant="secondary" onClick={endSession}>End</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="session-controls">
      <style jsx>{`
        .session-controls {
          padding: 20px;
          background: #1f2937;
          border-radius: 12px;
        }
        .session-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .session-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
          color: white;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: white;
          animation: ${currentSession.status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none'};
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .session-name {
          font-size: 18px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }
        .event-name {
          font-size: 13px;
          color: #9ca3af;
          margin: 4px 0 0 0;
        }
        .session-timer {
          font-family: monospace;
          font-size: 32px;
          font-weight: 600;
          color: #f9fafb;
        }
        .session-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-item {
          padding: 12px;
          background: #111827;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }
        .stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          margin: 4px 0 0 0;
        }
        .session-actions {
          display: flex;
          gap: 12px;
        }
      `}</style>

      <div className="session-header">
        <div className="session-title">
          <div
            className="status-badge"
            style={{ background: getStatusColor() }}
          >
            <div className="status-dot" />
            {getStatusLabel()}
          </div>
          <div>
            <h3 className="session-name">{currentSession.name}</h3>
            {currentSession.eventName && (
              <p className="event-name">{currentSession.eventName}</p>
            )}
          </div>
        </div>

        <div className="session-timer">
          {formatDuration(currentSession.stats.duration)}
        </div>
      </div>

      <div className="session-stats">
        <div className="stat-item">
          <p className="stat-value">{currentSession.stats.wordsTranslated.toLocaleString()}</p>
          <p className="stat-label">Words</p>
        </div>
        <div className="stat-item">
          <p className="stat-value">{currentSession.stats.signsRendered.toLocaleString()}</p>
          <p className="stat-label">Signs</p>
        </div>
        <div className="stat-item">
          <p className="stat-value">{currentSession.stats.averageLatency}ms</p>
          <p className="stat-label">Avg Latency</p>
        </div>
      </div>

      <div className="session-actions">
        {currentSession.status === 'idle' && (
          <Button fullWidth onClick={startSession}>Start Session</Button>
        )}
        {currentSession.status === 'active' && (
          <>
            <Button fullWidth variant="ghost" onClick={pauseSession}>
              Pause
            </Button>
            <Button fullWidth variant="secondary" onClick={endSession}>
              End Session
            </Button>
          </>
        )}
        {currentSession.status === 'paused' && (
          <>
            <Button fullWidth onClick={resumeSession}>Resume</Button>
            <Button fullWidth variant="secondary" onClick={endSession}>
              End Session
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// New Session Dialog
interface NewSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (name: string, eventName?: string) => void;
}

export function NewSessionDialog({ isOpen, onClose, onCreateSession }: NewSessionDialogProps) {
  const [name, setName] = useState('');
  const [eventName, setEventName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(`Session ${new Date().toLocaleDateString()}`);
      setEventName('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateSession(name.trim(), eventName.trim() || undefined);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
        }
        .dialog {
          width: 100%;
          max-width: 420px;
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
        }
        .dialog-header {
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }
        .dialog-title {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }
        .dialog-body {
          padding: 20px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group:last-child {
          margin-bottom: 0;
        }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #e5e7eb;
          margin-bottom: 6px;
        }
        .form-input {
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          background: #1f2937;
          border: 1px solid #374151;
          border-radius: 8px;
          color: #f9fafb;
          outline: none;
          transition: all 0.2s ease;
        }
        .form-input:focus {
          border-color: #2563eb;
        }
        .form-input::placeholder {
          color: #6b7280;
        }
        .dialog-footer {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          background: #1f2937;
          border-top: 1px solid #374151;
        }
      `}</style>

      <form className="dialog" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="dialog-header">
          <h2 className="dialog-title">New Session</h2>
        </div>

        <div className="dialog-body">
          <div className="form-group">
            <label className="form-label" htmlFor="session-name">Session Name</label>
            <input
              id="session-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter session name"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-name">Event Name (Optional)</label>
            <input
              id="event-name"
              type="text"
              className="form-input"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Annual Conference 2025"
            />
          </div>
        </div>

        <div className="dialog-footer">
          <Button type="button" variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth disabled={!name.trim()}>
            Create Session
          </Button>
        </div>
      </form>
    </div>
  );
}

// Session History Component
interface SessionHistoryProps {
  onSelectSession?: (session: Session) => void;
}

export function SessionHistory({ onSelectSession }: SessionHistoryProps) {
  const { sessions, deleteSession, exportSession } = useSession();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = (id: string) => {
    const data = exportSession(id);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sessions.length === 0) {
    return (
      <div className="empty-history">
        <style jsx>{`
          .empty-history {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
          }
          .empty-icon {
            font-size: 40px;
            margin-bottom: 12px;
          }
          .empty-text {
            font-size: 14px;
          }
        `}</style>
        <div className="empty-icon">📋</div>
        <p className="empty-text">No sessions yet. Start your first session!</p>
      </div>
    );
  }

  return (
    <div className="session-history">
      <style jsx>{`
        .session-history {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .session-item {
          background: #1f2937;
          border-radius: 10px;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .session-item:hover {
          background: #2d3748;
        }
        .session-header {
          display: flex;
          align-items: center;
          padding: 14px 16px;
          cursor: pointer;
        }
        .session-info {
          flex: 1;
        }
        .session-name {
          font-size: 14px;
          font-weight: 500;
          color: #f9fafb;
          margin: 0;
        }
        .session-meta {
          display: flex;
          gap: 12px;
          margin-top: 4px;
        }
        .meta-item {
          font-size: 12px;
          color: #9ca3af;
        }
        .expand-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: transform 0.2s ease;
        }
        .expand-icon.expanded {
          transform: rotate(180deg);
        }
        .session-details {
          padding: 0 16px 16px;
          border-top: 1px solid #374151;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 12px;
          margin-top: 12px;
        }
        .stat {
          padding: 10px;
          background: #111827;
          border-radius: 6px;
          text-align: center;
        }
        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }
        .stat-label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          margin: 2px 0 0 0;
        }
        .session-actions {
          display: flex;
          gap: 8px;
        }
      `}</style>

      {sessions.map((session) => (
        <div key={session.id} className="session-item">
          <div
            className="session-header"
            onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
          >
            <div className="session-info">
              <h4 className="session-name">{session.name}</h4>
              <div className="session-meta">
                <span className="meta-item">
                  {session.startedAt ? formatDate(session.startedAt) : 'Not started'}
                </span>
                <span className="meta-item">{formatDuration(session.stats.duration)}</span>
              </div>
            </div>
            <div className={`expand-icon ${expandedId === session.id ? 'expanded' : ''}`}>
              ▼
            </div>
          </div>

          {expandedId === session.id && (
            <div className="session-details">
              <div className="stats-grid">
                <div className="stat">
                  <p className="stat-value">{session.stats.wordsTranslated.toLocaleString()}</p>
                  <p className="stat-label">Words</p>
                </div>
                <div className="stat">
                  <p className="stat-value">{session.stats.signsRendered.toLocaleString()}</p>
                  <p className="stat-label">Signs</p>
                </div>
                <div className="stat">
                  <p className="stat-value">{session.stats.averageLatency}ms</p>
                  <p className="stat-label">Avg Latency</p>
                </div>
              </div>

              <div className="session-actions">
                {onSelectSession && (
                  <Button size="small" onClick={() => onSelectSession(session)}>
                    View Details
                  </Button>
                )}
                <Button size="small" variant="ghost" onClick={() => handleExport(session.id)}>
                  Export
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => deleteSession(session.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Session Summary Component
interface SessionSummaryProps {
  session: Session;
}

export function SessionSummary({ session }: SessionSummaryProps) {
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;

    if (hours > 0) {
      return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="session-summary">
      <style jsx>{`
        .session-summary {
          padding: 24px;
          background: #1f2937;
          border-radius: 12px;
        }
        .summary-header {
          text-align: center;
          margin-bottom: 24px;
        }
        .summary-title {
          font-size: 20px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0 0 4px 0;
        }
        .summary-subtitle {
          font-size: 14px;
          color: #9ca3af;
          margin: 0;
        }
        .summary-duration {
          font-size: 48px;
          font-weight: 700;
          color: #2563eb;
          text-align: center;
          margin: 24px 0;
          font-family: monospace;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .stat-card {
          padding: 16px;
          background: #111827;
          border-radius: 10px;
          text-align: center;
        }
        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: #f9fafb;
          margin: 0;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          margin: 4px 0 0 0;
        }
        .stat-unit {
          font-size: 14px;
          color: #9ca3af;
        }
      `}</style>

      <div className="summary-header">
        <h2 className="summary-title">Session Complete</h2>
        <p className="summary-subtitle">{session.name}</p>
      </div>

      <div className="summary-duration">
        {formatDuration(session.stats.duration)}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-value">{session.stats.wordsTranslated.toLocaleString()}</p>
          <p className="stat-label">Words Translated</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">{session.stats.signsRendered.toLocaleString()}</p>
          <p className="stat-label">Signs Rendered</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">
            {session.stats.averageLatency}
            <span className="stat-unit">ms</span>
          </p>
          <p className="stat-label">Average Latency</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">
            {session.stats.peakLatency}
            <span className="stat-unit">ms</span>
          </p>
          <p className="stat-label">Peak Latency</p>
        </div>
      </div>
    </div>
  );
}
