/**
 * Session recording and playback for SignMate
 * Records all pipeline events for review, archive, or replay
 */

import type { ASLSign, TranscriptionSegment } from '@/types';

// Event types that can be recorded
export type SessionEventType =
  | 'session_start'
  | 'session_end'
  | 'transcription'
  | 'translation'
  | 'sign_start'
  | 'sign_end'
  | 'error'
  | 'status_change'
  | 'config_change'
  | 'marker';

// Base event structure
export interface SessionEvent {
  id: string;
  type: SessionEventType;
  timestamp: number; // ms since session start
  data: unknown;
}

// Typed event data
export interface TranscriptionEvent extends SessionEvent {
  type: 'transcription';
  data: {
    segment: TranscriptionSegment;
    latency: number;
  };
}

export interface TranslationEvent extends SessionEvent {
  type: 'translation';
  data: {
    sourceText: string;
    signs: ASLSign[];
    unmappedWords: string[];
    latency: number;
  };
}

export interface SignEvent extends SessionEvent {
  type: 'sign_start' | 'sign_end';
  data: {
    sign: ASLSign;
    index: number;
  };
}

export interface ErrorEvent extends SessionEvent {
  type: 'error';
  data: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface MarkerEvent extends SessionEvent {
  type: 'marker';
  data: {
    label: string;
    color?: string;
    notes?: string;
  };
}

// Session metadata
export interface SessionMetadata {
  id: string;
  name: string;
  eventName?: string;
  venue?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  language: string;
  version: string;
  stats: SessionStats;
}

export interface SessionStats {
  totalWords: number;
  totalSigns: number;
  totalErrors: number;
  averageLatency: number;
  peakLatency: number;
  transcriptionCount: number;
}

// Full session recording
export interface SessionRecording {
  metadata: SessionMetadata;
  events: SessionEvent[];
}

// Recorder state
type RecorderState = 'idle' | 'recording' | 'paused';

// Event callbacks
export type EventCallback = (event: SessionEvent) => void;

class SessionRecorder {
  private state: RecorderState = 'idle';
  private events: SessionEvent[] = [];
  private metadata: SessionMetadata | null = null;
  private startTime: number = 0;
  private eventId: number = 0;
  private callbacks: Set<EventCallback> = new Set();

  // Stats tracking
  private stats: SessionStats = {
    totalWords: 0,
    totalSigns: 0,
    totalErrors: 0,
    averageLatency: 0,
    peakLatency: 0,
    transcriptionCount: 0,
  };
  private latencySum: number = 0;

  start(options: {
    name?: string;
    eventName?: string;
    venue?: string;
    language?: string;
  } = {}): void {
    if (this.state === 'recording') {
      console.warn('Recording already in progress');
      return;
    }

    this.events = [];
    this.eventId = 0;
    this.startTime = Date.now();
    this.resetStats();

    this.metadata = {
      id: `session-${this.startTime}-${Math.random().toString(36).substr(2, 9)}`,
      name: options.name || `Session ${new Date().toLocaleString()}`,
      eventName: options.eventName,
      venue: options.venue,
      startTime: this.startTime,
      language: options.language || 'en-US',
      version: '1.0.0',
      stats: this.stats,
    };

    this.state = 'recording';

    this.recordEvent({
      type: 'session_start',
      data: { metadata: this.metadata },
    });
  }

  stop(): SessionRecording | null {
    if (this.state === 'idle') {
      console.warn('No recording in progress');
      return null;
    }

    const endTime = Date.now();

    this.recordEvent({
      type: 'session_end',
      data: { reason: 'manual_stop' },
    });

    if (this.metadata) {
      this.metadata.endTime = endTime;
      this.metadata.duration = endTime - this.startTime;
      this.metadata.stats = { ...this.stats };
    }

    this.state = 'idle';

    return this.getRecording();
  }

