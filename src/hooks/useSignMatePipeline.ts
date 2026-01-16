'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SignMatePipeline, type PipelineConfig } from '@/lib/pipeline';
import { useSignMateStore } from '@/store';
import type { AudioSource, TranscriptionSegment, ASLTranslation, PipelineStatus } from '@/types';

interface UseSignMatePipelineOptions {
  config?: Partial<PipelineConfig>;
  autoProcessQueue?: boolean;
}

interface UseSignMatePipelineReturn {
  isRunning: boolean;
  latency: number;
  status: PipelineStatus;
  currentTranscription: TranscriptionSegment | null;
  recentTranscriptions: TranscriptionSegment[];
  start: (audioSource: AudioSource) => Promise<void>;
  stop: () => Promise<void>;
  error: Error | null;
}

export function useSignMatePipeline(
  options: UseSignMatePipelineOptions = {}
): UseSignMatePipelineReturn {
  const { config, autoProcessQueue = true } = options;

  const pipelineRef = useRef<SignMatePipeline | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [latency, setLatency] = useState(0);
  const [status, setStatus] = useState<PipelineStatus>({
    audioCapture: 'idle',
    speechRecognition: 'idle',
    aslTranslation: 'idle',
    avatarRendering: 'idle',
    latency: 0,
    errors: [],
  });
  const [currentTranscription, setCurrentTranscription] = useState<TranscriptionSegment | null>(null);
  const [recentTranscriptions, setRecentTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const {
    setAvatarState,
    avatarState,
    updatePipelineStatus,
    addTranscriptionSegment,
    addTranslation,
  } = useSignMateStore();

  // Process sign queue automatically
  useEffect(() => {
    if (!autoProcessQueue) return;

    const { queue, isAnimating, currentSign } = avatarState;

    if (!isAnimating && !currentSign && queue.length > 0) {
      setAvatarState({
        currentSign: queue[0],
        queue: queue.slice(1),
        isAnimating: true,
      });
    }
  }, [avatarState, setAvatarState, autoProcessQueue]);

  const start = useCallback(
    async (audioSource: AudioSource) => {
      setError(null);

      if (!pipelineRef.current) {
        pipelineRef.current = new SignMatePipeline(config);
      }

      try {
        await pipelineRef.current.start(audioSource, {
          onTranscription: (segment: TranscriptionSegment) => {
            setCurrentTranscription(segment);
            addTranscriptionSegment(segment);

            if (segment.isFinal) {
              setRecentTranscriptions((prev) => [...prev.slice(-20), segment]);
            }
          },
          onTranslation: (translation: ASLTranslation) => {
            addTranslation(translation);

            if (translation.signs.length > 0) {
              setAvatarState({
                currentSign: translation.signs[0],
                queue: translation.signs.slice(1),
                isAnimating: true,
              });
            }
          },
          onStatus: (newStatus: PipelineStatus) => {
            setStatus(newStatus);
            setLatency(newStatus.latency);
            updatePipelineStatus(newStatus);
          },
          onError: (err: Error) => {
            setError(err);
          },
        });

        setIsRunning(true);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [config, setAvatarState, updatePipelineStatus, addTranscriptionSegment, addTranslation]
  );

  const stop = useCallback(async () => {
    if (pipelineRef.current) {
      await pipelineRef.current.stop();
      setIsRunning(false);
      setCurrentTranscription(null);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pipelineRef.current?.stop();
    };
  }, []);

  return {
    isRunning,
    latency,
    status,
    currentTranscription,
    recentTranscriptions,
    start,
    stop,
    error,
  };
}
