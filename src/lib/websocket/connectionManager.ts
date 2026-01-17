'use client';

import type { ASLSign, PipelineStatus } from '@/types';

/**
 * WebSocket Connection Manager for SignMate
 *
 * Provides robust connection management with:
 * - Connection pooling for multiple displays
 * - Automatic reconnection with exponential backoff
 * - Connection health monitoring
 * - Quality metrics and adaptive behavior
 * - Event-driven architecture
 */

// Connection states
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'suspended';

// Message types
export type MessageType =
  | 'signs'
  | 'status'
  | 'transcript'
  | 'config'
  | 'ping'
  | 'pong'
  | 'heartbeat'
  | 'subscribe'
  | 'unsubscribe'
  | 'ack';

export interface ConnectionMessage {
  id: string;
  type: MessageType;
  payload: unknown;
  timestamp: number;
  requiresAck?: boolean;
}

export interface ConnectionConfig {
  url: string;
  clientId?: string;
  clientType: 'stage' | 'monitor' | 'overlay' | 'control' | 'backup';
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  messageTimeout?: number;
  bufferMessages?: boolean;
  maxBufferSize?: number;
  enableMetrics?: boolean;
}

export interface ConnectionMetrics {
  connectionId: string;
  connectedAt: number | null;
  disconnectedAt: number | null;
  reconnectCount: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  latency: number;
  latencyHistory: number[];
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  packetLoss: number;
  jitter: number;
  lastHeartbeatAt: number | null;
  missedHeartbeats: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
}

export interface PendingMessage {
  message: ConnectionMessage;
  timestamp: number;
  retryCount: number;
  resolve: (acked: boolean) => void;
  reject: (error: Error) => void;
}

export type ConnectionEventType =
  | 'connect'
  | 'disconnect'
  | 'reconnecting'
  | 'reconnected'
  | 'error'
  | 'message'
  | 'signs'
  | 'status'
  | 'transcript'
  | 'stateChange'
  | 'metricsUpdate'
  | 'qualityChange';

export type ConnectionEventHandler<T = unknown> = (data: T) => void;

interface ConnectionEventMap {
  connect: void;
  disconnect: { code: number; reason: string };
  reconnecting: { attempt: number; maxAttempts: number; delay: number };
  reconnected: { attempts: number };
  error: Error;
  message: ConnectionMessage;
  signs: { signs: ASLSign[]; text: string };
  status: { status: PipelineStatus; latency: number };
  transcript: { text: string; final: boolean };
  stateChange: { from: ConnectionState; to: ConnectionState };
  metricsUpdate: ConnectionMetrics;
  qualityChange: { from: string; to: string };
}

const DEFAULT_CONFIG: Required<Omit<ConnectionConfig, 'clientId' | 'url' | 'clientType'>> = {
  autoConnect: true,
  reconnect: true,
  maxReconnectAttempts: 10,
  reconnectBaseDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 15000,
  heartbeatTimeout: 5000,
  messageTimeout: 10000,
  bufferMessages: true,
  maxBufferSize: 100,
  enableMetrics: true,
};

export class WebSocketConnectionManager {
  private ws: WebSocket | null = null;
  private config: Required<ConnectionConfig>;
  private state: ConnectionState = 'disconnected';
  private metrics: ConnectionMetrics;
  private eventListeners: Map<ConnectionEventType, Set<ConnectionEventHandler>> = new Map();

  // Reconnection
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  // Heartbeat
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private heartbeatTimeoutTimer: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;

  // Message handling
  private messageBuffer: ConnectionMessage[] = [];
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private messageIdCounter = 0;

  // Latency tracking
  private pendingPings: Map<string, number> = new Map();

  constructor(config: ConnectionConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      clientId: config.clientId || this.generateClientId(),
    };

