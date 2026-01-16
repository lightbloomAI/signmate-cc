/**
 * Central error handling system for SignMate
 */

import {
  ErrorCategory,
  ErrorSeverity,
  ErrorCodes,
  ErrorMetadataMap,
  type SignMateError,
  type ErrorCode,
} from './types';

// Error listener callback type
export type ErrorListener = (error: SignMateError) => void;

// Recovery action type
export type RecoveryAction = () => Promise<boolean>;

// Error handler configuration
export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelayMs: number;
  onError?: ErrorListener;
  onRecovery?: (error: SignMateError, success: boolean) => void;
  enableLogging: boolean;
  enableReporting: boolean;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  enableLogging: true,
  enableReporting: false,
};

// Generate unique error ID
function generateErrorId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private listeners: Set<ErrorListener> = new Set();
  private errorHistory: SignMateError[] = [];
  private recoveryActions: Map<ErrorCode, RecoveryAction> = new Map();
  private maxHistorySize = 100;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Configure the error handler
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Register error listener
  addListener(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Register recovery action for specific error code
  registerRecovery(code: ErrorCode, action: RecoveryAction): void {
    this.recoveryActions.set(code, action);
  }

  // Create a SignMateError from an error code
  createError(
    code: ErrorCode,
    options: {
      details?: string;
      context?: Record<string, unknown>;
      severity?: ErrorSeverity;
    } = {}
  ): SignMateError {
    const metadata = ErrorMetadataMap[code];
    const category = this.getCategoryFromCode(code);

    return {
      id: generateErrorId(),
      code,
      category,
      severity: options.severity || this.inferSeverity(code),
      message: metadata.userMessage,
      details: options.details || metadata.technicalMessage,
      timestamp: Date.now(),
      recoverable: this.isRecoverable(code),
      context: options.context,
    };
  }

  // Handle an error
  async handle(error: SignMateError): Promise<void> {
    // Log if enabled
    if (this.config.enableLogging) {
      this.logError(error);
    }

    // Store in history
    this.addToHistory(error);

    // Notify listeners
    this.notifyListeners(error);

    // Call configured handler
    this.config.onError?.(error);

    // Report if enabled
    if (this.config.enableReporting) {
      await this.reportError(error);
    }

    // Attempt recovery if available
    if (error.recoverable) {
      await this.attemptRecovery(error);
    }
  }

  // Handle error from code
  async handleCode(
    code: ErrorCode,
    options: {
      details?: string;
      context?: Record<string, unknown>;
      severity?: ErrorSeverity;
    } = {}
  ): Promise<SignMateError> {
    const error = this.createError(code, options);
    await this.handle(error);
    return error;
  }

  // Handle unknown/native errors
  async handleUnknown(err: unknown, context?: Record<string, unknown>): Promise<SignMateError> {
    let details: string;
    let originalError: unknown;

    if (err instanceof Error) {
      details = `${err.name}: ${err.message}`;
      originalError = err;
    } else if (typeof err === 'string') {
      details = err;
    } else {
      details = 'Unknown error occurred';
    }

    const error = this.createError(ErrorCodes.SYSTEM_UNKNOWN, {
      details,
      context: { ...context, originalError },
      severity: ErrorSeverity.HIGH,
    });

    await this.handle(error);
    return error;
  }

  // Attempt recovery for an error
  private async attemptRecovery(error: SignMateError): Promise<boolean> {
    const action = this.recoveryActions.get(error.code as ErrorCode);
    if (!action) return false;

    const retryCount = error.retryCount || 0;
    if (retryCount >= this.config.maxRetries) {
      return false;
    }

    // Wait before retry
    await this.delay(this.config.retryDelayMs * Math.pow(2, retryCount));

    try {
      const success = await action();
      this.config.onRecovery?.(error, success);
      return success;
    } catch (recoveryError) {
      // Recovery itself failed - mark retry count
      error.retryCount = retryCount + 1;
      return false;
    }
  }

  // Get recent errors
  getRecentErrors(count: number = 10): SignMateError[] {
    return this.errorHistory.slice(-count);
  }

  // Get errors by category
  getErrorsByCategory(category: ErrorCategory): SignMateError[] {
    return this.errorHistory.filter((e) => e.category === category);
  }

  // Get errors by severity
  getErrorsBySeverity(severity: ErrorSeverity): SignMateError[] {
    return this.errorHistory.filter((e) => e.severity === severity);
  }

  // Clear error history
  clearHistory(): void {
    this.errorHistory = [];
  }

  // Check if there are critical errors
  hasCriticalErrors(): boolean {
    const recentCritical = this.errorHistory
      .filter((e) => e.severity === ErrorSeverity.CRITICAL)
      .filter((e) => Date.now() - e.timestamp < 60000); // Last minute
    return recentCritical.length > 0;
  }

  // Private helpers

  private getCategoryFromCode(code: ErrorCode): ErrorCategory {
    const prefix = code.split('_')[0];
    switch (prefix) {
      case 'AUDIO':
        return ErrorCategory.AUDIO;
      case 'SPEECH':
        return ErrorCategory.SPEECH;
      case 'TRANS':
        return ErrorCategory.TRANSLATION;
      case 'RENDER':
        return ErrorCategory.RENDERING;
      case 'NET':
        return ErrorCategory.NETWORK;
      case 'CONFIG':
        return ErrorCategory.CONFIG;
      default:
        return ErrorCategory.SYSTEM;
    }
  }

  private inferSeverity(code: ErrorCode): ErrorSeverity {
    // Permission and unavailable errors are high severity
    if (
      code.includes('PERMISSION') ||
      code.includes('UNAVAILABLE') ||
      code.includes('UNSUPPORTED')
    ) {
      return ErrorSeverity.HIGH;
    }

    // Timeouts and no results are medium
    if (code.includes('TIMEOUT') || code.includes('NO_RESULT') || code.includes('NOT_FOUND')) {
      return ErrorSeverity.MEDIUM;
    }

    // System and critical errors
    if (code.startsWith('SYS') || code.includes('CRITICAL') || code.includes('FAILED')) {
      return ErrorSeverity.HIGH;
    }

    return ErrorSeverity.LOW;
  }

  private isRecoverable(code: ErrorCode): boolean {
    // Non-recoverable: permission, unsupported features
    const nonRecoverable: ErrorCode[] = [
      ErrorCodes.AUDIO_PERMISSION_DENIED,
      ErrorCodes.SPEECH_LANGUAGE_UNSUPPORTED,
      ErrorCodes.RENDER_WEBGL_UNAVAILABLE,
      ErrorCodes.SYSTEM_BROWSER_UNSUPPORTED,
    ];
    return !nonRecoverable.includes(code);
  }

  private logError(error: SignMateError): void {
    const logLevel =
      error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH
        ? 'error'
        : error.severity === ErrorSeverity.MEDIUM
          ? 'warn'
          : 'log';

    console[logLevel](
      `[SignMate ${error.severity.toUpperCase()}] ${error.code}: ${error.message}`,
      error.details ? `\nDetails: ${error.details}` : '',
      error.context ? `\nContext: ${JSON.stringify(error.context)}` : ''
    );
  }

  private addToHistory(error: SignMateError): void {
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private notifyListeners(error: SignMateError): void {
    this.listeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  private async reportError(_error: SignMateError): Promise<void> {
    // Placeholder for error reporting to external service
    // Could send to Sentry, LogRocket, etc.
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Convenience functions
export function handleError(error: SignMateError): Promise<void> {
  return errorHandler.handle(error);
}

export function handleErrorCode(
  code: ErrorCode,
  options?: {
    details?: string;
    context?: Record<string, unknown>;
    severity?: ErrorSeverity;
  }
): Promise<SignMateError> {
  return errorHandler.handleCode(code, options);
}

export function handleUnknownError(
  err: unknown,
  context?: Record<string, unknown>
): Promise<SignMateError> {
  return errorHandler.handleUnknown(err, context);
}
