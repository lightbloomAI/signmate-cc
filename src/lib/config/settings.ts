/**
 * SignMate configuration and settings management
 */

import type { AvatarConfig, DisplayConfig, AudioSourceType } from '@/types';

// Main settings interface
export interface SignMateSettings {
  // General
  general: GeneralSettings;

  // Audio
  audio: AudioSettings;

  // Speech recognition
  speech: SpeechSettings;

  // Translation
  translation: TranslationSettings;

  // Avatar
  avatar: AvatarSettings;

  // Display
  display: DisplaySettings;

  // Performance
  performance: PerformanceSettings;

  // Accessibility
  accessibility: AccessibilitySettings;
}

export interface GeneralSettings {
  eventName: string;
  venue: string;
  operatorName: string;
  autoStart: boolean;
  sessionRecording: boolean;
  showWelcomeScreen: boolean;
}

export interface AudioSettings {
  defaultSource: AudioSourceType;
  microphoneDeviceId: string;
  avSystemEnabled: boolean;
  streamUrl: string;
  noiseReduction: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  inputVolume: number; // 0-100
}

export interface SpeechSettings {
  provider: 'browser' | 'deepgram';
  language: string;
  deepgramApiKey: string;
  deepgramModel: 'nova-2' | 'nova' | 'enhanced' | 'base';
  interimResults: boolean;
  punctuation: boolean;
  profanityFilter: boolean;
}

export interface TranslationSettings {
  glossaryExpansion: boolean;
  fingerspellUnknown: boolean;
  contextWindow: number; // words
  signSpeed: 'slow' | 'normal' | 'fast';
  transitionTime: number; // ms
}

export interface AvatarSettings extends AvatarConfig {
  animationQuality: 'low' | 'medium' | 'high';
  expressionIntensity: number; // 0-100
  idleAnimations: boolean;
  breathingAnimation: boolean;
  blinkRate: number; // blinks per minute
}

export interface DisplaySettings {
  defaultMode: 'stage' | 'confidence-monitor' | 'livestream-overlay';
  showCaptions: boolean;
  captionFontSize: number;
  captionPosition: 'top' | 'bottom';
  showLatencyIndicator: boolean;
  showStatusBar: boolean;
  backgroundColor: string;
  chromaKeyEnabled: boolean;
  chromaKeyColor: string;
}

export interface PerformanceSettings {
  targetLatency: number; // ms
  maxQueueSize: number;
  memoryWarningThreshold: number; // MB
  memoryCriticalThreshold: number; // MB
  enableMetrics: boolean;
  metricsInterval: number; // ms
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  keyboardShortcutsEnabled: boolean;
  screenReaderAnnouncements: boolean;
  focusIndicators: boolean;
}

// Default settings
export const DEFAULT_SETTINGS: SignMateSettings = {
  general: {
    eventName: '',
    venue: '',
    operatorName: '',
    autoStart: false,
    sessionRecording: true,
    showWelcomeScreen: true,
  },

  audio: {
    defaultSource: 'microphone',
    microphoneDeviceId: '',
    avSystemEnabled: false,
    streamUrl: '',
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true,
    inputVolume: 80,
  },

  speech: {
    provider: 'browser',
    language: 'en-US',
    deepgramApiKey: '',
    deepgramModel: 'nova-2',
    interimResults: true,
    punctuation: true,
    profanityFilter: false,
  },

  translation: {
    glossaryExpansion: true,
    fingerspellUnknown: true,
    contextWindow: 5,
    signSpeed: 'normal',
    transitionTime: 100,
  },

  avatar: {
    style: 'stylized',
    skinTone: '#e0ac69',
    clothingColor: '#1f2937',
    showHands: true,
    showFace: true,
    showUpperBody: true,
    animationQuality: 'high',
    expressionIntensity: 70,
    idleAnimations: true,
    breathingAnimation: true,
    blinkRate: 15,
  },

  display: {
    defaultMode: 'stage',
    showCaptions: true,
    captionFontSize: 24,
    captionPosition: 'bottom',
    showLatencyIndicator: true,
    showStatusBar: true,
    backgroundColor: '#0a0a0a',
    chromaKeyEnabled: false,
    chromaKeyColor: '#00ff00',
  },

  performance: {
    targetLatency: 500,
    maxQueueSize: 10,
    memoryWarningThreshold: 150,
    memoryCriticalThreshold: 250,
    enableMetrics: true,
    metricsInterval: 1000,
  },

  accessibility: {
    reducedMotion: false,
    highContrast: false,
    keyboardShortcutsEnabled: true,
    screenReaderAnnouncements: true,
    focusIndicators: true,
  },
};

