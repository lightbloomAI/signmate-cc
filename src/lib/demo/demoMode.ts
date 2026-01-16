/**
 * Demo Mode for SignMate
 * Simulates the full interpretation pipeline with pre-recorded content
 */

import type { ASLSign } from '@/types';
import { getSignByGloss } from '@/lib/asl/glossary';

// Demo script entry
export interface DemoScriptEntry {
  text: string;
  startTime: number; // ms from demo start
  duration: number; // how long to display
}

// Pre-built demo scripts
export interface DemoScript {
  id: string;
  name: string;
  description: string;
  duration: number; // total duration in ms
  entries: DemoScriptEntry[];
}

// Demo event callbacks
export interface DemoCallbacks {
  onTranscription?: (text: string, isFinal: boolean) => void;
  onTranslation?: (signs: ASLSign[], sourceText: string) => void;
  onProgress?: (currentTime: number, totalTime: number, progress: number) => void;
  onStateChange?: (state: DemoState) => void;
  onComplete?: () => void;
}

type DemoState = 'idle' | 'playing' | 'paused' | 'complete';

// Demo content library
const DEMO_SCRIPTS: DemoScript[] = [
  {
    id: 'welcome',
    name: 'Welcome Demo',
    description: 'A friendly welcome message demonstrating basic greetings',
    duration: 15000,
    entries: [
      { text: 'Hello everyone', startTime: 0, duration: 2000 },
      { text: 'Welcome to SignMate', startTime: 2500, duration: 2500 },
      { text: 'Thank you for being here today', startTime: 5500, duration: 3000 },
      { text: 'This is a demonstration', startTime: 9000, duration: 2500 },
      { text: 'of our sign language interpreter', startTime: 12000, duration: 3000 },
    ],
  },
  {
    id: 'presentation',
    name: 'Conference Presentation',
    description: 'Simulates a typical conference presentation scenario',
    duration: 30000,
    entries: [
      { text: 'Good morning', startTime: 0, duration: 1500 },
      { text: 'Today I want to talk about accessibility', startTime: 2000, duration: 3000 },
      { text: 'We believe everyone deserves equal access', startTime: 5500, duration: 3000 },
      { text: 'to information and communication', startTime: 9000, duration: 2500 },
      { text: 'SignMate helps bridge that gap', startTime: 12000, duration: 2500 },
      { text: 'by providing real-time sign language interpretation', startTime: 15000, duration: 3500 },
      { text: 'Let me show you how it works', startTime: 19000, duration: 2500 },
      { text: 'The system listens to speech', startTime: 22000, duration: 2000 },
      { text: 'and translates it to ASL in real time', startTime: 24500, duration: 3000 },
      { text: 'Thank you for your attention', startTime: 28000, duration: 2000 },
    ],
  },
  {
    id: 'questions',
    name: 'Q&A Session',
    description: 'Demonstrates question-and-answer format',
    duration: 20000,
    entries: [
      { text: 'Any questions?', startTime: 0, duration: 1500 },
      { text: 'What is the latency?', startTime: 2500, duration: 2000 },
      { text: 'Our system processes speech', startTime: 5000, duration: 2000 },
      { text: 'in under 500 milliseconds', startTime: 7500, duration: 2000 },
      { text: 'How accurate is the translation?', startTime: 10500, duration: 2500 },
      { text: 'We support over 500 common signs', startTime: 13500, duration: 2500 },
      { text: 'with continuous expansion', startTime: 16500, duration: 2000 },
      { text: 'Thank you', startTime: 19000, duration: 1000 },
    ],
  },
  {
    id: 'quick',
    name: 'Quick Demo',
    description: 'Short demonstration for quick showcases',
    duration: 8000,
    entries: [
      { text: 'Hello', startTime: 0, duration: 1500 },
      { text: 'This is SignMate', startTime: 2000, duration: 2000 },
      { text: 'Real-time sign language', startTime: 4500, duration: 2000 },
      { text: 'Thank you', startTime: 7000, duration: 1000 },
    ],
  },
];

// Simple word to sign mapping for demo
function translateToSigns(text: string): ASLSign[] {
  const words = text.toUpperCase().replace(/[^A-Z\s]/g, '').split(/\s+/);
  const signs: ASLSign[] = [];

  for (const word of words) {
    const entry = getSignByGloss(word);
    if (entry) {
      signs.push({
        gloss: entry.gloss,
        duration: entry.duration,
        handshape: entry.handshape,
        location: entry.location,
        movement: entry.movement,
        nonManualMarkers: entry.nonManualMarkers,
      });
    }
  }

  return signs;
}

class DemoMode {
  private state: DemoState = 'idle';
  private currentScript: DemoScript | null = null;
  private currentTime: number = 0;
  private entryIndex: number = 0;
  private callbacks: DemoCallbacks = {};
  private animationFrame: number | null = null;
  private lastFrameTime: number = 0;
  private playbackSpeed: number = 1;

  getAvailableScripts(): DemoScript[] {
    return DEMO_SCRIPTS.map((script) => ({
      ...script,
      entries: [], // Don't expose entries in listing
    }));
  }