  pause(): void {
    if (this.state === 'recording') {
      this.state = 'paused';
      this.recordEvent({
        type: 'status_change',
        data: { status: 'paused' },
      });
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'recording';
      this.recordEvent({
        type: 'status_change',
        data: { status: 'resumed' },
      });
    }
  }

  // Record different event types
  recordTranscription(segment: TranscriptionSegment, latency: number): void {
    if (this.state !== 'recording') return;

    this.recordEvent({
      type: 'transcription',
      data: { segment, latency },
    });

    // Update stats
    this.stats.transcriptionCount++;
    if (segment.isFinal) {
      const wordCount = segment.text.trim().split(/\s+/).length;
      this.stats.totalWords += wordCount;
    }
    this.updateLatencyStats(latency);
  }

  recordTranslation(
    sourceText: string,
    signs: ASLSign[],
    unmappedWords: string[],
    latency: number
  ): void {
    if (this.state !== 'recording') return;

    this.recordEvent({
      type: 'translation',
      data: { sourceText, signs, unmappedWords, latency },
    });

    this.stats.totalSigns += signs.length;
    this.updateLatencyStats(latency);
  }

  recordSignStart(sign: ASLSign, index: number): void {
    if (this.state !== 'recording') return;

    this.recordEvent({
      type: 'sign_start',
      data: { sign, index },
    });
  }

  recordSignEnd(sign: ASLSign, index: number): void {
    if (this.state !== 'recording') return;

    this.recordEvent({
      type: 'sign_end',
      data: { sign, index },
    });
  }

  recordError(code: string, message: string, details?: string): void {
    if (this.state !== 'recording') return;

    this.recordEvent({
      type: 'error',
      data: { code, message, details },
    });

    this.stats.totalErrors++;
  }

  addMarker(label: string, color?: string, notes?: string): void {
    if (this.state !== 'recording') return;

    this.recordEvent({
      type: 'marker',
      data: { label, color, notes },
    });
  }

  // Internal event recording
  private recordEvent(event: Omit<SessionEvent, 'id' | 'timestamp'>): void {
    const fullEvent: SessionEvent = {
      ...event,
      id: `event-${this.eventId++}`,
      timestamp: Date.now() - this.startTime,
    };

    this.events.push(fullEvent);
    this.notifyCallbacks(fullEvent);
  }

  private updateLatencyStats(latency: number): void {
    this.latencySum += latency;
    const count = this.stats.transcriptionCount + this.stats.totalSigns;
    this.stats.averageLatency = Math.round(this.latencySum / Math.max(count, 1));
    this.stats.peakLatency = Math.max(this.stats.peakLatency, latency);
  }

  private resetStats(): void {
    this.stats = {
      totalWords: 0,
      totalSigns: 0,
      totalErrors: 0,
      averageLatency: 0,
      peakLatency: 0,
      transcriptionCount: 0,
    };
    this.latencySum = 0;
  }

  // Subscribe to events
  subscribe(callback: EventCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifyCallbacks(event: SessionEvent): void {
    this.callbacks.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        console.error('Event callback error:', e);
      }
    });
  }

  // Getters
  getState(): RecorderState {
    return this.state;
  }

  getRecording(): SessionRecording | null {
    if (!this.metadata) return null;

    return {
      metadata: { ...this.metadata, stats: { ...this.stats } },
      events: [...this.events],
    };
  }

  getStats(): SessionStats {
    return { ...this.stats };
  }

  getEventCount(): number {
    return this.events.length;
  }

  getDuration(): number {
    if (this.state === 'idle') {
      return this.metadata?.duration || 0;
    }
    return Date.now() - this.startTime;
  }
}

// Singleton instance
export const sessionRecorder = new SessionRecorder();

// Export/import utilities
export function exportRecording(recording: SessionRecording): string {
  return JSON.stringify(recording, null, 2);
}

export function importRecording(json: string): SessionRecording {
  return JSON.parse(json) as SessionRecording;
}

export function downloadRecording(recording: SessionRecording, filename?: string): void {
  const json = exportRecording(recording);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `signmate-session-${recording.metadata.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
