'use client';

import type {
  AudioSource,
  TranscriptionSegment,
  ASLTranslation,
  ASLSign,
  PipelineStatus,
  PipelineError,
} from '@/types';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

/**
 * Real-Time Streaming Pipeline
 *
 * Orchestrates the complete SignMate real-time pipeline:
 * 1. Audio capture from various sources
 * 2. Speech-to-text (browser or Deepgram)
 * 3. Text to ASL translation
 * 4. Event emission for avatar rendering
 *
 * Features:
 * - State machine for pipeline lifecycle
 * - Adaptive latency management
 * - Error recovery and circuit breaker
 * - Performance metrics
 * - Event streaming for multiple displays
 */

// Pipeline States
export type PipelineState =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'streaming'
  | 'paused'
  | 'error'
  | 'recovering'
  | 'stopping';

// Pipeline events
export type PipelineEventType =
  | 'stateChange'
  | 'transcription'
  | 'translation'
  | 'signs'
  | 'status'
  | 'error'
  | 'metrics'
  | 'latencyWarning';

interface PipelineEventMap {
  stateChange: { from: PipelineState; to: PipelineState };
  transcription: TranscriptionSegment;
  translation: ASLTranslation;
  signs: { signs: ASLSign[]; text: string };
  status: PipelineStatus;
  error: { error: Error; stage: PipelineError['stage']; recoverable: boolean };
  metrics: PipelineMetrics;
  latencyWarning: { current: number; target: number };
}

type PipelineEventHandler<K extends PipelineEventType> = (data: PipelineEventMap[K]) => void;

// Configuration
export interface StreamingPipelineConfig {
  // Audio settings
  audioSource?: AudioSource;
  preferredSampleRate: number;
  audioBufferSize: number;

  // Speech recognition
  speechProvider: 'browser' | 'deepgram';
  deepgramApiKey?: string;
  language: string;
  interimResults: boolean;

  // Translation settings
  batchTranslation: boolean;
  batchDelay: number;
  maxBatchSize: number;

  // Performance targets
  targetLatency: number;
  maxLatency: number;
  adaptiveLatency: boolean;

  // Error handling
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;

  // Metrics
  enableMetrics: boolean;
  metricsInterval: number;
}

const DEFAULT_CONFIG: StreamingPipelineConfig = {
  preferredSampleRate: 16000,
  audioBufferSize: 4096,
  speechProvider: 'browser',
  language: 'en-US',
  interimResults: true,
  batchTranslation: true,
  batchDelay: 150,
  maxBatchSize: 10,
  targetLatency: 500,
  maxLatency: 2000,
  adaptiveLatency: true,
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000,
  enableMetrics: true,
  metricsInterval: 1000,
};

// Pipeline metrics
export interface PipelineMetrics {
  // Timing
  uptime: number;
  streamingDuration: number;

  // Audio
  audioSamplesProcessed: number;
  audioDroppedFrames: number;

  // Speech
  transcriptionsReceived: number;
  wordsTranscribed: number;
  averageTranscriptionLatency: number;

  // Translation
  translationsGenerated: number;
  signsGenerated: number;
  averageTranslationLatency: number;

  // Overall
  endToEndLatency: number;
  averageEndToEndLatency: number;
  minLatency: number;
  maxLatency: number;

  // Errors
  errorsCount: number;
  recoveriesCount: number;
  circuitBreakerTrips: number;
}

// Sign queue for smooth playback
interface SignQueue {
  signs: ASLSign[];
  text: string;
  timestamp: number;
  processed: boolean;
}

export class RealTimeStreamingPipeline {
  private config: StreamingPipelineConfig;
  private state: PipelineState = 'idle';
  private eventListeners: Map<PipelineEventType, Set<PipelineEventHandler<PipelineEventType>>> = new Map();

  // Components
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private speechRecognition: SpeechRecognition | null = null;

  // Batching
  private pendingText = '';
  private batchTimeout: NodeJS.Timeout | null = null;
  private signQueue: SignQueue[] = [];

  // Timing
  private startTime = 0;
  private streamStartTime = 0;
  private lastTranscriptionTime = 0;
  private latencyHistory: number[] = [];

  // Metrics
  private metrics: PipelineMetrics;
  private metricsTimer: NodeJS.Timeout | null = null;

  // Error handling
  private errorCount = 0;
  private lastErrorTime = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerTimer: NodeJS.Timeout | null = null;

  // Status
  private pipelineStatus: PipelineStatus = {
    audioCapture: 'idle',
    speechRecognition: 'idle',
    aslTranslation: 'idle',
    avatarRendering: 'idle',
    latency: 0,
    errors: [],
  };

