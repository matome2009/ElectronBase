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
/** wagmi/web3modal の既知の内部エラーかどうかを判定する */
function isWagmiInternalError(error: Error): boolean {
  const msg = error.message ?? '';
  return (
    // V8 (Chrome/Electron)
    msg.includes('Cannot convert undefined or null to object') ||
    // JavaScriptCore (Tauri on macOS / Safari)
    msg.includes("undefined is not an object (evaluating 'Object.keys(") ||
    msg.includes("null is not an object (evaluating 'Object.keys(")
  );
}

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

      // wagmi/web3modal内部の無害なエラーを無視
      // V8:           "Cannot convert undefined or null to object"
      // JavaScriptCore(Tauri/Safari): "undefined is not an object (evaluating 'Object.keys(e)')"
      if (isWagmiInternalError(error)) {
        LoggingService.warn('wagmi接続時の無害なエラーを無視', { message: error.message });
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

      // クロスオリジンスクリプトエラーを無視
      // 外部ドメイン（Google/Firebase等）のスクリプトエラーはブラウザが詳細を隠し
      // "Script error." として通知される（filename="", lineno=0, colno=0, error=null）
      if (event.error === null && event.lineno === 0 && event.colno === 0) {
        LoggingService.warn('クロスオリジンスクリプトエラーを無視', { message: event.message });
        return;
      }

      const error = event.error instanceof Error ? event.error : new Error(event.message);

      // wagmi/web3modal内部の無害なエラーを無視
      if (isWagmiInternalError(error)) {
        LoggingService.warn('wagmi接続時の無害なエラーを無視', { message: error.message });
        return;
      }

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
