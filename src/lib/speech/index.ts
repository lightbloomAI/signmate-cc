// Browser-based speech recognition
export { SpeechRecognizer, getSpeechRecognizer } from './recognizer';
export type { SpeechRecognizerConfig, TranscriptionCallback, ErrorCallback } from './recognizer';

// Legacy Deepgram (SDK-based)
export { DeepgramSpeechRecognizer } from './deepgram';
export type { DeepgramConfig as LegacyDeepgramConfig, DeepgramTranscriptionCallback, DeepgramErrorCallback } from './deepgram';

// New Deepgram WebSocket-based recognizer (lower latency)
export {
  DeepgramRecognizer,
  createDeepgramRecognizer,
  type DeepgramConfig,
} from './deepgramRecognizer';

// Audio processing utilities
export {
  AudioProcessor,
  getAudioLevel,
  isSilent,
  type AudioProcessorConfig,
  type AudioDataCallback,
} from './audioProcessor';

// Unified speech manager
export {
  SpeechManager,
  getSpeechManager,
  createSpeechManager,
  type SpeechProvider,
  type SpeechManagerConfig,
  type StatusCallback,
} from './speechManager';
