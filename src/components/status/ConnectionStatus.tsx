'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error';

interface ConnectionInfo {
  id: string;
  name: string;
  state: ConnectionState;
  latency?: number;
  lastConnected?: Date;
  errorMessage?: string;
}

interface ConnectionStatusProps {
  connections?: ConnectionInfo[];
  onReconnect?: (connectionId: string) => void;
  compact?: boolean;
  showDetails?: boolean;
  pollingInterval?: number;
}

interface SystemHealth {
  internet: ConnectionState;
  apiServer: ConnectionState;
  speechService: ConnectionState;
  translationService: ConnectionState;
}

const DEFAULT_CONNECTIONS: ConnectionInfo[] = [
  { id: 'internet', name: 'Internet', state: 'connected' },
  { id: 'api', name: 'API Server', state: 'connected' },
  { id: 'speech', name: 'Speech Recognition', state: 'connected' },
  { id: 'translation', name: 'Translation Service', state: 'connected' },
];

const STATE_COLORS: Record<ConnectionState, string> = {
  connected: '#10b981',
  connecting: '#f59e0b',
  disconnected: '#6b7280',
  error: '#ef4444',
};

const STATE_LABELS: Record<ConnectionState, string> = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  error: 'Error',
};

export function ConnectionStatus({
  connections: externalConnections,
  onReconnect,
  compact = false,
  showDetails = true,
  pollingInterval = 5000,
}: ConnectionStatusProps) {
  const [connections, setConnections] = useState<ConnectionInfo[]>(
    externalConnections || DEFAULT_CONNECTIONS
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [overallStatus, setOverallStatus] = useState<ConnectionState>('connected');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate overall status
  useEffect(() => {
    const hasError = connections.some((c) => c.state === 'error');
    const hasConnecting = connections.some((c) => c.state === 'connecting');
    const hasDisconnected = connections.some((c) => c.state === 'disconnected');
    const allConnected = connections.every((c) => c.state === 'connected');

    if (hasError) {
      setOverallStatus('error');
    } else if (hasConnecting) {
      setOverallStatus('connecting');
    } else if (hasDisconnected) {
      setOverallStatus('disconnected');
    } else if (allConnected) {
      setOverallStatus('connected');
    }
  }, [connections]);

  // Sync with external connections
  useEffect(() => {
    if (externalConnections) {
      setConnections(externalConnections);
    }
  }, [externalConnections]);

  // Simulated health check (in real app, this would ping actual services)
  const checkConnections = useCallback(async () => {
    // Check internet connectivity
    const internetOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    setConnections((prev) =>
      prev.map((conn) => {
        if (conn.id === 'internet') {
          return {
            ...conn,
            state: internetOnline ? 'connected' : 'disconnected',
            lastConnected: internetOnline ? new Date() : conn.lastConnected,
          };
        }

        // Simulate other service states based on internet
        if (!internetOnline) {
          return {
            ...conn,
            state: 'disconnected',
            errorMessage: 'No internet connection',
          };
        }

        // In real implementation, would ping each service
        return conn;
      })
    );
  }, []);

  // Set up polling
  useEffect(() => {
    checkConnections();

    intervalRef.current = setInterval(checkConnections, pollingInterval);

    // Listen for online/offline events
    const handleOnline = () => {
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === 'internet'
            ? { ...conn, state: 'connected', lastConnected: new Date() }
            : conn
        )
      );
    };

    const handleOffline = () => {
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === 'internet'
            ? { ...conn, state: 'disconnected' }
            : { ...conn, state: 'disconnected', errorMessage: 'No internet connection' }
        )
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnections, pollingInterval]);

  const handleReconnect = useCallback(
    (connectionId: string) => {
      setConnections((prev) =>
        prev.map((conn) =>
          conn.id === connectionId
            ? { ...conn, state: 'connecting', errorMessage: undefined }
            : conn
        )
      );

      onReconnect?.(connectionId);

      // Simulate reconnection attempt
      setTimeout(() => {
        setConnections((prev) =>
          prev.map((conn) =>
            conn.id === connectionId
              ? { ...conn, state: 'connected', lastConnected: new Date() }
              : conn
          )
        );
      }, 2000);
    },
    [onReconnect]
  );

  const formatLastConnected = (date?: Date): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="status-compact" onClick={() => setIsExpanded(!isExpanded)}>
        <style jsx>{`
          .status-compact {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: #1f2937;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .status-compact:hover {
            background: #374151;
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .status-dot.pulse {
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          .status-label {
            font-size: 12px;
            color: #9ca3af;
          }
          .expanded-menu {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: #1f2937;
            border-radius: 8px;
            padding: 12px;
            min-width: 200px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
            z-index: 100;
          }
          .menu-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            border-radius: 6px;
          }
          .menu-item:hover {
            background: #374151;
          }
          .menu-item-name {
            flex: 1;
            font-size: 13px;
            color: #e5e7eb;
          }
        `}</style>

        <div
          className={`status-dot ${overallStatus === 'connecting' ? 'pulse' : ''}`}
          style={{ background: STATE_COLORS[overallStatus] }}
        />
        <span className="status-label">{STATE_LABELS[overallStatus]}</span>

        {isExpanded && (
          <div className="expanded-menu">
            {connections.map((conn) => (
              <div key={conn.id} className="menu-item">
                <div
                  className="status-dot"
                  style={{ background: STATE_COLORS[conn.state] }}
                />
                <span className="menu-item-name">{conn.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="connection-status">
      <style jsx>{`
        .connection-status {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          max-width: 350px;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #1f2937;
          border-bottom: 1px solid #374151;
        }

        .overall-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .overall-indicator.pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 0 4px currentColor;
          }
        }

        .header-info {
          flex: 1;
        }

        .header-title {
          font-size: 14px;
          font-weight: 600;
          color: #f9fafb;
        }

        .header-status {
          font-size: 12px;
          color: #9ca3af;
        }

        .connections-list {
          padding: 16px 20px;
        }

        .connection-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #1f2937;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .connection-item:last-child {
          margin-bottom: 0;
        }

        .connection-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .connection-info {
          flex: 1;
          min-width: 0;
        }

        .connection-name {
          font-size: 13px;
          font-weight: 500;
          color: #f9fafb;
        }

        .connection-details {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        .connection-error {
          font-size: 11px;
          color: #fca5a5;
          margin-top: 2px;
        }

        .connection-latency {
          font-size: 11px;
          color: #9ca3af;
          padding: 2px 6px;
          background: #111827;
          border-radius: 4px;
        }

        .reconnect-btn {
          padding: 4px 8px;
          background: #374151;
          border: none;
          border-radius: 4px;
          color: #e5e7eb;
          font-size: 11px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .reconnect-btn:hover {
          background: #4b5563;
        }

        .reconnect-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .summary {
          display: flex;
          justify-content: space-between;
          padding: 12px 20px;
          background: #1f2937;
          border-top: 1px solid #374151;
        }

        .summary-item {
          text-align: center;
        }

        .summary-value {
          font-size: 16px;
          font-weight: 600;
          color: #f9fafb;
        }

        .summary-label {
          font-size: 11px;
          color: #6b7280;
        }
      `}</style>

      <div className="header">
        <div
          className={`overall-indicator ${overallStatus === 'connecting' ? 'pulse' : ''}`}
          style={{
            background: STATE_COLORS[overallStatus],
            color: STATE_COLORS[overallStatus],
          }}
        />
        <div className="header-info">
          <div className="header-title">Connection Status</div>
          <div className="header-status">
            {connections.filter((c) => c.state === 'connected').length} of{' '}
            {connections.length} services connected
          </div>
        </div>
      </div>

      <div className="connections-list">
        {connections.map((conn) => (
          <div key={conn.id} className="connection-item">
            <div
              className="connection-indicator"
              style={{ background: STATE_COLORS[conn.state] }}
            />
            <div className="connection-info">
              <div className="connection-name">{conn.name}</div>
              {showDetails && conn.state === 'connected' && (
                <div className="connection-details">
                  Last: {formatLastConnected(conn.lastConnected)}
                </div>
              )}
              {conn.errorMessage && (
                <div className="connection-error">{conn.errorMessage}</div>
              )}
            </div>
            {conn.latency !== undefined && conn.state === 'connected' && (
              <span className="connection-latency">{conn.latency}ms</span>
            )}
            {(conn.state === 'disconnected' || conn.state === 'error') && (
              <button
                className="reconnect-btn"
                onClick={() => handleReconnect(conn.id)}
              >
                Reconnect
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="summary">
        <div className="summary-item">
          <div className="summary-value" style={{ color: STATE_COLORS.connected }}>
            {connections.filter((c) => c.state === 'connected').length}
          </div>
          <div className="summary-label">Connected</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: STATE_COLORS.connecting }}>
            {connections.filter((c) => c.state === 'connecting').length}
          </div>
          <div className="summary-label">Connecting</div>
        </div>
        <div className="summary-item">
          <div className="summary-value" style={{ color: STATE_COLORS.error }}>
            {connections.filter((c) => c.state === 'error').length}
          </div>
          <div className="summary-label">Errors</div>
        </div>
      </div>
    </div>
  );
}

// Hook for managing connection status
export function useConnectionStatus(options: {
  pollingInterval?: number;
  onStatusChange?: (status: ConnectionState) => void;
} = {}) {
  const { pollingInterval = 5000, onStatusChange } = options;
  const [health, setHealth] = useState<SystemHealth>({
    internet: 'connected',
    apiServer: 'connected',
    speechService: 'connected',
    translationService: 'connected',
  });
  const [isOnline, setIsOnline] = useState(true);
  const previousStatusRef = useRef<ConnectionState>('connected');

  useEffect(() => {
    const checkHealth = () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsOnline(online);

      setHealth((prev) => ({
        ...prev,
        internet: online ? 'connected' : 'disconnected',
      }));
    };

    checkHealth();
    const interval = setInterval(checkHealth, pollingInterval);

    const handleOnline = () => {
      setIsOnline(true);
      setHealth((prev) => ({ ...prev, internet: 'connected' }));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHealth((prev) => ({ ...prev, internet: 'disconnected' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pollingInterval]);

  // Calculate overall status and notify on change
  useEffect(() => {
    const states = Object.values(health);
    let status: ConnectionState = 'connected';

    if (states.some((s) => s === 'error')) {
      status = 'error';
    } else if (states.some((s) => s === 'connecting')) {
      status = 'connecting';
    } else if (states.some((s) => s === 'disconnected')) {
      status = 'disconnected';
    }

    if (status !== previousStatusRef.current) {
      previousStatusRef.current = status;
      onStatusChange?.(status);
    }
  }, [health, onStatusChange]);

  const updateServiceStatus = useCallback(
    (service: keyof SystemHealth, state: ConnectionState) => {
      setHealth((prev) => ({ ...prev, [service]: state }));
    },
    []
  );

  return {
    health,
    isOnline,
    updateServiceStatus,
    overallStatus: previousStatusRef.current,
  };
}

export type { ConnectionInfo, ConnectionState, SystemHealth };
