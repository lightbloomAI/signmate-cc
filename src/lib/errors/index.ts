export {
  ErrorSeverity,
  ErrorCategory,
  ErrorCodes,
  ErrorMetadataMap,
  type SignMateError,
  type ErrorCode,
  type ErrorMetadata,
} from './types';

export {
  errorHandler,
  handleError,
  handleErrorCode,
  handleUnknownError,
  type ErrorListener,
  type RecoveryAction,
  type ErrorHandlerConfig,
} from './handler';

// Error Recovery System
export {
  ErrorRecoveryManager,
  getErrorRecoveryManager,
  createErrorRecoveryManager,
  withErrorRecovery,
  type RecoveryStrategy,
  type RecoveryResult,
  type ErrorHandler as ErrorRecoveryHandler,
  type RecoveryHandler,
  type ErrorRecoveryConfig,
} from './errorRecovery';

export {
  useErrorRecovery,
  useErrorListener,
  useErrorState,
  useAsyncWithRecovery,
  useErrorStatistics,
  useErrorNotifications,
  useErrorHandler,
} from './useErrorRecovery';
