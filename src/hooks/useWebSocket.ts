'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SignMateWebSocketClient,
  type ClientType,
  type SignMateClientEvents,
} from '@/lib/websocket/client';
import type { ASLSign, PipelineStatus } from '@/types';

// Simple connection status for WebSocket state
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface WebSocketState {
  isConnected: boolean;
  signs: ASLSign[];
  currentText: string;
  connectionStatus: ConnectionStatus;
  pipelineStatus: PipelineStatus | null;
  latency: number;
  transcript: string;
  isTranscriptFinal: boolean;
}

interface UseWebSocketOptions {
  url?: string;
  clientType?: ClientType;
  autoConnect?: boolean;
}

interface UseWebSocketReturn extends WebSocketState {
  connect: () => void;
  disconnect: () => void;
  client: SignMateWebSocketClient | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = 'ws://localhost:8080',
    clientType = 'monitor',
    autoConnect = true,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    signs: [],
    currentText: '',
    connectionStatus: 'idle',
    pipelineStatus: null,
    latency: 0,
    transcript: '',
    isTranscriptFinal: false,
  });

  const clientRef = useRef<SignMateWebSocketClient | null>(null);

  const handleSigns = useCallback((signs: ASLSign[], text: string) => {
    setState((prev) => ({
      ...prev,
      signs,
      currentText: text,
    }));
  }, []);

  const handleStatus = useCallback((status: PipelineStatus, latency: number) => {
    setState((prev) => ({
      ...prev,
      pipelineStatus: status,
      latency,
    }));
  }, []);

  const handleTranscript = useCallback((text: string, final: boolean) => {
    setState((prev) => ({
      ...prev,
      transcript: text,
      isTranscriptFinal: final,
    }));
  }, []);

  const handleConnect = useCallback(() => {
    setState((prev) => ({ ...prev, isConnected: true, connectionStatus: 'connected' as ConnectionStatus }));
  }, []);

  const handleDisconnect = useCallback(() => {
    setState((prev) => ({ ...prev, isConnected: false, connectionStatus: 'idle' as ConnectionStatus }));
  }, []);

  const connect = useCallback(() => {
    if (!clientRef.current) {
      const events: SignMateClientEvents = {
        onSigns: handleSigns,
        onStatus: handleStatus,
        onTranscript: handleTranscript,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
      };

      clientRef.current = new SignMateWebSocketClient(url, clientType, events);
    }

    clientRef.current.connect();
  }, [url, clientType, handleSigns, handleStatus, handleTranscript, handleConnect, handleDisconnect]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, [autoConnect, connect]);

  return {
    ...state,
    connect,
    disconnect,
    client: clientRef.current,
  };
}
