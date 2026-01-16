'use client';

import type { ASLSign, PipelineStatus } from '@/types';

export interface SignMateMessage {
  type: 'signs' | 'status' | 'transcript' | 'config' | 'ping' | 'pong';
  payload: unknown;
  timestamp: number;
}

export interface SignMateClientEvents {
  onSigns?: (signs: ASLSign[], text: string) => void;
  onStatus?: (status: PipelineStatus, latency: number) => void;
  onTranscript?: (text: string, final: boolean) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export type ClientType = 'stage' | 'monitor' | 'overlay' | 'control';

export class SignMateWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private clientType: ClientType;
  private events: SignMateClientEvents;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;

  constructor(
    url: string = 'ws://localhost:8080',
    clientType: ClientType = 'monitor',
    events: SignMateClientEvents = {}
  ) {
    this.url = url;
    this.clientType = clientType;
    this.events = events;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('Connected to SignMate server');
        this.reconnectAttempts = 0;

        // Send client type configuration
        this.send({
          type: 'config',
          payload: { clientType: this.clientType },
          timestamp: Date.now(),
        });

        this.events.onConnect?.();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as SignMateMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Disconnected from SignMate server');
        this.events.onDisconnect?.();

        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        this.events.onError?.(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: SignMateMessage): void {
    switch (message.type) {
      case 'signs': {
        const payload = message.payload as { signs: ASLSign[]; text: string };
        this.events.onSigns?.(payload.signs, payload.text);
        break;
      }

      case 'status': {
        const payload = message.payload as { status: PipelineStatus; latency: number };
        this.events.onStatus?.(payload.status, payload.latency);
        break;
      }

      case 'transcript': {
        const payload = message.payload as { text: string; final: boolean };
        this.events.onTranscript?.(payload.text, payload.final);
        break;
      }

      case 'ping':
        // Respond to server ping
        this.send({
          type: 'pong',
          payload: null,
          timestamp: Date.now(),
        });
        break;

      default:
        // Ignore unknown messages
        break;
    }
  }

  send(message: SignMateMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  setEvents(events: SignMateClientEvents): void {
    this.events = { ...this.events, ...events };
  }
}
