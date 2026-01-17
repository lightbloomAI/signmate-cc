'use client';

import type {
  EventConfig,
  AvatarConfig,
  TranscriptionSegment,
  ASLTranslation,
  PipelineStatus,
} from '@/types';

/**
 * Backup and Recovery System
 *
 * Provides automatic state persistence and recovery for live events.
 * Ensures continuity in case of crashes, browser refreshes, or power failures.
 */

// Backup storage keys
const STORAGE_KEYS = {
  EVENT: 'signmate-backup-event',
  AVATAR: 'signmate-backup-avatar',
  TRANSCRIPTS: 'signmate-backup-transcripts',
  TRANSLATIONS: 'signmate-backup-translations',
  CHECKPOINT: 'signmate-backup-checkpoint',
  SETTINGS: 'signmate-backup-settings',
  META: 'signmate-backup-meta',
};

// Backup metadata
export interface BackupMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  eventId: string;
  eventName: string;
  checkpointCount: number;
  transcriptCount: number;
  translationCount: number;
  isActive: boolean;
  version: string;
}

// Checkpoint data
export interface Checkpoint {
  id: string;
  timestamp: number;
  eventConfig: EventConfig;
  avatarConfig: AvatarConfig;
  pipelineStatus: PipelineStatus;
  transcriptCount: number;
  translationCount: number;
  lastTranscriptId?: string;
  lastTranslationId?: string;
  customData?: Record<string, unknown>;
}

// Backup configuration
export interface BackupConfig {
  enabled: boolean;
  autoCheckpointInterval: number; // ms between checkpoints
  maxCheckpoints: number;
  maxTranscripts: number;
  maxTranslations: number;
  compressData: boolean;
  encryptData: boolean;
}

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  autoCheckpointInterval: 30000, // 30 seconds
  maxCheckpoints: 10,
  maxTranscripts: 1000,
  maxTranslations: 500,
  compressData: false,
  encryptData: false,
};

// Backup event types
export type BackupEventType =
  | 'checkpoint-created'
  | 'checkpoint-restored'
  | 'backup-cleared'
  | 'backup-error'
  | 'storage-full';

type BackupEventHandler = (type: BackupEventType, data?: unknown) => void;

