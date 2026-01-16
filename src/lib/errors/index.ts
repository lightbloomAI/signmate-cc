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