  constructor(config: Partial<StreamingPipelineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = this.createInitialMetrics();
  }

  private createInitialMetrics(): PipelineMetrics {
    return {
      uptime: 0,
      streamingDuration: 0,
      audioSamplesProcessed: 0,
      audioDroppedFrames: 0,
      transcriptionsReceived: 0,
      wordsTranscribed: 0,
      averageTranscriptionLatency: 0,
      translationsGenerated: 0,
      signsGenerated: 0,
      averageTranslationLatency: 0,
      endToEndLatency: 0,
      averageEndToEndLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      errorsCount: 0,
      recoveriesCount: 0,
      circuitBreakerTrips: 0,
    };
  }

  // Event handling
  on<K extends PipelineEventType>(event: K, handler: PipelineEventHandler<K>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler as PipelineEventHandler<PipelineEventType>);
    return () => this.off(event, handler);
  }

  off<K extends PipelineEventType>(event: K, handler: PipelineEventHandler<K>): void {
    this.eventListeners.get(event)?.delete(handler as PipelineEventHandler<PipelineEventType>);
  }

  private emit<K extends PipelineEventType>(event: K, data: PipelineEventMap[K]): void {
    this.eventListeners.get(event)?.forEach(handler => {
      try {
        (handler as PipelineEventHandler<K>)(data);
      } catch (error) {
        console.error(`[Pipeline] Error in event handler for ${event}:`, error);
      }
    });
  }

  // State management
  private setState(newState: PipelineState): void {
    if (this.state !== newState) {
      const from = this.state;
      this.state = newState;
      this.emit('stateChange', { from, to: newState });
    }
  }

  getState(): PipelineState {
    return this.state;
  }

  getStatus(): PipelineStatus {
    return { ...this.pipelineStatus };
  }

  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  // Initialize pipeline
  async initialize(): Promise<void> {
    if (this.state !== 'idle') {
      console.warn('[Pipeline] Already initialized');
      return;
    }

    this.setState('initializing');
    this.startTime = Date.now();

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.config.preferredSampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Initialize speech recognition
      await this.initializeSpeechRecognition();

      // Start metrics collection
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }

      this.updateStatus({ audioCapture: 'active' });
      this.setState('ready');
    } catch (error) {
      this.handleError(error as Error, 'audio', true);
      throw error;
    }
  }

  private async initializeSpeechRecognition(): Promise<void> {
    if (this.config.speechProvider === 'browser') {
      await this.initializeBrowserSpeechRecognition();
    } else {
      // Deepgram would be initialized here
      // For now, fall back to browser
      await this.initializeBrowserSpeechRecognition();
    }
  }

  private async initializeBrowserSpeechRecognition(): Promise<void> {
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.speechRecognition = new SpeechRecognitionAPI();
    this.speechRecognition.continuous = true;
    this.speechRecognition.interimResults = this.config.interimResults;
    this.speechRecognition.lang = this.config.language;

    this.speechRecognition.onresult = (event: SpeechRecognitionEvent) => {
      this.handleSpeechResult(event);
    };

    this.speechRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.handleSpeechError(event);
    };

    this.speechRecognition.onend = () => {
      // Auto-restart if still streaming
      if (this.state === 'streaming' && !this.circuitBreakerOpen) {
        this.speechRecognition?.start();
      }
    };
  }

  // Start streaming
  async start(): Promise<void> {
    if (this.state === 'idle') {
      await this.initialize();
    }

    if (this.state !== 'ready' && this.state !== 'paused') {
      console.warn('[Pipeline] Cannot start - not ready');
      return;
    }

    this.setState('streaming');
    this.streamStartTime = Date.now();

    try {
      this.speechRecognition?.start();
      this.updateStatus({ speechRecognition: 'processing' });
    } catch (error) {
      this.handleError(error as Error, 'speech', true);
    }
  }

  // Pause streaming
  pause(): void {
    if (this.state !== 'streaming') return;

    this.setState('paused');
    this.speechRecognition?.stop();
    this.updateStatus({ speechRecognition: 'idle' });
  }

  // Resume streaming
  resume(): void {
    if (this.state !== 'paused') return;
    this.start();
  }

  // Stop streaming completely
  async stop(): Promise<void> {
    if (this.state === 'idle' || this.state === 'stopping') return;

    this.setState('stopping');

    // Stop speech recognition
    if (this.speechRecognition) {
      this.speechRecognition.stop();
      this.speechRecognition = null;
    }

    // Stop audio
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Clear timers
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    if (this.circuitBreakerTimer) {
      clearTimeout(this.circuitBreakerTimer);
      this.circuitBreakerTimer = null;
    }

    // Reset state
    this.pendingText = '';
    this.signQueue = [];
    this.latencyHistory = [];

    this.updateStatus({
      audioCapture: 'idle',
      speechRecognition: 'idle',
      aslTranslation: 'idle',
    });

    this.setState('idle');
  }

  // Handle speech recognition results
  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    const now = Date.now();
    const result = event.results[event.resultIndex];
    const transcript = result[0].transcript;
    const isFinal = result.isFinal;
    const confidence = result[0].confidence || 0.9;

    // Calculate latency from speech to transcription
    const transcriptionLatency = now - this.lastTranscriptionTime;
    if (this.lastTranscriptionTime > 0 && transcriptionLatency < 5000) {
      this.latencyHistory.push(transcriptionLatency);
      if (this.latencyHistory.length > 100) {
        this.latencyHistory.shift();
      }
    }
    this.lastTranscriptionTime = now;

    // Update metrics
    this.metrics.transcriptionsReceived++;
    this.metrics.wordsTranscribed += transcript.split(/\s+/).length;

    // Create transcription segment
    const segment: TranscriptionSegment = {
      id: `seg-${now}-${event.resultIndex}`,
      text: transcript,
      startTime: now - 100,
      endTime: now,
      confidence,
      isFinal,
    };

    this.emit('transcription', segment);

    // Handle translation
    if (isFinal && transcript.trim()) {
      this.addToBatch(transcript);
    }
  }

  private handleSpeechError(event: SpeechRecognitionErrorEvent): void {
    const error = new Error(`Speech recognition error: ${event.error}`);

    // Some errors are recoverable
    const recoverable = ['no-speech', 'aborted', 'audio-capture'].includes(event.error);

    this.handleError(error, 'speech', recoverable);
  }

  // Batch translation handling
  private addToBatch(text: string): void {
    this.pendingText += (this.pendingText ? ' ' : '') + text.trim();

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Check batch size
    const words = this.pendingText.split(/\s+/);
    if (words.length >= this.config.maxBatchSize) {
      this.processBatch();
      return;
    }

    // Set timeout for smaller batches
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.config.batchDelay);
  }

  private async processBatch(): Promise<void> {
    if (!this.pendingText.trim()) return;

    const textToTranslate = this.pendingText.trim();
    this.pendingText = '';

    this.updateStatus({ aslTranslation: 'processing' });

    const translationStart = Date.now();

    try {
      // Translate text to ASL signs
      const signs = this.translateToSigns(textToTranslate);

      const translationEnd = Date.now();
      const translationLatency = translationEnd - translationStart;

      // Update metrics
      this.metrics.translationsGenerated++;
      this.metrics.signsGenerated += signs.length;
      this.metrics.averageTranslationLatency =
        (this.metrics.averageTranslationLatency * (this.metrics.translationsGenerated - 1) + translationLatency) /
        this.metrics.translationsGenerated;

      // Calculate end-to-end latency
      const e2eLatency = translationEnd - this.lastTranscriptionTime + translationLatency;
      this.updateLatencyMetrics(e2eLatency);

      // Create translation object
      const translation: ASLTranslation = {
        id: `trans-${Date.now()}`,
        sourceText: textToTranslate,
        signs,
        timestamp: Date.now(),
      };

      this.emit('translation', translation);
      this.emit('signs', { signs, text: textToTranslate });

      // Add to queue for playback
      this.signQueue.push({
        signs,
        text: textToTranslate,
        timestamp: Date.now(),
        processed: false,
      });

      this.updateStatus({ aslTranslation: 'idle', latency: e2eLatency });
    } catch (error) {
      this.handleError(error as Error, 'translation', true);
    }
  }

  // Basic text to ASL sign translation
  private translateToSigns(text: string): ASLSign[] {
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const signs: ASLSign[] = [];

    for (const word of words) {
      // Clean the word
      const cleanWord = word.replace(/[^a-z'-]/g, '');
      if (!cleanWord) continue;

      signs.push({
        gloss: cleanWord.toUpperCase(),
        duration: Math.max(300, cleanWord.length * 50),
        handshape: { dominant: 'open', nonDominant: 'open' },
        location: { x: 0, y: 0, z: 0.3, reference: 'neutral' },
        movement: {
          type: cleanWord.length > 5 ? 'linear' : 'static',
          speed: 'normal',
        },
        nonManualMarkers: [],
      });
    }

    return signs;
  }

  // Latency management
  private updateLatencyMetrics(latency: number): void {
    this.metrics.endToEndLatency = latency;

    // Update running average
    const count = this.metrics.translationsGenerated;
    this.metrics.averageEndToEndLatency =
      (this.metrics.averageEndToEndLatency * (count - 1) + latency) / count;

    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);

    this.pipelineStatus.latency = latency;

    // Check for latency warning
    if (this.config.adaptiveLatency && latency > this.config.targetLatency) {
      this.emit('latencyWarning', {
        current: latency,
        target: this.config.targetLatency,
      });

      // Adaptive behavior: reduce batch delay if latency is high
      if (latency > this.config.maxLatency && this.config.batchDelay > 50) {
        this.config.batchDelay = Math.max(50, this.config.batchDelay * 0.8);
      }
    }
  }

  // Error handling
  private handleError(error: Error, stage: PipelineError['stage'], recoverable: boolean): void {
    console.error(`[Pipeline] Error in ${stage}:`, error);

    const pipelineError: PipelineError = {
      stage,
      message: error.message,
      timestamp: Date.now(),
    };

    this.pipelineStatus.errors.push(pipelineError);
    if (this.pipelineStatus.errors.length > 10) {
      this.pipelineStatus.errors.shift();
    }

    this.metrics.errorsCount++;
    this.emit('error', { error, stage, recoverable });
    this.emit('status', this.pipelineStatus);

    // Circuit breaker logic
    this.errorCount++;
    const now = Date.now();

    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.config.circuitBreakerTimeout) {
      this.errorCount = 1;
    }
    this.lastErrorTime = now;

    // Trip circuit breaker
    if (this.errorCount >= this.config.circuitBreakerThreshold) {
      this.tripCircuitBreaker();
      return;
    }

    // Attempt recovery
    if (recoverable && this.state === 'streaming') {
      this.attemptRecovery(stage);
    }
  }

  private tripCircuitBreaker(): void {
    console.warn('[Pipeline] Circuit breaker tripped');
    this.circuitBreakerOpen = true;
    this.metrics.circuitBreakerTrips++;
    this.setState('error');

    // Reset after timeout
    this.circuitBreakerTimer = setTimeout(() => {
      this.circuitBreakerOpen = false;
      this.errorCount = 0;
      console.log('[Pipeline] Circuit breaker reset');

      // Attempt to recover
      if (this.state === 'error') {
        this.attemptRecovery('speech');
      }
    }, this.config.circuitBreakerTimeout);
  }

  private async attemptRecovery(stage: PipelineError['stage']): Promise<void> {
    if (this.circuitBreakerOpen) return;

    this.setState('recovering');
    this.metrics.recoveriesCount++;

    try {
      if (stage === 'speech') {
        // Reinitialize speech recognition
        await this.initializeSpeechRecognition();
        if (this.state === 'recovering') {
          this.setState('streaming');
          this.speechRecognition?.start();
        }
      }
    } catch (error) {
      console.error('[Pipeline] Recovery failed:', error);
      this.handleError(error as Error, stage, false);
    }
  }

  // Metrics collection
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.metrics.uptime = Date.now() - this.startTime;

      if (this.state === 'streaming') {
        this.metrics.streamingDuration = Date.now() - this.streamStartTime;
      }

      this.emit('metrics', this.metrics);
    }, this.config.metricsInterval);
  }

  // Status updates
  private updateStatus(updates: Partial<PipelineStatus>): void {
    this.pipelineStatus = { ...this.pipelineStatus, ...updates };
    this.emit('status', this.pipelineStatus);
  }

  // Configuration updates
  updateConfig(updates: Partial<StreamingPipelineConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  setLanguage(language: string): void {
    this.config.language = language;
    if (this.speechRecognition) {
      this.speechRecognition.lang = language;
    }
  }

  // Sign queue access
  getSignQueue(): SignQueue[] {
    return [...this.signQueue];
  }

  clearSignQueue(): void {
    this.signQueue = [];
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.eventListeners.clear();
  }
}

// Factory function
export function createStreamingPipeline(
  config?: Partial<StreamingPipelineConfig>
): RealTimeStreamingPipeline {
  return new RealTimeStreamingPipeline(config);
}

// Singleton instance
let pipelineInstance: RealTimeStreamingPipeline | null = null;

export function getStreamingPipeline(
  config?: Partial<StreamingPipelineConfig>
): RealTimeStreamingPipeline {
  if (!pipelineInstance) {
    pipelineInstance = createStreamingPipeline(config);
  }
  return pipelineInstance;
}
