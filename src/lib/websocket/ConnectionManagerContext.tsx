'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useCallback, useState } from 'react';
import {
  WebSocketConnectionManager,
  ConnectionPool,
  getConnectionPool,
  type ConnectionConfig,
  type ConnectionState,
  type ConnectionMetrics,
  type ConnectionEventType,
  type ConnectionMessage,
} from './connectionManager';
import type { ASLSign, PipelineStatus } from '@/types';

/**
 * Connection Manager Context
 *
 * Provides WebSocket connection management throughout the React app
 */

interface ConnectionManagerContextValue {
  // Connection pool access
  pool: ConnectionPool;

  // Primary connection
  primaryConnection: WebSocketConnectionManager | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  metrics: ConnectionMetrics | null;

  // Connection methods
  connect: () => void;
  disconnect: () => void;
  suspend: () => void;
  resume: () => void;

  // Create additional connections
  createConnection: (config: Partial<ConnectionConfig> & { clientType: ConnectionConfig['clientType'] }) => WebSocketConnectionManager;
  removeConnection: (clientId: string) => void;

  // Data
  signs: ASLSign[];
  currentText: string;
  transcript: string;
  isTranscriptFinal: boolean;
  pipelineStatus: PipelineStatus | null;
  latency: number;

  // Sending
  send: (message: Omit<ConnectionMessage, 'id'>) => void;
  sendWithAck: (message: Omit<ConnectionMessage, 'id' | 'requiresAck'>, timeout?: number) => Promise<boolean>;
}

const ConnectionManagerContext = createContext<ConnectionManagerContextValue | null>(null);

interface ConnectionManagerProviderProps {
  children: React.ReactNode;
  url?: string;
  clientType?: ConnectionConfig['clientType'];
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onQualityChange?: (from: string, to: string) => void;
}

