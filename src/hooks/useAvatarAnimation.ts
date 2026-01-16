'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSignMateStore } from '@/store';
import type { ASLSign, AvatarState } from '@/types';

interface UseAvatarAnimationOptions {
  onSignStart?: (sign: ASLSign) => void;
  onSignComplete?: (sign: ASLSign) => void;
  onQueueEmpty?: () => void;
}

interface UseAvatarAnimationReturn {
  currentSign: ASLSign | undefined;
  isAnimating: boolean;
  queueLength: number;
  progress: number;
  completeCurrentSign: () => void;
  queueSigns: (signs: ASLSign[]) => void;
  clearQueue: () => void;
  pause: () => void;
  resume: () => void;
  isPaused: boolean;
}

export function useAvatarAnimation(
  options: UseAvatarAnimationOptions = {}
): UseAvatarAnimationReturn {
  const { onSignStart, onSignComplete, onQueueEmpty } = options;

  const { avatarState, setAvatarState } = useSignMateStore();
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const animationStartRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const previousSignRef = useRef<ASLSign | undefined>(undefined);

  // Track sign changes for callbacks
  useEffect(() => {
    if (avatarState.currentSign && avatarState.currentSign !== previousSignRef.current) {
      onSignStart?.(avatarState.currentSign);
      animationStartRef.current = performance.now();
      setProgress(0);
    }
    previousSignRef.current = avatarState.currentSign;
  }, [avatarState.currentSign, onSignStart]);

  // Animation loop for progress tracking
  useEffect(() => {
    if (!avatarState.isAnimating || !avatarState.currentSign || isPaused) {
      return;
    }

    const duration = avatarState.currentSign.duration;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - animationStartRef.current;
      const newProgress = Math.min(elapsed / duration, 1);
      setProgress(newProgress);

      if (newProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [avatarState.isAnimating, avatarState.currentSign, isPaused]);

  const completeCurrentSign = useCallback(() => {
    const { currentSign, queue } = avatarState;

    if (currentSign) {
      onSignComplete?.(currentSign);
    }

    if (queue.length > 0) {
      const nextSign = queue[0];
      setAvatarState({
        currentSign: nextSign,
        queue: queue.slice(1),
        isAnimating: true,
      });
      animationStartRef.current = performance.now();
      setProgress(0);
    } else {
      setAvatarState({
        currentSign: undefined,
        queue: [],
        isAnimating: false,
      });
      setProgress(0);
      onQueueEmpty?.();
    }
  }, [avatarState, setAvatarState, onSignComplete, onQueueEmpty]);

  const queueSigns = useCallback(
    (signs: ASLSign[]) => {
      if (signs.length === 0) return;

      const { currentSign, queue, isAnimating } = avatarState;

      if (!isAnimating || !currentSign) {
        // Start immediately with first sign
        setAvatarState({
          currentSign: signs[0],
          queue: [...queue, ...signs.slice(1)],
          isAnimating: true,
        });
        animationStartRef.current = performance.now();
        setProgress(0);
      } else {
        // Add to existing queue
        setAvatarState({
          queue: [...queue, ...signs],
        });
      }
    },
    [avatarState, setAvatarState]
  );

  const clearQueue = useCallback(() => {
    setAvatarState({
      currentSign: undefined,
      queue: [],
      isAnimating: false,
    });
    setProgress(0);
  }, [setAvatarState]);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    setIsPaused(false);
    animationStartRef.current = performance.now() - progress * (avatarState.currentSign?.duration || 0);
  }, [progress, avatarState.currentSign]);

  return {
    currentSign: avatarState.currentSign,
    isAnimating: avatarState.isAnimating && !isPaused,
    queueLength: avatarState.queue.length,
    progress,
    completeCurrentSign,
    queueSigns,
    clearQueue,
    pause,
    resume,
    isPaused,
  };
}
