import type { AudioSource, TranscriptionSegment, ASLTranslation, PipelineStatus } from '@/types';
import { AudioCapture, getAudioCapture } from '@/lib/audio';
import { SpeechRecognizer, getSpeechRecognizer, DeepgramSpeechRecognizer } from '@/lib/speech';
import { ASLTranslator, getASLTranslator } from '@/lib/asl';

export interface PipelineConfig {
  useDeepgram: boolean;
  deepgramApiKey?: string;
  targetLatency: number; // Target end-to-end latency in ms
  batchTranslation: boolean; // Batch words before translating
  batchDelay: number; // How long to wait before batching (ms)
}

const defaultConfig: PipelineConfig = {
  useDeepgram: false,
  targetLatency: 500,
  batchTranslation: true,
  batchDelay: 150, // Small delay to batch words
};

export type TranscriptionHandler = (segment: TranscriptionSegment) => void;
export type TranslationHandler = (translation: ASLTranslation) => void;
export type StatusHandler = (status: PipelineStatus) => void;
export type ErrorHandler = (error: Error) => void;

export class SignMatePipeline {
  private config: PipelineConfig;
  private audioCapture: AudioCapture;
  private speechRecognizer: SpeechRecognizer | null = null;
  private deepgramRecognizer: DeepgramSpeechRecognizer | null = null;
  private aslTranslator: ASLTranslator;

  private onTranscription: TranscriptionHandler | null = null;
  private onTranslation: TranslationHandler | null = null;
  private onStatus: StatusHandler | null = null;
  private onError: ErrorHandler | null = null;

  private isRunning = false;
  private pipelineStartTime = 0;
  private lastTranscriptionTime = 0;
  private pendingText = '';
  private batchTimeout: NodeJS.Timeout | null = null;

  private status: PipelineStatus = {
    audioCapture: 'idle',
    speechRecognition: 'idle',
    aslTranslation: 'idle',
    avatarRendering: 'idle',
    latency: 0,
    errors: [],
  };

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.audioCapture = getAudioCapture();
    this.aslTranslator = getASLTranslator();
  }

  async start(
    audioSource: AudioSource,
    handlers: {
      onTranscription?: TranscriptionHandler;
      onTranslation?: TranslationHandler;
      onStatus?: StatusHandler;
      onError?: ErrorHandler;
    }
  ): Promise<void> {
    if (this.isRunning) {
      await this.stop();
    }

    this.onTranscription = handlers.onTranscription || null;
    this.onTranslation = handlers.onTranslation || null;
    this.onStatus = handlers.onStatus || null;
    this.onError = handlers.onError || null;

    this.pipelineStartTime = Date.now();
    this.isRunning = true;

    try {
      // Initialize speech recognition
      if (this.config.useDeepgram && this.config.deepgramApiKey) {
        await this.initDeepgramPipeline(audioSource);
      } else {
        await this.initWebSpeechPipeline();
      }

      this.updateStatus({ audioCapture: 'active', speechRecognition: 'processing' });
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async initWebSpeechPipeline(): Promise<void> {
    this.speechRecognizer = getSpeechRecognizer({
      interimResults: true,
      continuous: true,
    });

    this.speechRecognizer.start(
      (segment) => this.handleTranscription(segment),
      (error) => this.handleError(error)
    );
  }

  private async initDeepgramPipeline(audioSource: AudioSource): Promise<void> {
    this.deepgramRecognizer = new DeepgramSpeechRecognizer({
      apiKey: this.config.deepgramApiKey!,
      interimResults: true,
      endpointing: 300,
    });

    await this.deepgramRecognizer.connect(
      (segment) => this.handleTranscription(segment),
      (error) => this.handleError(error)
    );

    // Start audio capture and pipe to Deepgram
    await this.audioCapture.startCapture(audioSource, (audioData) => {
      this.deepgramRecognizer?.sendAudio(audioData);
    });
  }

  private handleTranscription(segment: TranscriptionSegment): void {
    this.lastTranscriptionTime = Date.now();
    this.onTranscription?.(segment);

    // Handle translation batching
    if (segment.isFinal) {
      this.pendingText += ' ' + segment.text;

      if (this.config.batchTranslation) {
        // Clear existing timeout
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
        }

        // Set new timeout for batched translation
        this.batchTimeout = setTimeout(() => {
          this.translatePendingText();
        }, this.config.batchDelay);
      } else {
        this.translatePendingText();
      }
    }
  }

  private async translatePendingText(): Promise<void> {
    if (!this.pendingText.trim()) {
      return;
    }

    const textToTranslate = this.pendingText.trim();
    this.pendingText = '';

    this.updateStatus({ aslTranslation: 'processing' });

    try {
      const translationStart = Date.now();
      const translation = await this.aslTranslator.translate(textToTranslate);
      const translationEnd = Date.now();

      // Calculate end-to-end latency
      const latency = translationEnd - this.lastTranscriptionTime;
      this.updateStatus({
        aslTranslation: 'idle',
        latency,
      });

      this.onTranslation?.(translation);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleError(error: Error): void {
    const pipelineError = {
      stage: 'speech' as const,
      message: error.message,
      timestamp: Date.now(),
    };

    this.status.errors.push(pipelineError);
    this.onStatus?.(this.status);
    this.onError?.(error);
  }

  private updateStatus(updates: Partial<PipelineStatus>): void {
    this.status = { ...this.status, ...updates };
    this.onStatus?.(this.status);
  }

  async stop(): Promise<void> {
    this.isRunning = false;

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.speechRecognizer) {
      this.speechRecognizer.stop();
      this.speechRecognizer = null;
    }

    if (this.deepgramRecognizer) {
      this.deepgramRecognizer.disconnect();
      this.deepgramRecognizer = null;
    }

    await this.audioCapture.stopCapture();

    this.updateStatus({
      audioCapture: 'idle',
      speechRecognition: 'idle',
      aslTranslation: 'idle',
    });
  }

  getStatus(): PipelineStatus {
    return { ...this.status };
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getCurrentLatency(): number {
    return this.status.latency;
  }
}

// Singleton instance
let pipelineInstance: SignMatePipeline | null = null;

export function getSignMatePipeline(config?: Partial<PipelineConfig>): SignMatePipeline {
  if (!pipelineInstance) {
    pipelineInstance = new SignMatePipeline(config);
  }
  return pipelineInstance;
}
