'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RealTimeStreamingPipeline,
  createStreamingPipeline,
  type PipelineState,
  type StreamingPipelineConfig,
  type PipelineMetrics,
} from '@/lib/pipeline/streamingPipeline';
import type { TranscriptionSegment, ASLTranslation, ASLSign, PipelineStatus, PipelineError } from '@/types';

/**
 * useStreamingPipeline Hook
 *
 * React hook for managing the real-time streaming pipeline
 */

export interface UseStreamingPipelineOptions {
  config?: Partial<StreamingPipelineConfig>;
  autoInitialize?: boolean;
  onTranscription?: (segment: TranscriptionSegment) => void;
  onTranslation?: (translation: ASLTranslation) => void;
  onSigns?: (signs: ASLSign[], text: string) => void;
  onError?: (error: Error, stage: PipelineError['stage'], recoverable: boolean) => void;
  onStateChange?: (from: PipelineState, to: PipelineState) => void;
  onLatencyWarning?: (current: number, target: number) => void;
}

export interface UseStreamingPipelineReturn {
  // State
  state: PipelineState;
  status: PipelineStatus;
  metrics: PipelineMetrics | null;
  isStreaming: boolean;
  isInitialized: boolean;
  isPaused: boolean;
  hasError: boolean;

  // Data
  currentTranscript: string;
  interimTranscript: string;
  currentSigns: ASLSign[];
  latency: number;
  errors: PipelineError[];

  // Controls
  initialize: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  setLanguage: (language: string) => void;
  updateConfig: (updates: Partial<StreamingPipelineConfig>) => void;

  // Pipeline access
  pipeline: RealTimeStreamingPipeline | null;
}

export function useStreamingPipeline(
  options: UseStreamingPipelineOptions = {}
): UseStreamingPipelineReturn {
  const {
    config,
    autoInitialize = false,
    onTranscription,
    onTranslation,
    onSigns,
    onError,
    onStateChange,
    onLatencyWarning,
  } = options;

  const pipelineRef = useRef<RealTimeStreamingPipeline | null>(null);

  // State
  const [state, setState] = useState<PipelineState>('idle');
  const [status, setStatus] = useState<PipelineStatus>({
    audioCapture: 'idle',
    speechRecognition: 'idle',
    aslTranslation: 'idle',
    avatarRendering: 'idle',
    latency: 0,
    errors: [],
  });
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentSigns, setCurrentSigns] = useState<ASLSign[]>([]);
  const [errors, setErrors] = useState<PipelineError[]>([]);

  // Derived state
  const isStreaming = state === 'streaming';
  const isInitialized = state !== 'idle' && state !== 'initializing';
  const isPaused = state === 'paused';
  const hasError = state === 'error' || errors.length > 0;
  const latency = status.latency;

  // Initialize pipeline
  useEffect(() => {
    const pipeline = createStreamingPipeline(config);
    pipelineRef.current = pipeline;

    // Set up event listeners
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      pipeline.on('stateChange', ({ from, to }) => {
        setState(to);
        onStateChange?.(from, to);
      })
    );

    unsubscribers.push(
      pipeline.on('status', (newStatus) => {
        setStatus(newStatus);
        setErrors(newStatus.errors);
      })
    );

    unsubscribers.push(
      pipeline.on('metrics', (newMetrics) => {
        setMetrics(newMetrics);
      })
    );

    unsubscribers.push(
      pipeline.on('transcription', (segment) => {
        if (segment.isFinal) {
          setCurrentTranscript(prev => (prev ? prev + ' ' : '') + segment.text);
          setInterimTranscript('');
        } else {
          setInterimTranscript(segment.text);
        }
        onTranscription?.(segment);
      })
    );

    unsubscribers.push(
      pipeline.on('translation', (translation) => {
        onTranslation?.(translation);
      })
    );

    unsubscribers.push(
      pipeline.on('signs', ({ signs, text }) => {
        setCurrentSigns(signs);
        onSigns?.(signs, text);
      })
    );

    unsubscribers.push(
      pipeline.on('error', ({ error, stage, recoverable }) => {
        onError?.(error, stage, recoverable);
      })
    );

    unsubscribers.push(
      pipeline.on('latencyWarning', ({ current, target }) => {
        onLatencyWarning?.(current, target);
      })
    );

    // Auto-initialize if requested
    if (autoInitialize) {
      pipeline.initialize().catch(console.error);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
      pipeline.destroy();
      pipelineRef.current = null;
    };
  }, []); // Only run once on mount

  // Control functions
  const initialize = useCallback(async () => {
    if (!pipelineRef.current) return;
    await pipelineRef.current.initialize();
  }, []);

  const start = useCallback(async () => {
    if (!pipelineRef.current) return;
    setCurrentTranscript('');
    setInterimTranscript('');
    setCurrentSigns([]);
    setErrors([]);
    await pipelineRef.current.start();
  }, []);

  const stop = useCallback(async () => {
    if (!pipelineRef.current) return;
    await pipelineRef.current.stop();
  }, []);

  const pause = useCallback(() => {
    pipelineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    pipelineRef.current?.resume();
  }, []);

  const setLanguage = useCallback((language: string) => {
    pipelineRef.current?.setLanguage(language);
  }, []);

  const updateConfig = useCallback((updates: Partial<StreamingPipelineConfig>) => {
    pipelineRef.current?.updateConfig(updates);
  }, []);

  return {
    // State
    state,
    status,
    metrics,
    isStreaming,
    isInitialized,
    isPaused,
    hasError,

    // Data
    currentTranscript,
    interimTranscript,
    currentSigns,
    latency,
    errors,

    // Controls
    initialize,
    start,
    stop,
    pause,
    resume,
    setLanguage,
    updateConfig,

    // Pipeline access
    pipeline: pipelineRef.current,
  };
}

/**
 * Simplified hook for just getting transcription
 */
export function useTranscription(options?: { language?: string }) {
  const { language = 'en-US' } = options || {};

  const {
    state,
    currentTranscript,
    interimTranscript,
    latency,
    start,
    stop,
    isStreaming,
    setLanguage,
  } = useStreamingPipeline({
    config: { language },
  });

  useEffect(() => {
    setLanguage(language);
  }, [language, setLanguage]);

  return {
    transcript: currentTranscript,
    interimTranscript,
    isListening: isStreaming,
    latency,
    state,
    start,
    stop,
  };
}

/**
 * Hook for pipeline metrics monitoring
 */
export function usePipelineMetrics() {
  const { metrics, status, state } = useStreamingPipeline();

  return {
    metrics,
    status,
    state,
    isHealthy: state !== 'error' && (metrics?.errorsCount || 0) < 5,
    latency: metrics?.endToEndLatency || 0,
    averageLatency: metrics?.averageEndToEndLatency || 0,
    transcriptionsCount: metrics?.transcriptionsReceived || 0,
    translationsCount: metrics?.translationsGenerated || 0,
    signsGenerated: metrics?.signsGenerated || 0,
    errorsCount: metrics?.errorsCount || 0,
    uptime: metrics?.uptime || 0,
    streamingDuration: metrics?.streamingDuration || 0,
  };
}