    this.metrics = this.createInitialMetrics();
  }

  private createInitialMetrics(): ConnectionMetrics {
    return {
      connectionId: this.config.clientId!,
      connectedAt: null,
      disconnectedAt: null,
      reconnectCount: 0,
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      latency: 0,
      latencyHistory: [],
      averageLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      packetLoss: 0,
      jitter: 0,
      lastHeartbeatAt: null,
      missedHeartbeats: 0,
      connectionQuality: 'good',
    };
  }

  private generateClientId(): string {
    return `sm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${this.config.clientId}-${++this.messageIdCounter}`;
  }

  // Event handling
  on<K extends ConnectionEventType>(event: K, handler: ConnectionEventHandler<ConnectionEventMap[K]>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as ConnectionEventHandler);

    return () => this.off(event, handler);
  }

  off<K extends ConnectionEventType>(event: K, handler: ConnectionEventHandler<ConnectionEventMap[K]>): void {
    this.eventListeners.get(event)?.delete(handler as ConnectionEventHandler);
  }

  private emit<K extends ConnectionEventType>(event: K, data?: ConnectionEventMap[K]): void {
    this.eventListeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  // State management
  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      const from = this.state;
      this.state = newState;
      this.emit('stateChange', { from, to: newState });
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  // Connection management
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('[ConnectionManager] Already connected');
      return;
    }

    if (this.state === 'connecting') {
      console.warn('[ConnectionManager] Connection in progress');
      return;
    }

    this.isIntentionallyClosed = false;
    this.setState('connecting');

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('[ConnectionManager] Failed to create WebSocket:', error);
      this.handleConnectionError(error as Error);
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.metrics.disconnectedAt = Date.now();
    this.setState('disconnected');
    this.emit('disconnect', { code: 1000, reason: 'Client disconnect' });
  }

  suspend(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    this.setState('suspended');

    if (this.ws) {
      this.ws.close(1000, 'Connection suspended');
      this.ws = null;
    }
  }

  resume(): void {
    if (this.state === 'suspended') {
      this.isIntentionallyClosed = false;
      this.connect();
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[ConnectionManager] Connected');
      this.setState('connected');
      this.metrics.connectedAt = Date.now();
      this.reconnectAttempts = 0;

      // Send client configuration
      this.sendConfig();

      // Start heartbeat
      this.startHeartbeat();

      // Flush message buffer
      this.flushMessageBuffer();

      this.emit('connect', undefined);

      if (this.metrics.reconnectCount > 0) {
        this.emit('reconnected', { attempts: this.metrics.reconnectCount });
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      console.log(`[ConnectionManager] Disconnected: ${event.code} - ${event.reason}`);
      this.stopHeartbeat();
      this.metrics.disconnectedAt = Date.now();

      this.emit('disconnect', { code: event.code, reason: event.reason });

      if (!this.isIntentionallyClosed && this.config.reconnect) {
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    };

    this.ws.onerror = (event: Event) => {
      console.error('[ConnectionManager] WebSocket error:', event);
      this.handleConnectionError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      const message = JSON.parse(data) as ConnectionMessage;

      this.metrics.messagesReceived++;
      this.metrics.bytesReceived += data.length;

      // Handle internal message types
      switch (message.type) {
        case 'pong':
          this.handlePong(message);
          break;
        case 'heartbeat':
          this.handleHeartbeatResponse(message);
          break;
        case 'ack':
          this.handleAck(message);
          break;
        case 'signs':
          this.emit('signs', message.payload as { signs: ASLSign[]; text: string });
          break;
        case 'status':
          this.emit('status', message.payload as { status: PipelineStatus; latency: number });
          break;
        case 'transcript':
          this.emit('transcript', message.payload as { text: string; final: boolean });
          break;
        case 'ping':
          // Respond to server ping
          this.send({ type: 'pong', payload: { requestId: message.id }, timestamp: Date.now(), id: this.generateMessageId() });
          break;
      }

      this.emit('message', message);
    } catch (error) {
      console.error('[ConnectionManager] Failed to parse message:', error);
    }
  }

  private handlePong(message: ConnectionMessage): void {
    const payload = message.payload as { requestId: string };
    const sentTime = this.pendingPings.get(payload.requestId);

    if (sentTime) {
      const latency = Date.now() - sentTime;
      this.updateLatencyMetrics(latency);
      this.pendingPings.delete(payload.requestId);
    }

    this.lastPongTime = Date.now();
    this.metrics.lastHeartbeatAt = this.lastPongTime;
    this.metrics.missedHeartbeats = 0;

    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private handleHeartbeatResponse(message: ConnectionMessage): void {
    const payload = message.payload as { requestId: string; serverTime: number };
    const sentTime = this.pendingPings.get(payload.requestId);

    if (sentTime) {
      const roundTripTime = Date.now() - sentTime;
      this.updateLatencyMetrics(roundTripTime / 2); // Approximate one-way latency
      this.pendingPings.delete(payload.requestId);
    }
  }

  private handleAck(message: ConnectionMessage): void {
    const payload = message.payload as { messageId: string };
    const pending = this.pendingMessages.get(payload.messageId);

    if (pending) {
      pending.resolve(true);
      this.pendingMessages.delete(payload.messageId);
    }
  }

  private updateLatencyMetrics(latency: number): void {
    this.metrics.latency = latency;
    this.metrics.latencyHistory.push(latency);

    // Keep last 100 measurements
    if (this.metrics.latencyHistory.length > 100) {
      this.metrics.latencyHistory.shift();
    }

    // Update statistics
    const history = this.metrics.latencyHistory;
    this.metrics.averageLatency = history.reduce((a, b) => a + b, 0) / history.length;
    this.metrics.minLatency = Math.min(...history);
    this.metrics.maxLatency = Math.max(...history);

    // Calculate jitter (standard deviation)
    const squaredDiffs = history.map(l => Math.pow(l - this.metrics.averageLatency, 2));
    this.metrics.jitter = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / history.length);

    // Update connection quality
    this.updateConnectionQuality();

    if (this.config.enableMetrics) {
      this.emit('metricsUpdate', this.metrics);
    }
  }

  private updateConnectionQuality(): void {
    const { averageLatency, jitter, packetLoss, missedHeartbeats } = this.metrics;
    const previousQuality = this.metrics.connectionQuality;

    let newQuality: ConnectionMetrics['connectionQuality'];

    if (packetLoss > 10 || missedHeartbeats > 3) {
      newQuality = 'critical';
    } else if (averageLatency > 500 || jitter > 200 || packetLoss > 5) {
      newQuality = 'poor';
    } else if (averageLatency > 200 || jitter > 100 || packetLoss > 2) {
      newQuality = 'fair';
    } else if (averageLatency > 100 || jitter > 50) {
      newQuality = 'good';
    } else {
      newQuality = 'excellent';
    }

    if (newQuality !== previousQuality) {
      this.metrics.connectionQuality = newQuality;
      this.emit('qualityChange', { from: previousQuality, to: newQuality });
    }
  }

  // Heartbeat management
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, this.config.heartbeatInterval);

    // Send initial ping
    this.sendPing();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private sendPing(): void {
    const pingId = this.generateMessageId();
    this.pendingPings.set(pingId, Date.now());

    this.send({
      id: pingId,
      type: 'ping',
      payload: { timestamp: Date.now() },
      timestamp: Date.now(),
    });

    // Set timeout for pong response
    this.heartbeatTimeoutTimer = setTimeout(() => {
      this.metrics.missedHeartbeats++;
      this.pendingPings.delete(pingId);

      if (this.metrics.missedHeartbeats >= 3) {
        console.warn('[ConnectionManager] Too many missed heartbeats, reconnecting...');
        this.ws?.close(4000, 'Heartbeat timeout');
      }
    }, this.config.heartbeatTimeout);
  }

  // Reconnection management
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[ConnectionManager] Max reconnection attempts reached');
      this.setState('error');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    this.metrics.reconnectCount++;
    this.setState('reconnecting');

    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, this.config.maxReconnectDelay);

    console.log(`[ConnectionManager] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private handleConnectionError(error: Error): void {
    this.emit('error', error);

    if (!this.isIntentionallyClosed && this.config.reconnect) {
      this.scheduleReconnect();
    } else {
      this.setState('error');
    }
  }

  // Message sending
  private sendConfig(): void {
    this.send({
      id: this.generateMessageId(),
      type: 'config',
      payload: {
        clientId: this.config.clientId,
        clientType: this.config.clientType,
        capabilities: ['signs', 'status', 'transcript'],
      },
      timestamp: Date.now(),
    });
  }

  send(message: ConnectionMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      this.ws.send(data);
      this.metrics.messagesSent++;
      this.metrics.bytesSent += data.length;
    } else if (this.config.bufferMessages && this.messageBuffer.length < this.config.maxBufferSize) {
      this.messageBuffer.push(message);
    } else {
      console.warn('[ConnectionManager] Cannot send message - not connected and buffer full');
    }
  }

  async sendWithAck(message: Omit<ConnectionMessage, 'id' | 'requiresAck'>, timeout?: number): Promise<boolean> {
    const fullMessage: ConnectionMessage = {
      ...message,
      id: this.generateMessageId(),
      requiresAck: true,
    };

    return new Promise((resolve, reject) => {
      const timeoutMs = timeout || this.config.messageTimeout;

      const pending: PendingMessage = {
        message: fullMessage,
        timestamp: Date.now(),
        retryCount: 0,
        resolve,
        reject,
      };

      this.pendingMessages.set(fullMessage.id, pending);
      this.send(fullMessage);

      setTimeout(() => {
        if (this.pendingMessages.has(fullMessage.id)) {
          this.pendingMessages.delete(fullMessage.id);
          reject(new Error('Message acknowledgment timeout'));
        }
      }, timeoutMs);
    });
  }

  private flushMessageBuffer(): void {
    while (this.messageBuffer.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageBuffer.shift()!;
      this.send(message);
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  getClientId(): string {
    return this.config.clientId!;
  }

  getClientType(): string {
    return this.config.clientType;
  }

  getConnectionDuration(): number {
    if (!this.metrics.connectedAt) return 0;
    return Date.now() - this.metrics.connectedAt;
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.pendingMessages.clear();
    this.pendingPings.clear();
    this.messageBuffer = [];
  }
}

// Connection Pool for managing multiple displays
export class ConnectionPool {
  private connections: Map<string, WebSocketConnectionManager> = new Map();
  private defaultUrl: string;

  constructor(defaultUrl: string = 'ws://localhost:8080') {
    this.defaultUrl = defaultUrl;
  }

  create(config: Partial<ConnectionConfig> & { clientType: ConnectionConfig['clientType'] }): WebSocketConnectionManager {
    const fullConfig: ConnectionConfig = {
      url: config.url || this.defaultUrl,
      ...config,
    };

    const manager = new WebSocketConnectionManager(fullConfig);
    this.connections.set(manager.getClientId(), manager);
    return manager;
  }

  get(clientId: string): WebSocketConnectionManager | undefined {
    return this.connections.get(clientId);
  }

  remove(clientId: string): void {
    const manager = this.connections.get(clientId);
    if (manager) {
      manager.destroy();
      this.connections.delete(clientId);
    }
  }

  getAll(): WebSocketConnectionManager[] {
    return Array.from(this.connections.values());
  }

  getAllMetrics(): ConnectionMetrics[] {
    return this.getAll().map(conn => conn.getMetrics());
  }

  broadcast(message: Omit<ConnectionMessage, 'id'>): void {
    this.connections.forEach(conn => {
      if (conn.isConnected()) {
        conn.send({
          ...message,
          id: `broadcast-${Date.now()}`,
        });
      }
    });
  }

  disconnectAll(): void {
    this.connections.forEach(conn => conn.disconnect());
  }

  destroyAll(): void {
    this.connections.forEach(conn => conn.destroy());
    this.connections.clear();
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnectedCount(): number {
    return this.getAll().filter(conn => conn.isConnected()).length;
  }
}

// Singleton pool instance
let poolInstance: ConnectionPool | null = null;

export function getConnectionPool(url?: string): ConnectionPool {
  if (!poolInstance) {
    poolInstance = new ConnectionPool(url);
  }
  return poolInstance;
}
