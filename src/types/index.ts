// Core types for SignMate

// Audio source types
export type AudioSourceType = 'microphone' | 'av-system' | 'stream';

export interface AudioSource {
  id: string;
  type: AudioSourceType;
  name: string;
  deviceId?: string;
  streamUrl?: string;
  isActive: boolean;
}

// Speech recognition types
export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionResult {
  segments: TranscriptionSegment[];
  fullText: string;
  language: string;
}

// ASL translation types
export interface ASLSign {
  gloss: string; // The sign name/label
  duration: number; // Duration in ms
  handshape: HandShape;
  location: SignLocation;
  movement: SignMovement;
  nonManualMarkers: NonManualMarker[];
}

export interface HandShape {
  dominant: string;
  nonDominant?: string;
}

export interface SignLocation {
  x: number;
  y: number;
  z: number;
  reference: 'neutral' | 'face' | 'chest' | 'head' | 'side';
}

export interface SignMovement {
  type: 'static' | 'linear' | 'arc' | 'circular' | 'zigzag';
  direction?: { x: number; y: number; z: number };
  repetitions?: number;
  speed: 'slow' | 'normal' | 'fast';
}

export interface NonManualMarker {
  type: 'facial' | 'head' | 'body';
  expression: string;
  intensity: number; // 0-1
}

export interface ASLTranslation {
  id: string;
  sourceText: string;
  signs: ASLSign[];
  timestamp: number;
}

// Avatar types
export interface AvatarConfig {
  style: 'realistic' | 'stylized' | 'minimal';
  skinTone: string;
  clothingColor: string;
  showHands: boolean;
  showFace: boolean;
  showUpperBody: boolean;
}

export interface AvatarState {
  currentSign?: ASLSign;
  queue: ASLSign[];
  isAnimating: boolean;
  expressionState: ExpressionState;
}

export interface ExpressionState {
  eyebrows: number; // -1 to 1 (frown to raised)
  eyeOpenness: number; // 0 to 1
  mouthShape: string;
  headTilt: { x: number; y: number; z: number };
}

// Display mode types
export type DisplayMode = 'stage' | 'confidence-monitor' | 'livestream-overlay';

export interface DisplayConfig {
  mode: DisplayMode;
  width: number;
  height: number;
  position: { x: number; y: number };
  backgroundColor: string;
  showCaptions: boolean;
  captionPosition: 'top' | 'bottom';
  avatarSize: 'small' | 'medium' | 'large' | 'fullscreen';
}

// Event configuration types
export interface EventConfig {
  id: string;
  name: string;
  venue: string;
  startTime: Date;
  endTime?: Date;
  audioSources: AudioSource[];
  displays: DisplayConfig[];
  avatarConfig: AvatarConfig;
  isDemo: boolean;
}

// Pipeline status types
export interface PipelineStatus {
  audioCapture: 'idle' | 'active' | 'error';
  speechRecognition: 'idle' | 'processing' | 'error';
  aslTranslation: 'idle' | 'processing' | 'error';
  avatarRendering: 'idle' | 'animating' | 'error';
  latency: number; // Current end-to-end latency in ms
  errors: PipelineError[];
}

export interface PipelineError {
  stage: 'audio' | 'speech' | 'translation' | 'rendering';
  message: string;
  timestamp: number;
}

// WebSocket message types
export interface WSMessage {
  type: 'transcription' | 'translation' | 'status' | 'config' | 'error';
  payload: unknown;
  timestamp: number;
}
