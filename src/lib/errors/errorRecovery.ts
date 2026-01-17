/**
 * Error Recovery System for SignMate
 *
 * Provides structured error handling, recovery strategies, and error reporting
 * for maintaining stability during live events.
 */

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error categories for classification
export type ErrorCategory =
  | 'network'
  | 'audio'
  | 'pipeline'
  | 'rendering'
  | 'state'
  | 'permission'
  | 'configuration'
  | 'unknown';

// Recovery strategy types
export type RecoveryStrategy =
  | 'retry'
  | 'fallback'
  | 'reset'
  | 'reload'
  | 'ignore'
  | 'escalate';

// Structured error information
export interface SignMateError {
  id: string;
  message: string;
  code?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  stack?: string;
  context?: Record<string, unknown>;
  recoverable: boolean;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  originalError?: Error;
}

// Recovery action result
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  message?: string;
  shouldRetry: boolean;
  nextDelay?: number;
}

// Error handler callback
export type ErrorHandler = (error: SignMateError) => void;

// Recovery handler callback
export type RecoveryHandler = (error: SignMateError) => Promise<RecoveryResult>;

// Error recovery configuration
export interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelays: number[];
  enableAutoRecovery: boolean;
  enableErrorReporting: boolean;
  errorReportingEndpoint?: string;
  onError?: ErrorHandler;
  onRecovery?: (error: SignMateError, result: RecoveryResult) => void;
}

const DEFAULT_CONFIG: ErrorRecoveryConfig = {
  maxRetries: 3,
  retryDelays: [1000, 2000, 5000],
  enableAutoRecovery: true,
  enableErrorReporting: false,
};

/**
 * Error Recovery Manager
 *
 * Central system for managing errors, recovery strategies, and error reporting.
 */
export class ErrorRecoveryManager {
  private config: ErrorRecoveryConfig;
  private errors: SignMateError[] = [];
  private recoveryHandlers = new Map<ErrorCategory, RecoveryHandler>();
  private errorHandlers: ErrorHandler[] = [];
  private maxErrorHistory = 100;

  constructor(config: Partial<ErrorRecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupDefaultRecoveryHandlers();
  }

  /**
   * Setup default recovery handlers for each category
   */
  private setupDefaultRecoveryHandlers(): void {
    // Network errors - retry with exponential backoff
    this.recoveryHandlers.set('network', async (error) => {
      if (error.recoveryAttempts < error.maxRecoveryAttempts) {
        const delay = this.config.retryDelays[error.recoveryAttempts] || 5000;
        return {
          success: false,
          strategy: 'retry',
          shouldRetry: true,
          nextDelay: delay,
          message: `Retrying network request in ${delay}ms`,
        };
      }
      return {
        success: false,
        strategy: 'fallback',
        shouldRetry: false,
        message: 'Network error persists, switching to fallback mode',
      };
    });

    // Audio errors - request permission or fallback
    this.recoveryHandlers.set('audio', async (error) => {
      if (error.code === 'PERMISSION_DENIED') {
        return {
          success: false,
          strategy: 'escalate',
          shouldRetry: false,
          message: 'Microphone permission required',
        };
      }
      return {
        success: false,
        strategy: 'retry',
        shouldRetry: error.recoveryAttempts < 2,
        nextDelay: 1000,
        message: 'Attempting to reinitialize audio',
      };
    });

    // Pipeline errors - reset pipeline state
    this.recoveryHandlers.set('pipeline', async (error) => {
      if (error.severity === 'critical') {
        return {
          success: false,
          strategy: 'reset',
          shouldRetry: false,
          message: 'Pipeline requires full reset',
        };
      }
      return {
        success: false,
        strategy: 'retry',
        shouldRetry: error.recoveryAttempts < error.maxRecoveryAttempts,
        nextDelay: 500,
        message: 'Restarting pipeline stage',
      };
    });

    // Rendering errors - reload component
    this.recoveryHandlers.set('rendering', async (error) => {
      return {
        success: false,
        strategy: 'reload',
        shouldRetry: false,
        message: 'Component will be reloaded',
      };
    });

    // State errors - reset to initial state
    this.recoveryHandlers.set('state', async (error) => {
      return {
        success: false,
        strategy: 'reset',
        shouldRetry: false,
        message: 'Resetting application state',
      };
    });

    // Permission errors - require user action
    this.recoveryHandlers.set('permission', async (error) => {
      return {
        success: false,
        strategy: 'escalate',
        shouldRetry: false,
        message: 'User permission required',
      };
    });

    // Configuration errors - check settings
    this.recoveryHandlers.set('configuration', async (error) => {
      return {
        success: false,
        strategy: 'fallback',
        shouldRetry: false,
        message: 'Using default configuration',
      };
    });

    // Unknown errors - log and ignore or escalate
    this.recoveryHandlers.set('unknown', async (error) => {
      if (error.severity === 'critical' || error.severity === 'high') {
        return {
          success: false,
          strategy: 'escalate',
          shouldRetry: false,
          message: 'Unknown error requires attention',
        };
      }
      return {
        success: false,
        strategy: 'ignore',
        shouldRetry: false,
        message: 'Error logged but ignored',
      };
    });
  }

