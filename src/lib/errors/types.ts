/**
 * Error types and definitions for SignMate pipeline
 */

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low', // Non-critical, can continue
  MEDIUM = 'medium', // Degraded functionality
  HIGH = 'high', // Major feature unavailable
  CRITICAL = 'critical', // System failure
}

// Error categories matching pipeline stages
export enum ErrorCategory {
  AUDIO = 'audio',
  SPEECH = 'speech',
  TRANSLATION = 'translation',
  RENDERING = 'rendering',
  NETWORK = 'network',
  CONFIG = 'config',
  SYSTEM = 'system',
}

// Base error interface
export interface SignMateError {
  id: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  timestamp: number;
  recoverable: boolean;
  retryCount?: number;
  context?: Record<string, unknown>;
}

// Error codes organized by category
export const ErrorCodes = {
  // Audio errors
  AUDIO_DEVICE_NOT_FOUND: 'AUDIO_001',
  AUDIO_PERMISSION_DENIED: 'AUDIO_002',
  AUDIO_STREAM_FAILED: 'AUDIO_003',
  AUDIO_BUFFER_OVERFLOW: 'AUDIO_004',
  AUDIO_FORMAT_UNSUPPORTED: 'AUDIO_005',
  AUDIO_CONNECTION_LOST: 'AUDIO_006',

  // Speech recognition errors
  SPEECH_SERVICE_UNAVAILABLE: 'SPEECH_001',
  SPEECH_TIMEOUT: 'SPEECH_002',
  SPEECH_LANGUAGE_UNSUPPORTED: 'SPEECH_003',
  SPEECH_NO_RESULT: 'SPEECH_004',
  SPEECH_API_ERROR: 'SPEECH_005',
  SPEECH_QUOTA_EXCEEDED: 'SPEECH_006',

  // Translation errors
  TRANSLATION_GLOSS_NOT_FOUND: 'TRANS_001',
  TRANSLATION_INVALID_INPUT: 'TRANS_002',
  TRANSLATION_TIMEOUT: 'TRANS_003',
  TRANSLATION_SERVICE_ERROR: 'TRANS_004',

  // Rendering errors
  RENDER_WEBGL_UNAVAILABLE: 'RENDER_001',
  RENDER_CONTEXT_LOST: 'RENDER_002',
  RENDER_ANIMATION_FAILED: 'RENDER_003',
  RENDER_RESOURCE_FAILED: 'RENDER_004',

  // Network errors
  NETWORK_DISCONNECTED: 'NET_001',
  NETWORK_TIMEOUT: 'NET_002',
  NETWORK_WEBSOCKET_FAILED: 'NET_003',
  NETWORK_SYNC_FAILED: 'NET_004',

  // Configuration errors
  CONFIG_INVALID: 'CONFIG_001',
  CONFIG_MISSING_REQUIRED: 'CONFIG_002',
  CONFIG_LOAD_FAILED: 'CONFIG_003',

  // System errors
  SYSTEM_MEMORY_LOW: 'SYS_001',
  SYSTEM_BROWSER_UNSUPPORTED: 'SYS_002',
  SYSTEM_INITIALIZATION_FAILED: 'SYS_003',
  SYSTEM_UNKNOWN: 'SYS_999',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// Error metadata for user-friendly messages and recovery actions
export interface ErrorMetadata {
  userMessage: string;
  technicalMessage: string;
  recoveryAction?: string;
  documentation?: string;
}

// Mapping of error codes to metadata
export const ErrorMetadataMap: Record<ErrorCode, ErrorMetadata> = {
  [ErrorCodes.AUDIO_DEVICE_NOT_FOUND]: {
    userMessage: 'No audio input device found',
    technicalMessage: 'Failed to enumerate audio input devices',
    recoveryAction: 'Check that a microphone is connected and try again',
  },
  [ErrorCodes.AUDIO_PERMISSION_DENIED]: {
    userMessage: 'Microphone access denied',
    technicalMessage: 'User denied microphone permission or permission policy blocked',
    recoveryAction: 'Allow microphone access in your browser settings',
  },
  [ErrorCodes.AUDIO_STREAM_FAILED]: {
    userMessage: 'Failed to start audio capture',
    technicalMessage: 'getUserMedia or audio stream initialization failed',
    recoveryAction: 'Check audio device and restart the application',
  },
  [ErrorCodes.AUDIO_BUFFER_OVERFLOW]: {
    userMessage: 'Audio processing overloaded',
    technicalMessage: 'Audio buffer overflow - processing cannot keep up',
    recoveryAction: 'Close other applications to free system resources',
  },
  [ErrorCodes.AUDIO_FORMAT_UNSUPPORTED]: {
    userMessage: 'Audio format not supported',
    technicalMessage: 'Audio source format incompatible with pipeline',
    recoveryAction: 'Try a different audio source or format',
  },
  [ErrorCodes.AUDIO_CONNECTION_LOST]: {
    userMessage: 'Audio connection lost',
    technicalMessage: 'Audio device disconnected or stream ended unexpectedly',
    recoveryAction: 'Reconnect audio device and restart capture',
  },

  [ErrorCodes.SPEECH_SERVICE_UNAVAILABLE]: {
    userMessage: 'Speech recognition unavailable',
    technicalMessage: 'Speech recognition service not available in this browser or region',
    recoveryAction: 'Try a different browser or check internet connection',
  },
  [ErrorCodes.SPEECH_TIMEOUT]: {
    userMessage: 'Speech recognition timed out',
    technicalMessage: 'No speech detected within timeout period',
    recoveryAction: 'Speak clearly into the microphone',
  },
  [ErrorCodes.SPEECH_LANGUAGE_UNSUPPORTED]: {
    userMessage: 'Language not supported',
    technicalMessage: 'Selected language not available for speech recognition',
    recoveryAction: 'Select a supported language',
  },
  [ErrorCodes.SPEECH_NO_RESULT]: {
    userMessage: 'Could not understand speech',
    technicalMessage: 'Speech recognition returned no results',
    recoveryAction: 'Speak more clearly or reduce background noise',
  },
  [ErrorCodes.SPEECH_API_ERROR]: {
    userMessage: 'Speech recognition error',
    technicalMessage: 'Speech recognition API returned an error',
    recoveryAction: 'Try again in a moment',
  },
  [ErrorCodes.SPEECH_QUOTA_EXCEEDED]: {
    userMessage: 'Speech recognition quota exceeded',
    technicalMessage: 'API rate limit or quota exceeded',
    recoveryAction: 'Wait before trying again or upgrade plan',
  },

  [ErrorCodes.TRANSLATION_GLOSS_NOT_FOUND]: {
    userMessage: 'Some words could not be translated',
    technicalMessage: 'ASL gloss not found for input word(s)',
    recoveryAction: 'Word will be fingerspelled as fallback',
  },
  [ErrorCodes.TRANSLATION_INVALID_INPUT]: {
    userMessage: 'Invalid input for translation',
    technicalMessage: 'Translation input validation failed',
    recoveryAction: 'Check input text format',
  },
  [ErrorCodes.TRANSLATION_TIMEOUT]: {
    userMessage: 'Translation taking too long',
    technicalMessage: 'Translation process exceeded timeout',
    recoveryAction: 'Processing shorter phrases',
  },
  [ErrorCodes.TRANSLATION_SERVICE_ERROR]: {
    userMessage: 'Translation service error',
    technicalMessage: 'External translation service failed',
    recoveryAction: 'Falling back to basic translation',
  },

  [ErrorCodes.RENDER_WEBGL_UNAVAILABLE]: {
    userMessage: '3D rendering not available',
    technicalMessage: 'WebGL context could not be created',
    recoveryAction: 'Enable hardware acceleration or try a different browser',
  },
  [ErrorCodes.RENDER_CONTEXT_LOST]: {
    userMessage: '3D rendering interrupted',
    technicalMessage: 'WebGL context was lost',
    recoveryAction: 'Renderer will attempt to recover automatically',
  },
  [ErrorCodes.RENDER_ANIMATION_FAILED]: {
    userMessage: 'Animation playback error',
    technicalMessage: 'Animation frame processing failed',
    recoveryAction: 'Skipping to next sign',
  },
  [ErrorCodes.RENDER_RESOURCE_FAILED]: {
    userMessage: 'Failed to load resources',
    technicalMessage: 'Avatar or animation resources failed to load',
    recoveryAction: 'Check network connection and reload',
  },

  [ErrorCodes.NETWORK_DISCONNECTED]: {
    userMessage: 'Network connection lost',
    technicalMessage: 'Network connectivity interrupted',
    recoveryAction: 'Check internet connection',
  },
  [ErrorCodes.NETWORK_TIMEOUT]: {
    userMessage: 'Network request timed out',
    technicalMessage: 'Server request exceeded timeout threshold',
    recoveryAction: 'Retrying automatically',
  },
  [ErrorCodes.NETWORK_WEBSOCKET_FAILED]: {
    userMessage: 'Real-time connection failed',
    technicalMessage: 'WebSocket connection could not be established',
    recoveryAction: 'Attempting to reconnect',
  },
  [ErrorCodes.NETWORK_SYNC_FAILED]: {
    userMessage: 'Failed to sync with other displays',
    technicalMessage: 'Multi-client synchronization failed',
    recoveryAction: 'Operating in standalone mode',
  },

  [ErrorCodes.CONFIG_INVALID]: {
    userMessage: 'Invalid configuration',
    technicalMessage: 'Configuration validation failed',
    recoveryAction: 'Review event setup settings',
  },
  [ErrorCodes.CONFIG_MISSING_REQUIRED]: {
    userMessage: 'Missing required configuration',
    technicalMessage: 'Required configuration field not provided',
    recoveryAction: 'Complete all required fields in setup',
  },
  [ErrorCodes.CONFIG_LOAD_FAILED]: {
    userMessage: 'Could not load saved configuration',
    technicalMessage: 'Configuration file read/parse failed',
    recoveryAction: 'Using default configuration',
  },

  [ErrorCodes.SYSTEM_MEMORY_LOW]: {
    userMessage: 'System resources low',
    technicalMessage: 'Available memory below threshold',
    recoveryAction: 'Close other applications',
  },
  [ErrorCodes.SYSTEM_BROWSER_UNSUPPORTED]: {
    userMessage: 'Browser not fully supported',
    technicalMessage: 'Required browser APIs not available',
    recoveryAction: 'Use a modern browser (Chrome, Firefox, Safari)',
  },
  [ErrorCodes.SYSTEM_INITIALIZATION_FAILED]: {
    userMessage: 'System failed to start',
    technicalMessage: 'Application initialization failed',
    recoveryAction: 'Refresh the page and try again',
  },
  [ErrorCodes.SYSTEM_UNKNOWN]: {
    userMessage: 'An unexpected error occurred',
    technicalMessage: 'Unhandled error',
    recoveryAction: 'Please try again or contact support',
  },
};
