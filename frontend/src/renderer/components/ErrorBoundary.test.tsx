/**
 * Unit tests for ErrorBoundary component
 * Requirements: 14.1-14.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { LoggingService } from '../services/LoggingService';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error from component');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Clear logs before each test
    LoggingService.clearLogs();
    
    // Mock console.error to avoid cluttering test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Normal Rendering', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors from child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should display error dialog instead of crashing
      expect(screen.getByText('予期しないエラー')).toBeInTheDocument();
    });

    it('should log errors when caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const logs = LoggingService.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].message).toContain('Test error from component');
    });

    it('should log component stack trace', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const logs = LoggingService.getLogs();
      expect(logs[0].context?.componentStack).toBeDefined();
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const fallback = <div>Custom error fallback</div>;
      
      render(
        <ErrorBoundary fallback={fallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should display error dialog with close button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('閉じる')).toBeInTheDocument();
    });

    it('should display retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Isolation', () => {
    it('should not affect sibling components', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <div>Sibling component</div>
        </div>
      );
      
      // Sibling should still render
      expect(screen.getByText('Sibling component')).toBeInTheDocument();
    });
  });
});
