import { create } from 'zustand';
import type {
  AudioSource,
  TranscriptionSegment,
  ASLTranslation,
  AvatarConfig,
  AvatarState,
  DisplayConfig,
  EventConfig,
  PipelineStatus,
  DisplayMode,
} from '@/types';

interface SignMateStore {
  // Event configuration
  currentEvent: EventConfig | null;
  setCurrentEvent: (event: EventConfig | null) => void;

  // Audio sources
  audioSources: AudioSource[];
  activeAudioSource: AudioSource | null;
  addAudioSource: (source: AudioSource) => void;
  removeAudioSource: (id: string) => void;
  setActiveAudioSource: (source: AudioSource | null) => void;

  // Transcription
  transcriptionSegments: TranscriptionSegment[];
  addTranscriptionSegment: (segment: TranscriptionSegment) => void;
  clearTranscription: () => void;

  // ASL Translation
  translations: ASLTranslation[];
  currentTranslation: ASLTranslation | null;
  addTranslation: (translation: ASLTranslation) => void;
  setCurrentTranslation: (translation: ASLTranslation | null) => void;

  // Avatar
  avatarConfig: AvatarConfig;
  avatarState: AvatarState;
  setAvatarConfig: (config: Partial<AvatarConfig>) => void;
  setAvatarState: (state: Partial<AvatarState>) => void;

  // Display
  displayConfigs: DisplayConfig[];
  activeDisplayMode: DisplayMode;
  addDisplayConfig: (config: DisplayConfig) => void;
  updateDisplayConfig: (index: number, config: Partial<DisplayConfig>) => void;
  setActiveDisplayMode: (mode: DisplayMode) => void;

  // Pipeline status
  pipelineStatus: PipelineStatus;
  updatePipelineStatus: (status: Partial<PipelineStatus>) => void;

  // Demo mode
  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;

  // Reset
  reset: () => void;
}

const defaultAvatarConfig: AvatarConfig = {
  style: 'stylized',
  skinTone: '#E0B0A0',
  clothingColor: '#2563EB',
  showHands: true,
  showFace: true,
  showUpperBody: true,
};

const defaultAvatarState: AvatarState = {
  currentSign: undefined,
  queue: [],
  isAnimating: false,
  expressionState: {
    eyebrows: 0,
    eyeOpenness: 1,
    mouthShape: 'neutral',
    headTilt: { x: 0, y: 0, z: 0 },
  },
};

const defaultPipelineStatus: PipelineStatus = {
  audioCapture: 'idle',
  speechRecognition: 'idle',
  aslTranslation: 'idle',
  avatarRendering: 'idle',
  latency: 0,
  errors: [],
};

export const useSignMateStore = create<SignMateStore>((set) => ({
  // Event configuration
  currentEvent: null,
  setCurrentEvent: (event) => set({ currentEvent: event }),

  // Audio sources
  audioSources: [],
  activeAudioSource: null,
  addAudioSource: (source) =>
    set((state) => ({ audioSources: [...state.audioSources, source] })),
  removeAudioSource: (id) =>
    set((state) => ({
      audioSources: state.audioSources.filter((s) => s.id !== id),
      activeAudioSource:
        state.activeAudioSource?.id === id ? null : state.activeAudioSource,
    })),
  setActiveAudioSource: (source) => set({ activeAudioSource: source }),

  // Transcription
  transcriptionSegments: [],
  addTranscriptionSegment: (segment) =>
    set((state) => {
      const segments = [...state.transcriptionSegments];
      const existingIndex = segments.findIndex((s) => s.id === segment.id);
      if (existingIndex >= 0) {
        segments[existingIndex] = segment;
      } else {
        segments.push(segment);
      }
      // Keep only last 100 segments
      return { transcriptionSegments: segments.slice(-100) };
    }),
  clearTranscription: () => set({ transcriptionSegments: [] }),

  // ASL Translation
  translations: [],
  currentTranslation: null,
  addTranslation: (translation) =>
    set((state) => ({
      translations: [...state.translations.slice(-50), translation],
    })),
  setCurrentTranslation: (translation) => set({ currentTranslation: translation }),

  // Avatar
  avatarConfig: defaultAvatarConfig,
  avatarState: defaultAvatarState,
  setAvatarConfig: (config) =>
    set((state) => ({ avatarConfig: { ...state.avatarConfig, ...config } })),
  setAvatarState: (state) =>
    set((prev) => ({ avatarState: { ...prev.avatarState, ...state } })),

  // Display
  displayConfigs: [],
  activeDisplayMode: 'stage',
  addDisplayConfig: (config) =>
    set((state) => ({ displayConfigs: [...state.displayConfigs, config] })),
  updateDisplayConfig: (index, config) =>
    set((state) => {
      const configs = [...state.displayConfigs];
      if (configs[index]) {
        configs[index] = { ...configs[index], ...config };
      }
      return { displayConfigs: configs };
    }),
  setActiveDisplayMode: (mode) => set({ activeDisplayMode: mode }),

  // Pipeline status
  pipelineStatus: defaultPipelineStatus,
  updatePipelineStatus: (status) =>
    set((state) => ({
      pipelineStatus: { ...state.pipelineStatus, ...status },
    })),

  // Demo mode
  isDemoMode: false,
  setDemoMode: (isDemo) => set({ isDemoMode: isDemo }),

  // Reset
  reset: () =>
    set({
      currentEvent: null,
      audioSources: [],
      activeAudioSource: null,
      transcriptionSegments: [],
      translations: [],
      currentTranslation: null,
      avatarConfig: defaultAvatarConfig,
      avatarState: defaultAvatarState,
      displayConfigs: [],
      activeDisplayMode: 'stage',
      pipelineStatus: defaultPipelineStatus,
      isDemoMode: false,
    }),
}));
