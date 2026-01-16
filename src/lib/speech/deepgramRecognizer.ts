'use client';

import type { TranscriptionSegment } from '@/types';
import { handleErrorCode } from '@/lib/errors';
import { ErrorCodes } from '@/lib/errors/types';

export interface DeepgramConfig {
  apiKey: string;
  language: string;
  model: 'nova-2' | 'nova' | 'enhanced' | 'base';
  punctuate: boolean;
  interim_results: boolean;
  endpointing: number; // ms of silence before ending utterance
  vad_events: boolean; // voice activity detection
  smart_format: boolean; // automatic formatting
  filler_words: boolean; // include um, uh, etc.
}

const defaultConfig: DeepgramConfig = {
  apiKey: '',
  language: 'en-US',
  model: 'nova-2',
  punctuate: true,
  interim_results: true,
  endpointing: 300,
  vad_events: true,
  smart_format: true,
  filler_words: false,
};

export type DeepgramTranscriptionCallback = (segment: TranscriptionSegment) => void;
export type DeepgramErrorCallback = (error: Error) => void;
export type DeepgramReadyCallback = () => void;

interface DeepgramWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
  punctuated_word?: string;
}

interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWord[];
}

interface DeepgramChannel {
  alternatives: DeepgramAlternative[];
}

interface DeepgramMetadata {
  request_id: string;
  model_info: {
    name: string;
    version: string;
  };
  model_uuid: string;
}

interface DeepgramResponse {
  type: 'Results' | 'Metadata' | 'SpeechStarted' | 'UtteranceEnd';
  channel_index: [number, number];
  duration: number;
  start: number;
  is_final: boolean;
  speech_final: boolean;
  channel: DeepgramChannel;
  metadata?: DeepgramMetadata;
}

export class DeepgramRecognizer {
  private config: DeepgramConfig;
  private socket: WebSocket | null = null;
  private isConnected = false;
  private isListening = false;
  private segmentId = 0;
  private sessionStartTime = 0;

  private onTranscription: DeepgramTranscriptionCallback | null = null;
  private onError: DeepgramErrorCallback | null = null;
  private onReady: DeepgramReadyCallback | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private currentUtteranceText = '';
  private utteranceStartTime = 0;

  constructor(config: Partial<DeepgramConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async connect(
    onTranscription: DeepgramTranscriptionCallback,
    onError?: DeepgramErrorCallback,
    onReady?: DeepgramReadyCallback
  ): Promise<void> {
    if (!this.config.apiKey) {
      const error = new Error('Deepgram API key is required');
      onError?.(error);
      throw error;
    }

    this.onTranscription = onTranscription;
    this.onError = onError || null;
    this.onReady = onReady || null;

    return this.establishConnection();
  }

  private async establishConnection(): Promise<void> {
    // Build WebSocket URL with parameters
    const params = new URLSearchParams({
      language: this.config.language,
      model: this.config.model,
      punctuate: String(this.config.punctuate),
      interim_results: String(this.config.interim_results),
      endpointing: String(this.config.endpointing),
      vad_events: String(this.config.vad_events),
      smart_format: String(this.config.smart_format),
      filler_words: String(this.config.filler_words),
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url, ['token', this.config.apiKey]);

        this.socket.onopen = () => {
          console.log('Deepgram WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.sessionStartTime = Date.now();
          this.onReady?.();
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.socket.onerror = (event) => {
          console.error('Deepgram WebSocket error:', event);
          const error = new Error('WebSocket connection error');
          this.onError?.(error);
          handleErrorCode(ErrorCodes.SPEECH_API_ERROR, {
            details: 'Deepgram WebSocket error',
          });
        };

        this.socket.onclose = (event) => {
          console.log('Deepgram WebSocket closed:', event.code, event.reason);
          this.isConnected = false;

          if (this.isListening && !event.wasClean) {
            this.attemptReconnect();
          }
        };

        // Timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            const error = new Error('Connection timeout');
            this.onError?.(error);
            reject(error);
          }
        }, 10000);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to connect');
        this.onError?.(err);
        handleErrorCode(ErrorCodes.SPEECH_SERVICE_UNAVAILABLE, {
          details: 'Failed to establish Deepgram connection',
        });
        reject(err);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const response: DeepgramResponse = JSON.parse(data);

      if (response.type === 'Results') {
        this.handleTranscriptionResult(response);
      } else if (response.type === 'SpeechStarted') {
        this.utteranceStartTime = Date.now();
        this.currentUtteranceText = '';
      } else if (response.type === 'UtteranceEnd') {
        // Final utterance boundary - emit final segment if we have text
        if (this.currentUtteranceText.trim()) {
          this.emitSegment(this.currentUtteranceText, true, 0.95);
          this.currentUtteranceText = '';
        }
      }
    } catch (error) {
      console.error('Failed to parse Deepgram response:', error);
    }
  }

  private handleTranscriptionResult(response: DeepgramResponse): void {
    const channel = response.channel;
    if (!channel || !channel.alternatives || channel.alternatives.length === 0) {
      return;
    }

    const alternative = channel.alternatives[0];
    const transcript = alternative.transcript;
    const confidence = alternative.confidence;

    if (!transcript) return;

    if (response.is_final) {
      // Final result for this audio chunk
      this.currentUtteranceText = transcript;

      if (response.speech_final) {
        // End of utterance - emit final segment
        this.emitSegment(transcript, true, confidence);
        this.currentUtteranceText = '';
      } else {
        // Chunk is final but utterance continues - emit interim
        this.emitSegment(transcript, false, confidence);
      }
    } else {
      // Interim result
      this.emitSegment(transcript, false, confidence);
    }
  }

  private emitSegment(text: string, isFinal: boolean, confidence: number): void {
    const now = Date.now();
    const startTime = this.utteranceStartTime || this.sessionStartTime;

    const segment: TranscriptionSegment = {
      id: `dg-segment-${this.segmentId}`,
      text: text.trim(),
      startTime,
      endTime: now,
      confidence,
      isFinal,
    };

    if (isFinal) {
      this.segmentId++;
      this.utteranceStartTime = 0;
    }

    this.onTranscription?.(segment);
  }

  sendAudio(audioData: ArrayBuffer | Int16Array): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(audioData);
    }
  }

  start(): void {
    this.isListening = true;
  }

  stop(): void {
    this.isListening = false;
  }

  disconnect(): void {
    this.isListening = false;
    this.isConnected = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      // Send close message
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'CloseStream' }));
      }
      this.socket.close();
      this.socket = null;
    }

    this.onTranscription = null;
    this.onError = null;
    this.onReady = null;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max Deepgram reconnection attempts reached');
      handleErrorCode(ErrorCodes.SPEECH_SERVICE_UNAVAILABLE, {
        details: 'Failed to reconnect to Deepgram after multiple attempts',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting Deepgram reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.establishConnection().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  setLanguage(language: string): void {
    this.config.language = language;
  }

  setModel(model: DeepgramConfig['model']): void {
    this.config.model = model;
  }
}

// Factory function
export function createDeepgramRecognizer(
  config?: Partial<DeepgramConfig>
): DeepgramRecognizer {
  return new DeepgramRecognizer(config);
}
