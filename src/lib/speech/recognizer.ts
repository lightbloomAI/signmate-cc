import type { TranscriptionSegment } from '@/types';

// Web Speech API type declarations
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionEventType {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventType {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventType) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventType) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

export interface SpeechRecognizerConfig {
  language: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
}

const defaultConfig: SpeechRecognizerConfig = {
  language: 'en-US',
  interimResults: true,
  continuous: true,
  maxAlternatives: 1,
};

export type TranscriptionCallback = (segment: TranscriptionSegment) => void;
export type ErrorCallback = (error: Error) => void;

export class SpeechRecognizer {
  private config: SpeechRecognizerConfig;
  private recognition: SpeechRecognitionInstance | null = null;
  private isListening = false;
  private segmentId = 0;
  private onTranscription: TranscriptionCallback | null = null;
  private onError: ErrorCallback | null = null;
  private startTime = 0;

  constructor(config: Partial<SpeechRecognizerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  start(
    onTranscription: TranscriptionCallback,
    onError?: ErrorCallback
  ): void {
    if (this.isListening) {
      this.stop();
    }

    const SpeechRecognitionAPI = (
      window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    ).SpeechRecognition || (
      window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }
    ).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      const error = new Error('Speech recognition not supported in this browser');
      onError?.(error);
      throw error;
    }

    this.onTranscription = onTranscription;
    this.onError = onError || null;
    this.recognition = new SpeechRecognitionAPI();
    this.startTime = Date.now();

    this.recognition.lang = this.config.language;
    this.recognition.interimResults = this.config.interimResults;
    this.recognition.continuous = this.config.continuous;
    this.recognition.maxAlternatives = this.config.maxAlternatives;

    this.recognition.onresult = this.handleResult.bind(this);
    this.recognition.onerror = this.handleError.bind(this);
    this.recognition.onend = this.handleEnd.bind(this);

    this.recognition.start();
    this.isListening = true;
  }

  private handleResult(event: SpeechRecognitionEventType): void {
    const now = Date.now();

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      const segment: TranscriptionSegment = {
        id: `segment-${this.segmentId}`,
        text: transcript,
        startTime: this.startTime,
        endTime: now,
        confidence: confidence || 0.9,
        isFinal,
      };

      if (isFinal) {
        this.segmentId++;
        this.startTime = now;
      }

      this.onTranscription?.(segment);
    }
  }

  private handleError(event: SpeechRecognitionErrorEventType): void {
    const error = new Error(`Speech recognition error: ${event.error}`);
    this.onError?.(error);

    // Auto-restart on recoverable errors
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      if (this.isListening && this.recognition) {
        setTimeout(() => {
          this.recognition?.start();
        }, 100);
      }
    }
  }

  private handleEnd(): void {
    // Auto-restart if we should still be listening
    if (this.isListening && this.recognition) {
      setTimeout(() => {
        try {
          this.recognition?.start();
        } catch {
          // Recognition already started
        }
      }, 100);
    }
  }

  stop(): void {
    this.isListening = false;
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.onTranscription = null;
    this.onError = null;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }
}

// Singleton instance
let speechRecognizerInstance: SpeechRecognizer | null = null;

export function getSpeechRecognizer(
  config?: Partial<SpeechRecognizerConfig>
): SpeechRecognizer {
  if (!speechRecognizerInstance) {
    speechRecognizerInstance = new SpeechRecognizer(config);
  }
  return speechRecognizerInstance;
}
