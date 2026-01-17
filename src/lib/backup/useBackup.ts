'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BackupManager,
  getBackupManager,
  type BackupMetadata,
  type Checkpoint,
  type BackupConfig,
  type BackupEventType,
} from './backupManager';
import type { EventConfig, AvatarConfig, TranscriptionSegment, ASLTranslation, PipelineStatus } from '@/types';

/**
 * useBackup Hook
 *
 * React hook for managing backup and recovery in SignMate.
 */

interface UseBackupOptions {
  config?: Partial<BackupConfig>;
  onCheckpointCreated?: (checkpoint: Checkpoint) => void;
  onCheckpointRestored?: (checkpoint: Checkpoint) => void;
  onBackupCleared?: () => void;
  onError?: (error: unknown) => void;
  onStorageFull?: () => void;
}

interface UseBackupReturn {
  // State
  isRunning: boolean;
  hasRecoverableBackup: boolean;
  backupSummary: BackupMetadata | null;
  availableCheckpoints: Checkpoint[];

  // Actions
  startBackup: (event: EventConfig) => void;
  stopBackup: () => void;
  createCheckpoint: (
    eventConfig: EventConfig,
    avatarConfig: AvatarConfig,
    pipelineStatus: PipelineStatus,
    customData?: Record<string, unknown>
  ) => Checkpoint | null;
  addTranscript: (transcript: TranscriptionSegment) => void;
  addTranslation: (translation: ASLTranslation) => void;
  restoreFromCheckpoint: (checkpointId?: string) => {
    checkpoint: Checkpoint;
    transcripts: TranscriptionSegment[];
    translations: ASLTranslation[];
  } | null;
  clearBackup: () => void;

  // Manager access
  manager: BackupManager;
}

export function useBackup(options: UseBackupOptions = {}): UseBackupReturn {
  const {
    config,
    onCheckpointCreated,
    onCheckpointRestored,
    onBackupCleared,
    onError,
    onStorageFull,
  } = options;

  const managerRef = useRef<BackupManager | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [backupSummary, setBackupSummary] = useState<BackupMetadata | null>(null);
  const [availableCheckpoints, setAvailableCheckpoints] = useState<Checkpoint[]>([]);
  const [hasRecoverableBackup, setHasRecoverableBackup] = useState(false);

  // Initialize manager
  useEffect(() => {
    const manager = getBackupManager(config);
    managerRef.current = manager;

    // Set up event listener
    const unsubscribe = manager.onEvent((type: BackupEventType, data?: unknown) => {
      switch (type) {
        case 'checkpoint-created':
          onCheckpointCreated?.(data as Checkpoint);
          setAvailableCheckpoints(manager.getAvailableCheckpoints());
          setBackupSummary(manager.getBackupSummary());
          break;
        case 'checkpoint-restored':
          onCheckpointRestored?.(data as Checkpoint);
          break;
        case 'backup-cleared':
          onBackupCleared?.();
          setBackupSummary(null);
          setAvailableCheckpoints([]);
          setHasRecoverableBackup(false);
          break;
        case 'backup-error':
          onError?.(data);
          break;
        case 'storage-full':
          onStorageFull?.();
          break;
      }
    });

    // Load initial state
    setIsRunning(manager.getIsRunning());
    setBackupSummary(manager.getBackupSummary());
    setAvailableCheckpoints(manager.getAvailableCheckpoints());
    setHasRecoverableBackup(manager.hasRecoverableBackup());

    return () => {
      unsubscribe();
    };
  }, [config, onCheckpointCreated, onCheckpointRestored, onBackupCleared, onError, onStorageFull]);

  const startBackup = useCallback((event: EventConfig) => {
    managerRef.current?.startBackup(event);
    setIsRunning(true);
    setHasRecoverableBackup(true);
  }, []);

  const stopBackup = useCallback(() => {
    managerRef.current?.stopBackup();
    setIsRunning(false);
  }, []);

  const createCheckpoint = useCallback(
    (
      eventConfig: EventConfig,
      avatarConfig: AvatarConfig,
      pipelineStatus: PipelineStatus,
      customData?: Record<string, unknown>
    ) => {
      return managerRef.current?.createCheckpoint(
        eventConfig,
        avatarConfig,
        pipelineStatus,
        customData
      ) || null;
    },
    []
  );

  const addTranscript = useCallback((transcript: TranscriptionSegment) => {
    managerRef.current?.addTranscript(transcript);
  }, []);

  const addTranslation = useCallback((translation: ASLTranslation) => {
    managerRef.current?.addTranslation(translation);
  }, []);

  const restoreFromCheckpoint = useCallback((checkpointId?: string) => {
    return managerRef.current?.restoreFromCheckpoint(checkpointId) || null;
  }, []);

  const clearBackup = useCallback(() => {
    managerRef.current?.clearBackup();
  }, []);

  return {
    isRunning,
    hasRecoverableBackup,
    backupSummary,
    availableCheckpoints,
    startBackup,
    stopBackup,
    createCheckpoint,
    addTranscript,
    addTranslation,
    restoreFromCheckpoint,
    clearBackup,
    manager: managerRef.current!,
  };
}

/**
 * useAutoCheckpoint Hook
 *
 * Automatically creates checkpoints at regular intervals.
 */
export function useAutoCheckpoint(
  enabled: boolean,
  interval: number,
  getState: () => {
    eventConfig: EventConfig;
    avatarConfig: AvatarConfig;
    pipelineStatus: PipelineStatus;
  } | null
) {
  const { createCheckpoint, isRunning } = useBackup();

  useEffect(() => {
    if (!enabled || !isRunning) return;

    const timer = setInterval(() => {
      const state = getState();
      if (state) {
        createCheckpoint(state.eventConfig, state.avatarConfig, state.pipelineStatus);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [enabled, interval, isRunning, getState, createCheckpoint]);
}

/**
 * useRecoveryPrompt Hook
 *
 * Checks for recoverable backup and provides prompt data.
 */
export function useRecoveryPrompt() {
  const { hasRecoverableBackup, backupSummary, restoreFromCheckpoint, clearBackup } = useBackup();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (hasRecoverableBackup && backupSummary?.isActive) {
      setShowPrompt(true);
    }
  }, [hasRecoverableBackup, backupSummary]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const restore = useCallback(() => {
    const result = restoreFromCheckpoint();
    setShowPrompt(false);
    return result;
  }, [restoreFromCheckpoint]);

  const discardAndClear = useCallback(() => {
    clearBackup();
    setShowPrompt(false);
  }, [clearBackup]);

  return {
    showPrompt,
    backupSummary,
    dismiss,
    restore,
    discardAndClear,
  };
}
