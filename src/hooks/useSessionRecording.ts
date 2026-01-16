'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  sessionRecorder,
  sessionPlayer,
  downloadRecording,
  importRecording,
  type SessionRecording,
  type SessionStats,
  type SessionEvent,
  type PlaybackCallbacks,
} from '@/lib/session';
import type { ASLSign, TranscriptionSegment } from '@/types';

// Recording hook
interface UseSessionRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  stats: SessionStats;
  eventCount: number;
  startRecording: (options?: {
    name?: string;
    eventName?: string;
    venue?: string;
  }) => void;
  stopRecording: () => SessionRecording | null;
  pauseRecording: () => void;
  resumeRecording: () => void;
  addMarker: (label: string, notes?: string) => void;
  downloadSession: (filename?: string) => void;
}

export function useSessionRecording(): UseSessionRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stats, setStats] = useState<SessionStats>({
    totalWords: 0,
    totalSigns: 0,
    totalErrors: 0,
    averageLatency: 0,
    peakLatency: 0,
    transcriptionCount: 0,
  });
  const [eventCount, setEventCount] = useState(0);

  const recordingRef = useRef<SessionRecording | null>(null);

  // Update duration while recording
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      setDuration(sessionRecorder.getDuration());
      setStats(sessionRecorder.getStats());
      setEventCount(sessionRecorder.getEventCount());
    }, 500);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const startRecording = useCallback(
    (options?: { name?: string; eventName?: string; venue?: string }) => {
      sessionRecorder.start(options);
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
    },
    []
  );

  const stopRecording = useCallback(() => {
    const recording = sessionRecorder.stop();
    recordingRef.current = recording;
    setIsRecording(false);
    setIsPaused(false);
    return recording;
  }, []);

  const pauseRecording = useCallback(() => {
    sessionRecorder.pause();
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    sessionRecorder.resume();
    setIsPaused(false);
  }, []);

  const addMarker = useCallback((label: string, notes?: string) => {
    sessionRecorder.addMarker(label, undefined, notes);
  }, []);

  const downloadSession = useCallback((filename?: string) => {
    const recording = recordingRef.current || sessionRecorder.getRecording();
    if (recording) {
      downloadRecording(recording, filename);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    stats,
    eventCount,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    addMarker,
    downloadSession,
  };
}

// Playback hook
interface UseSessionPlaybackReturn {
  isPlaying: boolean;
  isPaused: boolean;
  isEnded: boolean;
  currentTime: number;
  totalTime: number;
  progress: number;
  speed: number;
  markers: Array<{ label: string; timestamp: number; notes?: string }>;
  loadRecording: (recording: SessionRecording) => void;
  loadFromFile: (file: File) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (timeMs: number) => void;
  seekToMarker: (label: string) => boolean;
  setSpeed: (speed: number) => void;
}

export function useSessionPlayback(callbacks?: PlaybackCallbacks): UseSessionPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [markers, setMarkers] = useState<Array<{ label: string; timestamp: number; notes?: string }>>([]);

  // Setup callbacks
  useEffect(() => {
    sessionPlayer.setCallbacks({
      ...callbacks,
      onStateChange: (state) => {
        setIsPlaying(state === 'playing');
        setIsPaused(state === 'paused');
        setIsEnded(state === 'ended');
        callbacks?.onStateChange?.(state);
      },
      onProgress: (current, total, prog) => {
        setCurrentTime(current);
        setTotalTime(total);
        setProgress(prog);
        callbacks?.onProgress?.(current, total, prog);
      },
    });
  }, [callbacks]);

  const loadRecording = useCallback((recording: SessionRecording) => {
    sessionPlayer.load(recording);
    setTotalTime(recording.metadata.duration || 0);
    setMarkers(sessionPlayer.getMarkers());
    setCurrentTime(0);
    setProgress(0);
    setIsEnded(false);
  }, []);

  const loadFromFile = useCallback(async (file: File) => {
    const text = await file.text();
    const recording = importRecording(text);
    loadRecording(recording);
  }, [loadRecording]);

  const play = useCallback(() => {
    sessionPlayer.play();
  }, []);

  const pause = useCallback(() => {
    sessionPlayer.pause();
  }, []);

  const stop = useCallback(() => {
    sessionPlayer.stop();
    setCurrentTime(0);
    setProgress(0);
  }, []);

  const seek = useCallback((timeMs: number) => {
    sessionPlayer.seek(timeMs);
  }, []);

  const seekToMarker = useCallback((label: string) => {
    return sessionPlayer.seekToMarker(label);
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    sessionPlayer.setSpeed(newSpeed);
    setSpeedState(newSpeed);
  }, []);

  return {
    isPlaying,
    isPaused,
    isEnded,
    currentTime,
    totalTime,
    progress,
    speed,
    markers,
    loadRecording,
    loadFromFile,
    play,
    pause,
    stop,
    seek,
    seekToMarker,
    setSpeed,
  };
}
