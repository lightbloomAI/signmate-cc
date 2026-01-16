/**
 * Session playback for recorded SignMate sessions
 */

import type { ASLSign, TranscriptionSegment } from '@/types';
import type {
  SessionRecording,
  SessionEvent,
  TranscriptionEvent,
  TranslationEvent,
  SignEvent,
} from './recorder';

// Playback state
type PlayerState = 'idle' | 'playing' | 'paused' | 'ended';

// Playback callbacks
export interface PlaybackCallbacks {
  onTranscription?: (segment: TranscriptionSegment) => void;
  onTranslation?: (signs: ASLSign[], sourceText: string) => void;
  onSignStart?: (sign: ASLSign, index: number) => void;
  onSignEnd?: (sign: ASLSign, index: number) => void;
  onMarker?: (label: string, notes?: string) => void;
  onError?: (code: string, message: string) => void;
  onStateChange?: (state: PlayerState) => void;
  onProgress?: (currentTime: number, totalTime: number, progress: number) => void;
}

class SessionPlayer {
  private recording: SessionRecording | null = null;
  private state: PlayerState = 'idle';
  private currentTime: number = 0;
  private eventIndex: number = 0;
  private playbackSpeed: number = 1;
  private callbacks: PlaybackCallbacks = {};

  private animationFrame: number | null = null;
  private lastFrameTime: number = 0;

  load(recording: SessionRecording): void {
    this.recording = recording;
    this.reset();
    this.callbacks.onStateChange?.('idle');
  }

  setCallbacks(callbacks: PlaybackCallbacks): void {
    this.callbacks = callbacks;
  }

  play(): void {
    if (!this.recording) {
      console.warn('No recording loaded');
      return;
    }

    if (this.state === 'ended') {
      this.reset();
    }

    this.state = 'playing';
    this.lastFrameTime = performance.now();
    this.callbacks.onStateChange?.('playing');
    this.tick();
  }

  pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.callbacks.onStateChange?.('paused');

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }
  }

  stop(): void {
    this.state = 'idle';
    this.reset();
    this.callbacks.onStateChange?.('idle');

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  seek(timeMs: number): void {
    if (!this.recording) return;

    const duration = this.recording.metadata.duration || 0;
    this.currentTime = Math.max(0, Math.min(timeMs, duration));

    // Find event index for new time
    this.eventIndex = this.recording.events.findIndex(
      (event) => event.timestamp > this.currentTime
    );

    if (this.eventIndex === -1) {
      this.eventIndex = this.recording.events.length;
    }

    this.notifyProgress();
  }

  seekToMarker(markerLabel: string): boolean {
    if (!this.recording) return false;

    const markerEvent = this.recording.events.find(
      (event) =>
        event.type === 'marker' &&
        (event.data as { label: string }).label === markerLabel
    );

    if (markerEvent) {
      this.seek(markerEvent.timestamp);
      return true;
    }

    return false;
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4, speed));
  }

  private tick(): void {
    if (this.state !== 'playing' || !this.recording) return;

    const now = performance.now();
    const deltaMs = (now - this.lastFrameTime) * this.playbackSpeed;
    this.lastFrameTime = now;

    this.currentTime += deltaMs;

    // Process events up to current time
    while (this.eventIndex < this.recording.events.length) {
      const event = this.recording.events[this.eventIndex];

      if (event.timestamp > this.currentTime) {
        break;
      }

      this.processEvent(event);
      this.eventIndex++;
    }

    this.notifyProgress();

    // Check if playback is complete
    const duration = this.recording.metadata.duration || 0;
    if (this.currentTime >= duration) {
      this.state = 'ended';
      this.callbacks.onStateChange?.('ended');
      return;
    }

    this.animationFrame = requestAnimationFrame(() => this.tick());
  }

  private processEvent(event: SessionEvent): void {
    switch (event.type) {
      case 'transcription': {
        const data = (event as TranscriptionEvent).data;
        this.callbacks.onTranscription?.(data.segment);
        break;
      }

      case 'translation': {
        const data = (event as TranslationEvent).data;
        this.callbacks.onTranslation?.(data.signs, data.sourceText);
        break;
      }

      case 'sign_start': {
        const data = (event as SignEvent).data;
        this.callbacks.onSignStart?.(data.sign, data.index);
        break;
      }

      case 'sign_end': {
        const data = (event as SignEvent).data;
        this.callbacks.onSignEnd?.(data.sign, data.index);
        break;
      }

      case 'marker': {
        const data = event.data as { label: string; notes?: string };
        this.callbacks.onMarker?.(data.label, data.notes);
        break;
      }

      case 'error': {
        const data = event.data as { code: string; message: string };
        this.callbacks.onError?.(data.code, data.message);
        break;
      }
    }
  }

  private notifyProgress(): void {
    if (!this.recording) return;

    const duration = this.recording.metadata.duration || 1;
    const progress = Math.min(this.currentTime / duration, 1);

    this.callbacks.onProgress?.(this.currentTime, duration, progress);
  }

  private reset(): void {
    this.currentTime = 0;
    this.eventIndex = 0;
  }

  // Getters
  getState(): PlayerState {
    return this.state;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.recording?.metadata.duration || 0;
  }

  getProgress(): number {
    const duration = this.getDuration();
    return duration > 0 ? this.currentTime / duration : 0;
  }

  getSpeed(): number {
    return this.playbackSpeed;
  }

  getRecording(): SessionRecording | null {
    return this.recording;
  }

  getMarkers(): Array<{ label: string; timestamp: number; notes?: string }> {
    if (!this.recording) return [];

    return this.recording.events
      .filter((event) => event.type === 'marker')
      .map((event) => ({
        label: (event.data as { label: string; notes?: string }).label,
        timestamp: event.timestamp,
        notes: (event.data as { label: string; notes?: string }).notes,
      }));
  }
}

// Singleton instance
export const sessionPlayer = new SessionPlayer();

// Create independent player instance
export function createSessionPlayer(): SessionPlayer {
  return new SessionPlayer();
}
