/**
 * Error Boundary Component
 * Catches and handles React component errors globally
 * Requirements: 14.1-14.5, 19.1-19.5
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { LoggingService } from '../services/LoggingService';
import { ErrorDialog } from './ErrorDialog';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches unhandled errors in React component tree
 * Requirement 14.1: Log all errors with stack traces
 * Requirement 14.5: Preserve application state during errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details when caught
   * Requirement 14.1: Log all errors with stack traces
   * Requirement 19.3: Log all validation warnings and errors
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error with full context
    LoggingService.error(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'Global',
    });

  }

  /**
   * Handle error dialog close
   */
  private handleClose = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  /**
   * Handle retry action
   * Requirement 14.2: Allow User to retry failed operations
   */
  private handleRetry = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
    });

    // Reload the page as a fallback
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, show the error dialog
      return (
        <ErrorDialog
          error={this.state.error}
          onClose={this.handleClose}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
