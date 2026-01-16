import { describe, it, expect, beforeEach } from 'vitest';
import { useSignMateStore } from './index';

describe('SignMateStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useSignMateStore.getState().reset();
  });

  describe('Audio Sources', () => {
    it('should add an audio source', () => {
      const store = useSignMateStore.getState();
      const source = {
        id: 'test-mic',
        type: 'microphone' as const,
        name: 'Test Microphone',
        isActive: false,
      };

      store.addAudioSource(source);

      expect(useSignMateStore.getState().audioSources).toHaveLength(1);
      expect(useSignMateStore.getState().audioSources[0].id).toBe('test-mic');
    });

    it('should remove an audio source', () => {
      const store = useSignMateStore.getState();
      const source = {
        id: 'test-mic',
        type: 'microphone' as const,
        name: 'Test Microphone',
        isActive: false,
      };

      store.addAudioSource(source);
      store.removeAudioSource('test-mic');

      expect(useSignMateStore.getState().audioSources).toHaveLength(0);
    });

    it('should set active audio source', () => {
      const store = useSignMateStore.getState();
      const source = {
        id: 'test-mic',
        type: 'microphone' as const,
        name: 'Test Microphone',
        isActive: false,
      };

      store.addAudioSource(source);
      store.setActiveAudioSource(source);

      expect(useSignMateStore.getState().activeAudioSource?.id).toBe('test-mic');
    });

    it('should clear active source when removed', () => {
      const store = useSignMateStore.getState();
      const source = {
        id: 'test-mic',
        type: 'microphone' as const,
        name: 'Test Microphone',
        isActive: false,
      };

      store.addAudioSource(source);
      store.setActiveAudioSource(source);
      store.removeAudioSource('test-mic');

      expect(useSignMateStore.getState().activeAudioSource).toBeNull();
    });
  });

  describe('Transcription', () => {
    it('should add a transcription segment', () => {
      const store = useSignMateStore.getState();
      const segment = {
        id: 'seg-1',
        text: 'Hello world',
        startTime: 0,
        endTime: 1000,
        confidence: 0.95,
        isFinal: true,
      };

      store.addTranscriptionSegment(segment);

      expect(useSignMateStore.getState().transcriptionSegments).toHaveLength(1);
      expect(useSignMateStore.getState().transcriptionSegments[0].text).toBe('Hello world');
    });

    it('should update existing segment by ID', () => {
      const store = useSignMateStore.getState();
      const segment1 = {
        id: 'seg-1',
        text: 'Hello',
        startTime: 0,
        endTime: 500,
        confidence: 0.8,
        isFinal: false,
      };
      const segment2 = {
        id: 'seg-1',
        text: 'Hello world',
        startTime: 0,
        endTime: 1000,
        confidence: 0.95,
        isFinal: true,
      };

      store.addTranscriptionSegment(segment1);
      store.addTranscriptionSegment(segment2);

      expect(useSignMateStore.getState().transcriptionSegments).toHaveLength(1);
      expect(useSignMateStore.getState().transcriptionSegments[0].text).toBe('Hello world');
    });

    it('should keep only last 100 segments', () => {
      const store = useSignMateStore.getState();

      for (let i = 0; i < 150; i++) {
        store.addTranscriptionSegment({
          id: `seg-${i}`,
          text: `Segment ${i}`,
          startTime: i * 1000,
          endTime: (i + 1) * 1000,
          confidence: 0.9,
          isFinal: true,
        });
      }

      expect(useSignMateStore.getState().transcriptionSegments).toHaveLength(100);
    });

    it('should clear transcription', () => {
      const store = useSignMateStore.getState();
      store.addTranscriptionSegment({
        id: 'seg-1',
        text: 'Hello',
        startTime: 0,
        endTime: 1000,
        confidence: 0.95,
        isFinal: true,
      });

      store.clearTranscription();

      expect(useSignMateStore.getState().transcriptionSegments).toHaveLength(0);
    });
  });

  describe('Avatar', () => {
    it('should update avatar config', () => {
      const store = useSignMateStore.getState();

      store.setAvatarConfig({ skinTone: '#FFD0B0' });

      expect(useSignMateStore.getState().avatarConfig.skinTone).toBe('#FFD0B0');
    });

    it('should preserve other config values when updating', () => {
      const store = useSignMateStore.getState();
      const originalStyle = useSignMateStore.getState().avatarConfig.style;

      store.setAvatarConfig({ skinTone: '#FFD0B0' });

      expect(useSignMateStore.getState().avatarConfig.style).toBe(originalStyle);
    });

    it('should update avatar state', () => {
      const store = useSignMateStore.getState();

      store.setAvatarState({ isAnimating: true });

      expect(useSignMateStore.getState().avatarState.isAnimating).toBe(true);
    });
  });

  describe('Display', () => {
    it('should add display config', () => {
      const store = useSignMateStore.getState();
      const config = {
        mode: 'stage' as const,
        width: 1920,
        height: 1080,
        position: { x: 0, y: 0 },
        backgroundColor: '#000',
        showCaptions: true,
        captionPosition: 'bottom' as const,
        avatarSize: 'large' as const,
      };

      store.addDisplayConfig(config);

      expect(useSignMateStore.getState().displayConfigs).toHaveLength(1);
    });

    it('should update display config', () => {
      const store = useSignMateStore.getState();
      const config = {
        mode: 'stage' as const,
        width: 1920,
        height: 1080,
        position: { x: 0, y: 0 },
        backgroundColor: '#000',
        showCaptions: true,
        captionPosition: 'bottom' as const,
        avatarSize: 'large' as const,
      };

      store.addDisplayConfig(config);
      store.updateDisplayConfig(0, { showCaptions: false });

      expect(useSignMateStore.getState().displayConfigs[0].showCaptions).toBe(false);
    });

    it('should set active display mode', () => {
      const store = useSignMateStore.getState();

      store.setActiveDisplayMode('confidence-monitor');

      expect(useSignMateStore.getState().activeDisplayMode).toBe('confidence-monitor');
    });
  });

  describe('Pipeline Status', () => {
    it('should update pipeline status', () => {
      const store = useSignMateStore.getState();

      store.updatePipelineStatus({ audioCapture: 'active', latency: 250 });

      expect(useSignMateStore.getState().pipelineStatus.audioCapture).toBe('active');
      expect(useSignMateStore.getState().pipelineStatus.latency).toBe(250);
    });
  });

  describe('Demo Mode', () => {
    it('should set demo mode', () => {
      const store = useSignMateStore.getState();

      store.setDemoMode(true);

      expect(useSignMateStore.getState().isDemoMode).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset all state', () => {
      const store = useSignMateStore.getState();

      // Set various state
      store.setDemoMode(true);
      store.addAudioSource({
        id: 'test',
        type: 'microphone',
        name: 'Test',
        isActive: false,
      });
      store.updatePipelineStatus({ latency: 500 });

      // Reset
      store.reset();

      // Verify reset
      expect(useSignMateStore.getState().isDemoMode).toBe(false);
      expect(useSignMateStore.getState().audioSources).toHaveLength(0);
      expect(useSignMateStore.getState().pipelineStatus.latency).toBe(0);
    });
  });
});
