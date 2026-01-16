'use client';

import type { TranscriptionSegment } from '@/types';
import { SpeechRecognizer, type SpeechRecognizerConfig } from './recognizer';
import {
  DeepgramRecognizer,
  createDeepgramRecognizer,
  type DeepgramConfig,
} from './deepgramRecognizer';
import { AudioProcessor } from './audioProcessor';
import { handleErrorCode } from '@/lib/errors';
import { ErrorCodes } from '@/lib/errors/types';

export type SpeechProvider = 'browser' | 'deepgram';

export interface SpeechManagerConfig {
  provider: SpeechProvider;
  language: string;
  browserConfig?: Partial<SpeechRecognizerConfig>;
  deepgramConfig?: Partial<DeepgramConfig>;
}

const defaultConfig: SpeechManagerConfig = {
  provider: 'browser',
  language: 'en-US',
};

export type TranscriptionCallback = (segment: TranscriptionSegment) => void;
export type ErrorCallback = (error: Error) => void;
export type StatusCallback = (status: 'idle' | 'connecting' | 'listening' | 'error') => void;

export class SpeechManager {
  private config: SpeechManagerConfig;
  private browserRecognizer: SpeechRecognizer | null = null;
  private deepgramRecognizer: DeepgramRecognizer | null = null;
  private audioProcessor: AudioProcessor | null = null;

  private onTranscription: TranscriptionCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onStatus: StatusCallback | null = null;

  private currentStatus: 'idle' | 'connecting' | 'listening' | 'error' = 'idle';
  private mediaStream: MediaStream | null = null;

  constructor(config: Partial<SpeechManagerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async start(
    onTranscription: TranscriptionCallback,
    onError?: ErrorCallback,
    onStatus?: StatusCallback
  ): Promise<void> {
    this.onTranscription = onTranscription;
    this.onError = onError || null;
    this.onStatus = onStatus || null;

    this.setStatus('connecting');

    try {
      if (this.config.provider === 'deepgram') {
        await this.startDeepgram();
      } else {
        await this.startBrowser();
      }
      this.setStatus('listening');
    } catch (error) {
      this.setStatus('error');
      const err = error instanceof Error ? error : new Error('Failed to start speech recognition');
      this.onError?.(err);
      throw err;
    }
  }

  private async startBrowser(): Promise<void> {
    this.browserRecognizer = new SpeechRecognizer({
      language: this.config.language,
      ...this.config.browserConfig,
    });

    this.browserRecognizer.start(
      (segment) => this.handleTranscription(segment),
      (error) => this.handleError(error)
    );
  }

  private async startDeepgram(): Promise<void> {
    // Validate API key
    if (!this.config.deepgramConfig?.apiKey) {
      throw new Error('Deepgram API key is required');
    }

    // Get microphone access
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      handleErrorCode(ErrorCodes.AUDIO_PERMISSION_DENIED);
      throw error;
    }

    // Create Deepgram recognizer
    this.deepgramRecognizer = createDeepgramRecognizer({
      language: this.config.language,
      ...this.config.deepgramConfig,
    });

    // Connect to Deepgram
    await this.deepgramRecognizer.connect(
      (segment) => this.handleTranscription(segment),
      (error) => this.handleError(error),
      () => {
        // Ready - start audio processing
        this.deepgramRecognizer?.start();
        this.startAudioProcessing();
      }
    );
  }

  private async startAudioProcessing(): Promise<void> {
    if (!this.mediaStream || !this.deepgramRecognizer) {
      return;
    }

    this.audioProcessor = new AudioProcessor({
      targetSampleRate: 16000,
      bufferSize: 4096,
    });

    await this.audioProcessor.start(this.mediaStream, (audioData) => {
      this.deepgramRecognizer?.sendAudio(audioData);
    });
  }

  private handleTranscription(segment: TranscriptionSegment): void {
    this.onTranscription?.(segment);
  }

  private handleError(error: Error): void {
    console.error('Speech recognition error:', error);
    this.onError?.(error);

    // Try to recover
    if (this.currentStatus === 'listening') {
      this.setStatus('error');
      // Could implement auto-recovery here
    }
  }

  private setStatus(status: 'idle' | 'connecting' | 'listening' | 'error'): void {
    this.currentStatus = status;
    this.onStatus?.(status);
  }

  async stop(): Promise<void> {
    this.setStatus('idle');

    // Stop browser recognizer
    if (this.browserRecognizer) {
      this.browserRecognizer.stop();
      this.browserRecognizer = null;
    }

    // Stop audio processor
    if (this.audioProcessor) {
      await this.audioProcessor.stop();
      this.audioProcessor = null;
    }

    // Stop Deepgram
    if (this.deepgramRecognizer) {
      this.deepgramRecognizer.disconnect();
      this.deepgramRecognizer = null;
    }

    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.onTranscription = null;
    this.onError = null;
    this.onStatus = null;
  }

  async switchProvider(provider: SpeechProvider): Promise<void> {
    const wasListening = this.currentStatus === 'listening';
    const savedCallbacks = {
      onTranscription: this.onTranscription,
      onError: this.onError,
      onStatus: this.onStatus,
    };

    await this.stop();
    this.config.provider = provider;

    if (wasListening && savedCallbacks.onTranscription) {
      await this.start(
        savedCallbacks.onTranscription,
        savedCallbacks.onError || undefined,
        savedCallbacks.onStatus || undefined
      );
    }
  }

  setLanguage(language: string): void {
    this.config.language = language;

    if (this.browserRecognizer) {
      this.browserRecognizer.setLanguage(language);
    }

    if (this.deepgramRecognizer) {
      this.deepgramRecognizer.setLanguage(language);
    }
  }

  setDeepgramApiKey(apiKey: string): void {
    if (!this.config.deepgramConfig) {
      this.config.deepgramConfig = {};
    }
    this.config.deepgramConfig.apiKey = apiKey;

    if (this.deepgramRecognizer) {
      this.deepgramRecognizer.setApiKey(apiKey);
    }
  }

  getStatus(): 'idle' | 'connecting' | 'listening' | 'error' {
    return this.currentStatus;
  }

  getProvider(): SpeechProvider {
    return this.config.provider;
  }

  isAvailable(provider: SpeechProvider): boolean {
    if (provider === 'browser') {
      const win = window as unknown as {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      };
      return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
    }

    if (provider === 'deepgram') {
      return !!this.config.deepgramConfig?.apiKey;
    }

    return false;
  }
}

// Singleton instance
let speechManagerInstance: SpeechManager | null = null;

export function getSpeechManager(config?: Partial<SpeechManagerConfig>): SpeechManager {
  if (!speechManagerInstance) {
    speechManagerInstance = new SpeechManager(config);
  }
  return speechManagerInstance;
}

export function createSpeechManager(config?: Partial<SpeechManagerConfig>): SpeechManager {
  return new SpeechManager(config);
}
