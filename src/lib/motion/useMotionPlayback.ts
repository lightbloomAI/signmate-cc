/**
 * React hook for SignMotion playback
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { SignMotion } from "./types";
import {
  type PlaybackState,
  type AvatarPose,
  createPlaybackState,
  startPlayback,
  stopPlayback,
  updatePlayback,
  getPoseAtTime,
  getFramePose,
} from "./playback";

export interface UseMotionPlaybackResult {
  // State
  isPlaying: boolean;
  currentFrame: number;
  currentPose: AvatarPose | null;
  progress: number; // 0-1

  // Controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (frame: number) => void;
  setSpeed: (speed: number) => void;

  // Load motion
  loadMotion: (motion: SignMotion) => void;
  motion: SignMotion | null;
}

export function useMotionPlayback(): UseMotionPlaybackResult {
  const [motion, setMotion] = useState<SignMotion | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentPose, setCurrentPose] = useState<AvatarPose | null>(null);
  const [speed, setSpeedState] = useState(1.0);

  const playbackStateRef = useRef<PlaybackState | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Animation loop
  const animate = useCallback(() => {
    if (!playbackStateRef.current || !playbackStateRef.current.isPlaying) {
      return;
    }

    const timestamp = performance.now();
    const { state, frame, finished } = updatePlayback(
      playbackStateRef.current,
      timestamp,
    );

    playbackStateRef.current = state;
    setCurrentFrame(frame);

    // Get interpolated pose
    const elapsed = (timestamp - state.startTime) * state.playbackSpeed;
    const pose = getPoseAtTime(state.motion, elapsed);
    setCurrentPose(pose);

    if (finished) {
      setIsPlaying(false);
    } else {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const loadMotion = useCallback(
    (newMotion: SignMotion) => {
      setMotion(newMotion);
      playbackStateRef.current = createPlaybackState(newMotion, speed);
      setCurrentFrame(0);
      setCurrentPose(getFramePose(newMotion, 0));
      setIsPlaying(false);
    },
    [speed],
  );

  const play = useCallback(() => {
    if (!playbackStateRef.current || !motion) return;

    playbackStateRef.current = startPlayback(
      playbackStateRef.current,
      performance.now(),
    );
    setIsPlaying(true);
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [motion, animate]);

  const pause = useCallback(() => {
    if (!playbackStateRef.current) return;

    playbackStateRef.current = stopPlayback(playbackStateRef.current);
    setIsPlaying(false);
    cancelAnimationFrame(animationFrameRef.current);
  }, []);

  const stop = useCallback(() => {
    if (!playbackStateRef.current || !motion) return;

    cancelAnimationFrame(animationFrameRef.current);
    playbackStateRef.current = createPlaybackState(motion, speed);
    setCurrentFrame(0);
    setCurrentPose(getFramePose(motion, 0));
    setIsPlaying(false);
  }, [motion, speed]);

  const seek = useCallback(
    (frame: number) => {
      if (!playbackStateRef.current || !motion) return;

      const clampedFrame = Math.max(0, Math.min(frame, motion.frameCount - 1));
      playbackStateRef.current.currentFrame = clampedFrame;
      setCurrentFrame(clampedFrame);
      setCurrentPose(getFramePose(motion, clampedFrame));
    },
    [motion],
  );

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    if (playbackStateRef.current) {
      playbackStateRef.current.playbackSpeed = newSpeed;
    }
  }, []);

  const progress = motion
    ? currentFrame / Math.max(1, motion.frameCount - 1)
    : 0;

  return {
    isPlaying,
    currentFrame,
    currentPose,
    progress,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    loadMotion,
    motion,
  };
}
