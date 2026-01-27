"use client";

import type { TranscriptionSegment } from "@/types";

export interface AldeaConfig {
  apiKey: string;
  language: string;
  timestamps: boolean;
  diarization: boolean;
}

const defaultConfig: AldeaConfig = {
  apiKey: "",
  language: "en-US",
  timestamps: true,
  diarization: false,
};

export type AldeaTranscriptionCallback = (
  segment: TranscriptionSegment,
) => void;
export type AldeaErrorCallback = (error: Error) => void;
export type AldeaReadyCallback = () => void;

interface AldeaWord {
  word: string;
  start: number;
  end: number;
}

interface AldeaAlternative {
  transcript: string;
  confidence: number;
  words?: AldeaWord[];
}

interface AldeaChannel {
  alternatives: AldeaAlternative[];
}

interface AldeaResponse {
  type?: string;
  metadata?: {
    request_id: string;
    created: string;
    duration: number;
    channels: number;
  };
  results?: {
    channels: AldeaChannel[];
  };
  // Streaming response fields (Deepgram-compatible)
  channel_index?: [number, number];
  duration?: number;
  start?: number;
  is_final?: boolean;
  speech_final?: boolean;
  channel?: AldeaChannel;
}

export class AldeaRecognizer {
  private config: AldeaConfig;
  private socket: WebSocket | null = null;
  private isConnected = false;
  private isListening = false;
  private segmentId = 0;
  private sessionStartTime = 0;

  private onTranscription: AldeaTranscriptionCallback | null = null;
  private onError: AldeaErrorCallback | null = null;
  private onReady: AldeaReadyCallback | null = null;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private currentUtteranceText = "";
  private utteranceStartTime = 0;

  constructor(config: Partial<AldeaConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async connect(
    onTranscription: AldeaTranscriptionCallback,
    onError?: AldeaErrorCallback,
    onReady?: AldeaReadyCallback,
  ): Promise<void> {
    if (!this.config.apiKey) {
      const error = new Error("Aldea API key is required");
      onError?.(error);
      throw error;
    }

    this.onTranscription = onTranscription;
    this.onError = onError || null;
    this.onReady = onReady || null;

    return this.establishConnection();
  }

  private async establishConnection(): Promise<void> {
    // Aldea WebSocket endpoint (Deepgram-compatible)
    const params = new URLSearchParams({
      language: this.config.language,
      punctuate: "true",
      interim_results: "true",
      endpointing: "300",
      encoding: "linear16",
      sample_rate: "16000",
      channels: "1",
    });

    // Try WebSocket endpoint
    const url = `wss://api.aldea.ai/v1/listen?${params.toString()}`;

    return new Promise((resolve, reject) => {
      try {
        // Aldea uses Bearer token in protocol (Deepgram-compatible)
        this.socket = new WebSocket(url, ["token", this.config.apiKey]);

        this.socket.onopen = () => {
          console.log("[Aldea] WebSocket connected");
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
          console.error("[Aldea] WebSocket error:", event);
          const error = new Error("Aldea WebSocket connection error");
          this.onError?.(error);
        };

        this.socket.onclose = (event) => {
          console.log("[Aldea] WebSocket closed:", event.code, event.reason);
          this.isConnected = false;

          if (this.isListening && !event.wasClean) {
            this.attemptReconnect();
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            const error = new Error("Aldea connection timeout");
            this.onError?.(error);
            reject(error);
          }
        }, 10000);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("Failed to connect to Aldea");
        this.onError?.(err);
        reject(err);
      }
    });
  }

  private handleMessage(data: string): void {
    try {
      const response: AldeaResponse = JSON.parse(data);

      // Handle Deepgram-compatible streaming format
      if (response.type === "Results" || response.channel) {
        this.handleTranscriptionResult(response);
      } else if (response.type === "SpeechStarted") {
        this.utteranceStartTime = Date.now();
        this.currentUtteranceText = "";
      } else if (response.type === "UtteranceEnd") {
        if (this.currentUtteranceText.trim()) {
          this.emitSegment(this.currentUtteranceText, true, 0.95);
          this.currentUtteranceText = "";
        }
      } else if (response.results) {
        // Handle REST-style response format (for pre-recorded)
        this.handleBatchResult(response);
      }
    } catch (error) {
      console.error("[Aldea] Failed to parse response:", error);
    }
  }

  private handleTranscriptionResult(response: AldeaResponse): void {
    const channel = response.channel;
    if (
      !channel ||
      !channel.alternatives ||
      channel.alternatives.length === 0
    ) {
      return;
    }

    const alternative = channel.alternatives[0];
    const transcript = alternative.transcript;
    const confidence = alternative.confidence;

    if (!transcript) return;

    if (response.is_final) {
      this.currentUtteranceText = transcript;

      if (response.speech_final) {
        this.emitSegment(transcript, true, confidence);
        this.currentUtteranceText = "";
      } else {
        this.emitSegment(transcript, false, confidence);
      }
    } else {
      this.emitSegment(transcript, false, confidence);
    }
  }

  private handleBatchResult(response: AldeaResponse): void {
    if (!response.results?.channels?.[0]?.alternatives?.[0]) return;

    const alternative = response.results.channels[0].alternatives[0];
    const transcript = alternative.transcript;
    const confidence = alternative.confidence;

    if (transcript) {
      this.emitSegment(transcript, true, confidence);
    }
  }

  private emitSegment(
    text: string,
    isFinal: boolean,
    confidence: number,
  ): void {
    const now = Date.now();
    const startTime = this.utteranceStartTime || this.sessionStartTime;

    const segment: TranscriptionSegment = {
      id: `aldea-segment-${this.segmentId}`,
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
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "CloseStream" }));
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
      console.error("[Aldea] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[Aldea] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.establishConnection().catch((error) => {
        console.error("[Aldea] Reconnection failed:", error);
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
}

export function createAldeaRecognizer(
  config?: Partial<AldeaConfig>,
): AldeaRecognizer {
  return new AldeaRecognizer(config);
}
