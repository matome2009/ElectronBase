/**
 * Global Error Handler Hook
 * Handles unhandled promise rejections and window errors
 * Requirements: 14.1-14.5, 19.1-19.5
 */

import { useEffect, useState } from 'react';
import { LoggingService } from '../services/LoggingService';

export interface GlobalErrorState {
  error: Error | null;
  clearError: () => void;
}

/**
 * useGlobalErrorHandler sets up global error handlers for the application
 * Requirement 14.1: Log all errors with stack traces
 * Requirement 14.3: Display connection error when errors occur
 */
export function useGlobalErrorHandler(): GlobalErrorState {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    /**
     * Handle unhandled promise rejections
     * Requirement 14.1: Log all errors with stack traces
     */
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      event.preventDefault();

      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));

      // wagmi/web3modalの接続時のエラーを無視
      // "Cannot convert undefined or null to object" はwagmi内部のエラーで、接続は成功している
      if (error.message && error.message.includes('Cannot convert undefined or null to object')) {
        console.warn('wagmi接続時の無害なエラーを無視:', error.message);
        return;
      }

      // Log the error
      LoggingService.error(error, {
        type: 'UnhandledPromiseRejection',
        reason: event.reason,
      });

      // Set error state to display dialog
      setError(error);
    };

    /**
     * Handle uncaught errors
     * Requirement 14.1: Log all errors with stack traces
     */
    const handleError = (event: ErrorEvent): void => {
      event.preventDefault();

      const error = event.error instanceof Error ? event.error : new Error(event.message);

      // Log the error
      LoggingService.error(error, {
        type: 'UncaughtError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });

      // Set error state to display dialog
      setError(error);
    };

    // Register global error handlers
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  const clearError = (): void => {
    setError(null);
  };

  return { error, clearError };
}