export function ConnectionManagerProvider({
  children,
  url = 'ws://localhost:8080',
  clientType = 'monitor',
  autoConnect = true,
  onConnect,
  onDisconnect,
  onError,
  onQualityChange,
}: ConnectionManagerProviderProps) {
  const poolRef = useRef<ConnectionPool | null>(null);
  const connectionRef = useRef<WebSocketConnectionManager | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [signs, setSigns] = useState<ASLSign[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isTranscriptFinal, setIsTranscriptFinal] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus | null>(null);
  const [latency, setLatency] = useState(0);

  // Initialize pool and primary connection
  useEffect(() => {
    poolRef.current = getConnectionPool(url);

    const connection = poolRef.current.create({
      url,
      clientType,
      autoConnect: false,
      enableMetrics: true,
    });

    connectionRef.current = connection;

    // Set up event listeners
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      connection.on('stateChange', ({ to }) => {
        setConnectionState(to);
      })
    );

    unsubscribers.push(
      connection.on('connect', () => {
        onConnect?.();
      })
    );

    unsubscribers.push(
      connection.on('disconnect', () => {
        onDisconnect?.();
      })
    );

    unsubscribers.push(
      connection.on('error', (error) => {
        onError?.(error);
      })
    );

    unsubscribers.push(
      connection.on('metricsUpdate', (newMetrics) => {
        setMetrics(newMetrics);
        setLatency(newMetrics.latency);
      })
    );

    unsubscribers.push(
      connection.on('qualityChange', ({ from, to }) => {
        onQualityChange?.(from, to);
      })
    );

    unsubscribers.push(
      connection.on('signs', ({ signs: newSigns, text }) => {
        setSigns(newSigns);
        setCurrentText(text);
      })
    );

    unsubscribers.push(
      connection.on('status', ({ status, latency: statusLatency }) => {
        setPipelineStatus(status);
        setLatency(statusLatency);
      })
    );

    unsubscribers.push(
      connection.on('transcript', ({ text, final }) => {
        setTranscript(text);
        setIsTranscriptFinal(final);
      })
    );

    // Auto-connect if enabled
    if (autoConnect) {
      connection.connect();
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      connection.destroy();
      poolRef.current?.remove(connection.getClientId());
    };
  }, [url, clientType, autoConnect, onConnect, onDisconnect, onError, onQualityChange]);

  const connect = useCallback(() => {
    connectionRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    connectionRef.current?.disconnect();
  }, []);

  const suspend = useCallback(() => {
    connectionRef.current?.suspend();
  }, []);

  const resume = useCallback(() => {
    connectionRef.current?.resume();
  }, []);

  const createConnection = useCallback(
    (config: Partial<ConnectionConfig> & { clientType: ConnectionConfig['clientType'] }) => {
      return poolRef.current!.create({
        url,
        ...config,
      });
    },
    [url]
  );

  const removeConnection = useCallback((clientId: string) => {
    poolRef.current?.remove(clientId);
  }, []);

  const send = useCallback((message: Omit<ConnectionMessage, 'id'>) => {
    if (connectionRef.current?.isConnected()) {
      connectionRef.current.send({
        ...message,
        id: `send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });
    }
  }, []);

  const sendWithAck = useCallback(
    (message: Omit<ConnectionMessage, 'id' | 'requiresAck'>, timeout?: number) => {
      if (!connectionRef.current?.isConnected()) {
        return Promise.reject(new Error('Not connected'));
      }
      return connectionRef.current.sendWithAck(message, timeout);
    },
    []
  );

  const value = useMemo<ConnectionManagerContextValue>(
    () => ({
      pool: poolRef.current!,
      primaryConnection: connectionRef.current,
      connectionState,
      isConnected: connectionState === 'connected',
      metrics,
      connect,
      disconnect,
      suspend,
      resume,
      createConnection,
      removeConnection,
      signs,
      currentText,
      transcript,
      isTranscriptFinal,
      pipelineStatus,
      latency,
      send,
      sendWithAck,
    }),
    [
      connectionState,
      metrics,
      connect,
      disconnect,
      suspend,
      resume,
      createConnection,
      removeConnection,
      signs,
      currentText,
      transcript,
      isTranscriptFinal,
      pipelineStatus,
      latency,
      send,
      sendWithAck,
    ]
  );

  return (
    <ConnectionManagerContext.Provider value={value}>
      {children}
    </ConnectionManagerContext.Provider>
  );
}

/**
 * Hook to access the connection manager context
 */
export function useConnectionManager(): ConnectionManagerContextValue {
  const context = useContext(ConnectionManagerContext);

  if (!context) {
    throw new Error('useConnectionManager must be used within a ConnectionManagerProvider');
  }

  return context;
}

/**
 * Hook for creating and managing a secondary connection
 */
export function useSecondaryConnection(
  config: Partial<ConnectionConfig> & { clientType: ConnectionConfig['clientType'] }
) {
  const { pool } = useConnectionManager();
  const connectionRef = useRef<WebSocketConnectionManager | null>(null);
  const [state, setState] = useState<ConnectionState>('disconnected');
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);

  useEffect(() => {
    const connection = pool.create(config);
    connectionRef.current = connection;

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      connection.on('stateChange', ({ to }) => {
        setState(to);
      })
    );

    unsubscribers.push(
      connection.on('metricsUpdate', (newMetrics) => {
        setMetrics(newMetrics);
      })
    );

    if (config.autoConnect !== false) {
      connection.connect();
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      connection.destroy();
      pool.remove(connection.getClientId());
    };
  }, [pool, config.clientType, config.url, config.autoConnect]);

  return {
    connection: connectionRef.current,
    state,
    metrics,
    isConnected: state === 'connected',
    connect: () => connectionRef.current?.connect(),
    disconnect: () => connectionRef.current?.disconnect(),
  };
}

/**
 * Hook for monitoring connection health
 */
export function useConnectionHealth() {
  const { metrics, connectionState, isConnected } = useConnectionManager();

  return {
    isConnected,
    state: connectionState,
    latency: metrics?.latency ?? 0,
    averageLatency: metrics?.averageLatency ?? 0,
    jitter: metrics?.jitter ?? 0,
    packetLoss: metrics?.packetLoss ?? 0,
    quality: metrics?.connectionQuality ?? 'good',
    missedHeartbeats: metrics?.missedHeartbeats ?? 0,
    reconnectCount: metrics?.reconnectCount ?? 0,
    connectionDuration: metrics?.connectedAt ? Date.now() - metrics.connectedAt : 0,
    messagesReceived: metrics?.messagesReceived ?? 0,
    messagesSent: metrics?.messagesSent ?? 0,
    bytesReceived: metrics?.bytesReceived ?? 0,
    bytesSent: metrics?.bytesSent ?? 0,
  };
}

/**
 * Hook for subscribing to specific connection events
 */
export function useConnectionEvent<T>(
  event: ConnectionEventType,
  handler: (data: T) => void
) {
  const { primaryConnection } = useConnectionManager();

  useEffect(() => {
    if (!primaryConnection) return;

    const unsubscribe = primaryConnection.on(event, handler as (data: unknown) => void);
    return unsubscribe;
  }, [primaryConnection, event, handler]);
}

/**
 * Safe version of useConnectionHealth that returns null if context is not available
 * Use this when the component might render outside of ConnectionManagerProvider
 */
export function useConnectionHealthSafe() {
  const context = useContext(ConnectionManagerContext);

  if (!context) {
    return null;
  }

  const { metrics, connectionState, isConnected } = context;

  return {
    isConnected,
    state: connectionState,
    latency: metrics?.latency ?? 0,
    averageLatency: metrics?.averageLatency ?? 0,
    jitter: metrics?.jitter ?? 0,
    packetLoss: metrics?.packetLoss ?? 0,
    quality: metrics?.connectionQuality ?? 'good',
    missedHeartbeats: metrics?.missedHeartbeats ?? 0,
    reconnectCount: metrics?.reconnectCount ?? 0,
    connectionDuration: metrics?.connectedAt ? Date.now() - metrics.connectedAt : 0,
    messagesReceived: metrics?.messagesReceived ?? 0,
    messagesSent: metrics?.messagesSent ?? 0,
    bytesReceived: metrics?.bytesReceived ?? 0,
    bytesSent: metrics?.bytesSent ?? 0,
  };
}
