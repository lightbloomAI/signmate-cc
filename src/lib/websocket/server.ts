'use server';

import { WebSocket, WebSocketServer } from 'ws';
import type { ASLSign, PipelineStatus } from '@/types';

export interface SignMateMessage {
  type: 'signs' | 'status' | 'transcript' | 'config' | 'ping' | 'pong';
  payload: unknown;
  timestamp: number;
}

export interface ClientInfo {
  id: string;
  type: 'stage' | 'monitor' | 'overlay' | 'control';
  connected: number;
}

interface SignsPayload {
  signs: ASLSign[];
  text: string;
}

interface StatusPayload {
  status: PipelineStatus;
  latency: number;
}

interface TranscriptPayload {
  text: string;
  final: boolean;
}

interface ConfigPayload {
  [key: string]: unknown;
}

export class SignMateWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(private port: number = 8080) {}

  start(): void {
    if (this.wss) {
      console.warn('WebSocket server already running');
      return;
    }

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      const clientInfo: ClientInfo = {
        id: clientId,
        type: 'monitor',
        connected: Date.now(),
      };

      this.clients.set(ws, clientInfo);
      console.log(`Client connected: ${clientId}`);

      // Send welcome message with initial pipeline status
      const initialStatus: PipelineStatus = {
        audioCapture: 'idle',
        speechRecognition: 'idle',
        aslTranslation: 'idle',
        avatarRendering: 'idle',
        latency: 0,
        errors: [],
      };
      this.sendToClient(ws, {
        type: 'status',
        payload: { status: initialStatus, latency: 0 },
        timestamp: Date.now(),
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as SignMateMessage;
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid message format:', error);
        }
      });

      ws.on('close', () => {
        const info = this.clients.get(ws);
        console.log(`Client disconnected: ${info?.id}`);
        this.clients.delete(ws);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${clientInfo.id}:`, error);
      });
    });

    // Start ping interval to keep connections alive
    this.pingInterval = setInterval(() => {
      this.broadcast({
        type: 'ping',
        payload: null,
        timestamp: Date.now(),
      });
    }, 30000);

    console.log(`SignMate WebSocket server running on port ${this.port}`);
  }

  stop(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('WebSocket server stopped');
  }

  private handleMessage(ws: WebSocket, message: SignMateMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'config':
        // Client is updating its configuration
        const configPayload = message.payload as ConfigPayload;
        if (configPayload.clientType) {
          client.type = configPayload.clientType as ClientInfo['type'];
        }
        break;

      case 'pong':
        // Client responded to ping
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  private sendToClient(ws: WebSocket, message: SignMateMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods for broadcasting from the pipeline

  broadcast(message: SignMateMessage): void {
    this.clients.forEach((_, ws) => {
      this.sendToClient(ws, message);
    });
  }

  broadcastSigns(signs: ASLSign[], text: string): void {
    const payload: SignsPayload = { signs, text };
    this.broadcast({
      type: 'signs',
      payload,
      timestamp: Date.now(),
    });
  }

  broadcastStatus(status: PipelineStatus, latency: number): void {
    const payload: StatusPayload = { status, latency };
    this.broadcast({
      type: 'status',
      payload,
      timestamp: Date.now(),
    });
  }

  broadcastTranscript(text: string, final: boolean): void {
    const payload: TranscriptPayload = { text, final };
    this.broadcast({
      type: 'transcript',
      payload,
      timestamp: Date.now(),
    });
  }

  // Send to specific client types only
  broadcastToType(type: ClientInfo['type'], message: SignMateMessage): void {
    this.clients.forEach((info, ws) => {
      if (info.type === type) {
        this.sendToClient(ws, message);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClients(): ClientInfo[] {
    return Array.from(this.clients.values());
  }
}

// Singleton instance for the application
let serverInstance: SignMateWebSocketServer | null = null;

export function getWebSocketServer(port?: number): SignMateWebSocketServer {
  if (!serverInstance) {
    serverInstance = new SignMateWebSocketServer(port);
  }
  return serverInstance;
}