export class BackupManager {
  private config: BackupConfig;
  private checkpointTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Set<BackupEventHandler> = new Set();
  private isRunning = false;
  private currentEventId: string | null = null;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Event handling
  onEvent(handler: BackupEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(type: BackupEventType, data?: unknown): void {
    this.eventHandlers.forEach(handler => {
      try {
        handler(type, data);
      } catch (error) {
        console.error('[BackupManager] Event handler error:', error);
      }
    });
  }

  // Initialize backup for an event
  startBackup(event: EventConfig): void {
    if (!this.config.enabled) return;

    this.currentEventId = event.id;
    this.isRunning = true;

    // Initialize metadata
    const meta: BackupMetadata = {
      id: `backup-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      eventId: event.id,
      eventName: event.name,
      checkpointCount: 0,
      transcriptCount: 0,
      translationCount: 0,
      isActive: true,
      version: '1.0',
    };

    this.saveMeta(meta);
    this.saveEvent(event);

    // Start auto-checkpoint timer
    this.startAutoCheckpoint();

    console.log('[BackupManager] Backup started for event:', event.name);
  }

  // Stop backup
  stopBackup(): void {
    this.isRunning = false;
    this.currentEventId = null;

    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }

    // Mark backup as inactive
    const meta = this.getMeta();
    if (meta) {
      meta.isActive = false;
      meta.updatedAt = Date.now();
      this.saveMeta(meta);
    }

    console.log('[BackupManager] Backup stopped');
  }

  // Create a checkpoint
  createCheckpoint(
    eventConfig: EventConfig,
    avatarConfig: AvatarConfig,
    pipelineStatus: PipelineStatus,
    customData?: Record<string, unknown>
  ): Checkpoint | null {
    if (!this.isRunning) return null;

    try {
      const transcripts = this.getTranscripts();
      const translations = this.getTranslations();

      const checkpoint: Checkpoint = {
        id: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        eventConfig,
        avatarConfig,
        pipelineStatus,
        transcriptCount: transcripts.length,
        translationCount: translations.length,
        lastTranscriptId: transcripts[transcripts.length - 1]?.id,
        lastTranslationId: translations[translations.length - 1]?.id,
        customData,
      };

      // Get existing checkpoints
      const checkpoints = this.getCheckpoints();
      checkpoints.push(checkpoint);

      // Limit checkpoint count
      while (checkpoints.length > this.config.maxCheckpoints) {
        checkpoints.shift();
      }

      this.saveCheckpoints(checkpoints);

      // Update meta
      const meta = this.getMeta();
      if (meta) {
        meta.checkpointCount = checkpoints.length;
        meta.updatedAt = Date.now();
        this.saveMeta(meta);
      }

      this.emit('checkpoint-created', checkpoint);
      return checkpoint;
    } catch (error) {
      console.error('[BackupManager] Failed to create checkpoint:', error);
      this.emit('backup-error', error);
      return null;
    }
  }

  // Add transcript to backup
  addTranscript(transcript: TranscriptionSegment): void {
    if (!this.isRunning) return;

    try {
      const transcripts = this.getTranscripts();
      transcripts.push(transcript);

      // Limit transcript count
      while (transcripts.length > this.config.maxTranscripts) {
        transcripts.shift();
      }

      this.saveTranscripts(transcripts);

      // Update meta
      const meta = this.getMeta();
      if (meta) {
        meta.transcriptCount = transcripts.length;
        meta.updatedAt = Date.now();
        this.saveMeta(meta);
      }
    } catch (error) {
      console.error('[BackupManager] Failed to add transcript:', error);
      this.handleStorageError(error);
    }
  }

  // Add translation to backup
  addTranslation(translation: ASLTranslation): void {
    if (!this.isRunning) return;

    try {
      const translations = this.getTranslations();
      translations.push(translation);

      // Limit translation count
      while (translations.length > this.config.maxTranslations) {
        translations.shift();
      }

      this.saveTranslations(translations);

      // Update meta
      const meta = this.getMeta();
      if (meta) {
        meta.translationCount = translations.length;
        meta.updatedAt = Date.now();
        this.saveMeta(meta);
      }
    } catch (error) {
      console.error('[BackupManager] Failed to add translation:', error);
      this.handleStorageError(error);
    }
  }

  // Restore from last checkpoint
  restoreFromCheckpoint(checkpointId?: string): {
    checkpoint: Checkpoint;
    transcripts: TranscriptionSegment[];
    translations: ASLTranslation[];
  } | null {
    try {
      const checkpoints = this.getCheckpoints();
      const checkpoint = checkpointId
        ? checkpoints.find(cp => cp.id === checkpointId)
        : checkpoints[checkpoints.length - 1];

      if (!checkpoint) {
        console.warn('[BackupManager] No checkpoint found to restore');
        return null;
      }

      const transcripts = this.getTranscripts();
      const translations = this.getTranslations();

      this.emit('checkpoint-restored', checkpoint);

      return {
        checkpoint,
        transcripts,
        translations,
      };
    } catch (error) {
      console.error('[BackupManager] Failed to restore from checkpoint:', error);
      this.emit('backup-error', error);
      return null;
    }
  }

  // Check if there's a recoverable backup
  hasRecoverableBackup(): boolean {
    const meta = this.getMeta();
    if (!meta) return false;

    // Check if backup is recent (within 24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    const age = Date.now() - meta.updatedAt;

    return meta.isActive || age < maxAge;
  }

  // Get backup summary
  getBackupSummary(): BackupMetadata | null {
    return this.getMeta();
  }

  // Get available checkpoints
  getAvailableCheckpoints(): Checkpoint[] {
    return this.getCheckpoints();
  }

  // Clear all backup data
  clearBackup(): void {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      this.emit('backup-cleared');
      console.log('[BackupManager] Backup cleared');
    } catch (error) {
      console.error('[BackupManager] Failed to clear backup:', error);
    }
  }

  // Private: Auto checkpoint timer
  private startAutoCheckpoint(): void {
    if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
    }

    this.checkpointTimer = setInterval(() => {
      // Auto checkpoint will be triggered by the application
      // This is just a reminder mechanism
    }, this.config.autoCheckpointInterval);
  }

  // Private: Storage operations
  private saveMeta(meta: BackupMetadata): void {
    localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(meta));
  }

  private getMeta(): BackupMetadata | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.META);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveEvent(event: EventConfig): void {
    localStorage.setItem(STORAGE_KEYS.EVENT, JSON.stringify(event));
  }

  getEvent(): EventConfig | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENT);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveCheckpoints(checkpoints: Checkpoint[]): void {
    localStorage.setItem(STORAGE_KEYS.CHECKPOINT, JSON.stringify(checkpoints));
  }

  private getCheckpoints(): Checkpoint[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHECKPOINT);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveTranscripts(transcripts: TranscriptionSegment[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSCRIPTS, JSON.stringify(transcripts));
  }

  private getTranscripts(): TranscriptionSegment[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSCRIPTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveTranslations(translations: ASLTranslation[]): void {
    localStorage.setItem(STORAGE_KEYS.TRANSLATIONS, JSON.stringify(translations));
  }

  private getTranslations(): ASLTranslation[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRANSLATIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private handleStorageError(error: unknown): void {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      this.emit('storage-full');

      // Try to free up space by removing oldest data
      const transcripts = this.getTranscripts();
      if (transcripts.length > 100) {
        this.saveTranscripts(transcripts.slice(-100));
      }

      const translations = this.getTranslations();
      if (translations.length > 50) {
        this.saveTranslations(translations.slice(-50));
      }
    }
  }

  // Update configuration
  updateConfig(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.isRunning && this.config.enabled) {
      this.startAutoCheckpoint();
    } else if (this.checkpointTimer) {
      clearInterval(this.checkpointTimer);
      this.checkpointTimer = null;
    }
  }

  // Check if backup is running
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
let backupInstance: BackupManager | null = null;

export function getBackupManager(config?: Partial<BackupConfig>): BackupManager {
  if (!backupInstance) {
    backupInstance = new BackupManager(config);
  }
  return backupInstance;
}

export function createBackupManager(config?: Partial<BackupConfig>): BackupManager {
  return new BackupManager(config);
}