  /**
   * Classify an error into a category
   */
  classifyError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      name.includes('networkerror')
    ) {
      return 'network';
    }

    if (
      message.includes('audio') ||
      message.includes('microphone') ||
      message.includes('mediastream')
    ) {
      return 'audio';
    }

    if (
      message.includes('pipeline') ||
      message.includes('transcription') ||
      message.includes('translation')
    ) {
      return 'pipeline';
    }

    if (
      message.includes('render') ||
      message.includes('component') ||
      message.includes('react')
    ) {
      return 'rendering';
    }

    if (
      message.includes('state') ||
      message.includes('store') ||
      message.includes('zustand')
    ) {
      return 'state';
    }

    if (
      message.includes('permission') ||
      message.includes('denied') ||
      message.includes('not allowed')
    ) {
      return 'permission';
    }

    if (
      message.includes('config') ||
      message.includes('setting') ||
      message.includes('invalid')
    ) {
      return 'configuration';
    }

    return 'unknown';
  }

  /**
   * Determine error severity
   */
  determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that stop the app
    if (category === 'permission' || category === 'state') {
      return 'high';
    }

    // Pipeline and audio errors are medium-high during live events
    if (category === 'pipeline' || category === 'audio') {
      return 'medium';
    }

    // Network can be recovered
    if (category === 'network') {
      return 'medium';
    }

    // Rendering errors might be localized
    if (category === 'rendering') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Create a structured error from a native Error
   */
  createError(
    error: Error,
    context?: Record<string, unknown>,
    overrides?: Partial<SignMateError>
  ): SignMateError {
    const category = this.classifyError(error);
    const severity = this.determineSeverity(error, category);

    return {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      code: (error as Error & { code?: string }).code,
      category,
      severity,
      timestamp: Date.now(),
      stack: error.stack,
      context,
      recoverable: severity !== 'critical',
      recoveryAttempts: 0,
      maxRecoveryAttempts: this.config.maxRetries,
      originalError: error,
      ...overrides,
    };
  }

  /**
   * Handle an error with automatic recovery
   */
  async handleError(
    error: Error | SignMateError,
    context?: Record<string, unknown>
  ): Promise<RecoveryResult> {
    // Convert native Error to SignMateError
    const signMateError =
      'category' in error ? error : this.createError(error, context);

    // Add to error history
    this.addToHistory(signMateError);

    // Notify error handlers
    this.notifyErrorHandlers(signMateError);

    // Report error if enabled
    if (this.config.enableErrorReporting) {
      await this.reportError(signMateError);
    }

    // Attempt recovery if enabled
    if (this.config.enableAutoRecovery && signMateError.recoverable) {
      return await this.attemptRecovery(signMateError);
    }

    return {
      success: false,
      strategy: 'escalate',
      shouldRetry: false,
      message: 'Auto-recovery disabled or error not recoverable',
    };
  }

  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(error: SignMateError): Promise<RecoveryResult> {
    const handler = this.recoveryHandlers.get(error.category);

    if (!handler) {
      return {
        success: false,
        strategy: 'escalate',
        shouldRetry: false,
        message: 'No recovery handler for this error category',
      };
    }

    error.recoveryAttempts++;

    try {
      const result = await handler(error);

      // Notify recovery handlers
      this.config.onRecovery?.(error, result);

      return result;
    } catch (recoveryError) {
      console.error('[ErrorRecovery] Recovery attempt failed:', recoveryError);
      return {
        success: false,
        strategy: 'escalate',
        shouldRetry: false,
        message: 'Recovery handler threw an error',
      };
    }
  }

  /**
   * Add error to history
   */
  private addToHistory(error: SignMateError): void {
    this.errors.push(error);

    // Trim history if needed
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }
  }

  /**
   * Notify all registered error handlers
   */
  private notifyErrorHandlers(error: SignMateError): void {
    this.config.onError?.(error);
    this.errorHandlers.forEach((handler) => handler(error));
  }

  /**
   * Report error to external service
   */
  private async reportError(error: SignMateError): Promise<void> {
    if (!this.config.errorReportingEndpoint) return;

    try {
      await fetch(this.config.errorReportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...error,
          originalError: undefined, // Don't serialize the Error object
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        }),
      });
    } catch (reportError) {
      console.error('[ErrorRecovery] Failed to report error:', reportError);
    }
  }

  /**
   * Register a custom recovery handler for a category
   */
  setRecoveryHandler(category: ErrorCategory, handler: RecoveryHandler): void {
    this.recoveryHandlers.set(category, handler);
  }

  /**
   * Register an error handler
   */
  addErrorHandler(handler: ErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Get error history
   */
  getErrorHistory(): SignMateError[] {
    return [...this.errors];
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): SignMateError[] {
    return this.errors.filter((e) => e.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): SignMateError[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  /**
   * Get recent errors (last N minutes)
   */
  getRecentErrors(minutes: number = 5): SignMateError[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.errors.filter((e) => e.timestamp > cutoff);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errors = [];
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recoverySuccessRate: number;
  } {
    const byCategory = {} as Record<ErrorCategory, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;

    this.errors.forEach((error) => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: this.errors.length,
      byCategory,
      bySeverity,
      recoverySuccessRate: 0, // Would need to track successful recoveries
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorRecoveryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
let errorRecoveryManager: ErrorRecoveryManager | null = null;

/**
 * Get the singleton ErrorRecoveryManager instance
 */
export function getErrorRecoveryManager(): ErrorRecoveryManager {
  if (!errorRecoveryManager) {
    errorRecoveryManager = new ErrorRecoveryManager();
  }
  return errorRecoveryManager;
}

/**
 * Create a new ErrorRecoveryManager with custom config
 */
export function createErrorRecoveryManager(
  config?: Partial<ErrorRecoveryConfig>
): ErrorRecoveryManager {
  errorRecoveryManager = new ErrorRecoveryManager(config);
  return errorRecoveryManager;
}

/**
 * Utility to wrap async functions with error handling
 */
export function withErrorRecovery<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: Record<string, unknown>
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const manager = getErrorRecoveryManager();
      const result = await manager.handleError(error as Error, {
        ...context,
        functionName: fn.name,
        arguments: args,
      });

      if (result.shouldRetry && result.nextDelay) {
        await new Promise((resolve) => setTimeout(resolve, result.nextDelay));
        return await fn(...args);
      }

      throw error;
    }
  }) as T;
}