// Storage key
const STORAGE_KEY = 'signmate-settings';

// Settings manager class
class SettingsManager {
  private settings: SignMateSettings;
  private listeners: Set<(settings: SignMateSettings) => void> = new Set();

  constructor() {
    this.settings = this.load();
  }

  // Load settings from localStorage
  private load(): SignMateSettings {
    if (typeof window === 'undefined') {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to handle new settings
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }

    return { ...DEFAULT_SETTINGS };
  }

  // Save settings to localStorage
  private save(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // Deep merge utility
  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const targetValue = target[key];

        if (
          sourceValue !== null &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue !== null &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          (result as Record<string, unknown>)[key] = this.deepMerge(
            targetValue as object,
            sourceValue as object
          );
        } else if (sourceValue !== undefined) {
          (result as Record<string, unknown>)[key] = sourceValue;
        }
      }
    }

    return result;
  }

  // Get all settings
  getAll(): SignMateSettings {
    return { ...this.settings };
  }

  // Get a specific section
  get<K extends keyof SignMateSettings>(section: K): SignMateSettings[K] {
    return { ...this.settings[section] };
  }

  // Get a specific value
  getValue<K extends keyof SignMateSettings, V extends keyof SignMateSettings[K]>(
    section: K,
    key: V
  ): SignMateSettings[K][V] {
    return this.settings[section][key];
  }

  // Update a section
  update<K extends keyof SignMateSettings>(
    section: K,
    values: Partial<SignMateSettings[K]>
  ): void {
    this.settings[section] = { ...this.settings[section], ...values };
    this.save();
    this.notify();
  }

  // Update a single value
  setValue<K extends keyof SignMateSettings, V extends keyof SignMateSettings[K]>(
    section: K,
    key: V,
    value: SignMateSettings[K][V]
  ): void {
    (this.settings[section] as unknown as Record<string, unknown>)[key as string] = value;
    this.save();
    this.notify();
  }

  // Reset to defaults
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
    this.notify();
  }

  // Reset a specific section
  resetSection<K extends keyof SignMateSettings>(section: K): void {
    this.settings[section] = { ...DEFAULT_SETTINGS[section] };
    this.save();
    this.notify();
  }

  // Import settings from JSON
  import(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.settings = this.deepMerge(DEFAULT_SETTINGS, imported);
      this.save();
      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to import settings:', e);
      return false;
    }
  }

  // Export settings to JSON
  export(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  // Subscribe to changes
  subscribe(callback: (settings: SignMateSettings) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => {
      try {
        cb(this.getAll());
      } catch (e) {
        console.error('Settings listener error:', e);
      }
    });
  }
}

// Singleton instance
export const settingsManager = new SettingsManager();

// Convenience functions
export function getSettings(): SignMateSettings {
  return settingsManager.getAll();
}

export function getSetting<K extends keyof SignMateSettings>(
  section: K
): SignMateSettings[K] {
  return settingsManager.get(section);
}

export function updateSettings<K extends keyof SignMateSettings>(
  section: K,
  values: Partial<SignMateSettings[K]>
): void {
  settingsManager.update(section, values);
}