  getScript(id: string): DemoScript | undefined {
    return DEMO_SCRIPTS.find((s) => s.id === id);
  }

  setCallbacks(callbacks: DemoCallbacks): void {
    this.callbacks = callbacks;
  }

  load(scriptId: string): boolean {
    const script = DEMO_SCRIPTS.find((s) => s.id === scriptId);
    if (!script) {
      console.error(`Demo script not found: ${scriptId}`);
      return false;
    }

    this.currentScript = script;
    this.reset();
    this.notifyState('idle');
    return true;
  }

  play(): void {
    if (!this.currentScript) {
      console.warn('No demo script loaded');
      return;
    }

    if (this.state === 'complete') {
      this.reset();
    }

    this.state = 'playing';
    this.lastFrameTime = performance.now();
    this.notifyState('playing');
    this.tick();
  }

  pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.notifyState('paused');

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }
  }

  stop(): void {
    this.state = 'idle';
    this.reset();
    this.notifyState('idle');

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  seek(timeMs: number): void {
    if (!this.currentScript) return;

    this.currentTime = Math.max(0, Math.min(timeMs, this.currentScript.duration));

    // Find entry index for new time
    this.entryIndex = this.currentScript.entries.findIndex(
      (entry) => entry.startTime > this.currentTime
    );

    if (this.entryIndex === -1) {
      this.entryIndex = this.currentScript.entries.length;
    }

    this.notifyProgress();
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.5, Math.min(2, speed));
  }

  private tick(): void {
    if (this.state !== 'playing' || !this.currentScript) return;

    const now = performance.now();
    const deltaMs = (now - this.lastFrameTime) * this.playbackSpeed;
    this.lastFrameTime = now;

    this.currentTime += deltaMs;

    // Process entries up to current time
    while (this.entryIndex < this.currentScript.entries.length) {
      const entry = this.currentScript.entries[this.entryIndex];

      if (entry.startTime > this.currentTime) {
        break;
      }

      this.processEntry(entry);
      this.entryIndex++;
    }

    this.notifyProgress();

    // Check if demo is complete
    if (this.currentTime >= this.currentScript.duration) {
      this.state = 'complete';
      this.notifyState('complete');
      this.callbacks.onComplete?.();
      return;
    }

    this.animationFrame = requestAnimationFrame(() => this.tick());
  }

  private processEntry(entry: DemoScriptEntry): void {
    // Simulate partial transcription then final
    const words = entry.text.split(' ');

    // Send partial transcription (first few words)
    if (words.length > 2) {
      const partial = words.slice(0, Math.ceil(words.length / 2)).join(' ');
      this.callbacks.onTranscription?.(partial, false);
    }

    // Send final transcription after a short delay
    setTimeout(() => {
      this.callbacks.onTranscription?.(entry.text, true);

      // Translate and send signs
      const signs = translateToSigns(entry.text);
      if (signs.length > 0) {
        this.callbacks.onTranslation?.(signs, entry.text);
      }
    }, 200);
  }

  private notifyProgress(): void {
    if (!this.currentScript) return;

    const progress = Math.min(this.currentTime / this.currentScript.duration, 1);
    this.callbacks.onProgress?.(this.currentTime, this.currentScript.duration, progress);
  }

  private notifyState(newState: DemoState): void {
    this.callbacks.onStateChange?.(newState);
  }

  private reset(): void {
    this.currentTime = 0;
    this.entryIndex = 0;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Getters
  getState(): DemoState {
    return this.state;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.currentScript?.duration || 0;
  }

  getProgress(): number {
    const duration = this.getDuration();
    return duration > 0 ? this.currentTime / duration : 0;
  }

  getSpeed(): number {
    return this.playbackSpeed;
  }

  getCurrentScript(): DemoScript | null {
    return this.currentScript;
  }

  isPlaying(): boolean {
    return this.state === 'playing';
  }
}

// Singleton instance
export const demoMode = new DemoMode();

// Create custom demo script
export function createCustomScript(
  name: string,
  entries: { text: string; delay?: number }[]
): DemoScript {
  let currentTime = 0;
  const scriptEntries: DemoScriptEntry[] = [];

  for (const entry of entries) {
    const delay = entry.delay || 0;
    currentTime += delay;

    // Estimate duration based on text length (150ms per word + 500ms buffer)
    const wordCount = entry.text.split(' ').length;
    const duration = wordCount * 150 + 500;

    scriptEntries.push({
      text: entry.text,
      startTime: currentTime,
      duration,
    });

    currentTime += duration;
  }

  return {
    id: `custom-${Date.now()}`,
    name,
    description: 'Custom demo script',
    duration: currentTime,
    entries: scriptEntries,
  };
}

// Export available scripts for UI
export function getAvailableScripts(): Omit<DemoScript, 'entries'>[] {
  return DEMO_SCRIPTS.map(({ id, name, description, duration }) => ({
    id,
    name,
    description,
    duration,
  }));
}
