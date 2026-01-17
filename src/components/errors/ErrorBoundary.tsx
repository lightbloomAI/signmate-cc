'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  getErrorRecoveryManager,
  type SignMateError,
  type RecoveryResult,
} from '@/lib/errors/errorRecovery';

/**
 * Error Boundary Props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: SignMateError, retry: () => void) => ReactNode);
  onError?: (error: SignMateError, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  name?: string;
  showDetails?: boolean;
  allowRetry?: boolean;
}

/**
 * Error Boundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: SignMateError | null;
  recoveryResult: RecoveryResult | null;
  retryCount: number;
}

/**
 * Error Boundary Component
 *
 * Catches React rendering errors and displays a fallback UI.
 * Integrates with the ErrorRecoveryManager for error tracking and recovery.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorManager = getErrorRecoveryManager();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      recoveryResult: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo): Promise<void> {
    const signMateError = this.errorManager.createError(error, {
      componentStack: errorInfo.componentStack,
      boundaryName: this.props.name,
    }, {
      category: 'rendering',
    });

    const recoveryResult = await this.errorManager.handleError(signMateError, {
      componentStack: errorInfo.componentStack,
    });

    this.setState({ error: signMateError, recoveryResult });
    this.props.onError?.(signMateError, errorInfo);
  }

  handleRetry = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      recoveryResult: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleRetry);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          recoveryResult={this.state.recoveryResult}
          onRetry={this.props.allowRetry !== false ? this.handleRetry : undefined}
          showDetails={this.props.showDetails}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface DefaultErrorFallbackProps {
  error: SignMateError;
  recoveryResult: RecoveryResult | null;
  onRetry?: () => void;
  showDetails?: boolean;
  retryCount?: number;
}

function DefaultErrorFallback({
  error,
  recoveryResult,
  onRetry,
  showDetails = false,
  retryCount = 0,
}: DefaultErrorFallbackProps): JSX.Element {
  const severityColors = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-400 text-red-900',
  };

  const severityIcons = {
    low: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    medium: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    high: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    critical: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${severityColors[error.severity]}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {severityIcons[error.severity]}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-2">
            Something went wrong
          </h3>

          <p className="mb-4">
            {error.message || 'An unexpected error occurred in this section.'}
          </p>

          {recoveryResult && (
            <p className="text-sm mb-4 opacity-80">
              {recoveryResult.message}
            </p>
          )}

          <div className="flex items-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-current rounded-lg font-medium hover:opacity-80 transition-opacity"
              >
                Try Again {retryCount > 0 && `(${retryCount})`}
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-transparent border border-current/50 rounded-lg font-medium hover:bg-current/10 transition-colors"
            >
              Reload Page
            </button>
          </div>

          {showDetails && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium hover:underline">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-white/50 dark:bg-black/20 rounded text-sm font-mono overflow-x-auto">
                <p><strong>Error ID:</strong> {error.id}</p>
                <p><strong>Category:</strong> {error.category}</p>
                <p><strong>Severity:</strong> {error.severity}</p>
                <p><strong>Code:</strong> {error.code || 'N/A'}</p>
                <p><strong>Time:</strong> {new Date(error.timestamp).toISOString()}</p>
                {error.stack && (
                  <pre className="mt-2 whitespace-pre-wrap text-xs opacity-70">
                    {error.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Specialized Error Boundary for the Avatar Component
 */
export function AvatarErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      name="Avatar"
      fallback={(error, retry) => (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8">
          <svg className="w-16 h-16 text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Avatar Unavailable</h3>
          <p className="text-gray-400 text-center mb-4">
            The 3D avatar encountered an error and cannot be displayed.
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Pipeline Components
 */
export function PipelineErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      name="Pipeline"
      allowRetry={true}
      fallback={(error, retry) => (
        <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-red-300 font-medium">Pipeline Error</span>
          </div>
          <p className="text-red-200 text-sm mb-3">{error.message}</p>
          <button
            onClick={retry}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Restart Pipeline
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Specialized Error Boundary for Caption Display
 */
export function CaptionErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      name="Captions"
      fallback={
        <div className="p-4 bg-gray-800/80 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Captions temporarily unavailable</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Root Error Boundary for the entire application
 */
export function RootErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      name="Root"
      showDetails={process.env.NODE_ENV === 'development'}
      fallback={(error, retry) => (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-gray-900 rounded-xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-white mb-3">
              SignMate Encountered an Error
            </h1>

            <p className="text-gray-400 mb-6">
              We apologize for the inconvenience. The application encountered an unexpected error.
            </p>

            <div className="space-y-3">
              <button
                onClick={retry}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              >
                Reload Application
              </button>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-6 py-3 bg-transparent border border-gray-700 hover:border-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              Error ID: {error.id}
            </p>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
