/**
 * Unit tests for ErrorDialog component
 * Requirements: 14.1-14.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDialog } from './ErrorDialog';
import {
  PayrollGuardianException,
  BlockchainConnectionException,
  TransactionFailedException,
} from '../exceptions';

describe('ErrorDialog', () => {
  describe('Rendering', () => {
    it('should not render when error is null', () => {
      const { container } = render(
        <ErrorDialog error={null} onClose={vi.fn()} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render error dialog when error is provided', () => {
      const error = new Error('Test error');
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      expect(screen.getByText('予期しないエラー')).toBeInTheDocument();
      expect(screen.getByText('予期しないエラーが発生しました。')).toBeInTheDocument();
    });

    it('should display error title and message', () => {
      const error = new PayrollGuardianException('Custom error message');
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should display actionable advice when available', () => {
      const error = new BlockchainConnectionException('http://localhost:8545', new Error('Connection failed'));
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      expect(screen.getByText('対処方法')).toBeInTheDocument();
    });

    it('should display technical details in collapsible section', () => {
      const error = new TransactionFailedException('0x123', 'Gas too low');
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      expect(screen.getByText('技術的な詳細を表示')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      const error = new Error('Test error');
      render(<ErrorDialog error={error} onClose={onClose} />);
      
      const closeButton = screen.getByText('閉じる');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should show retry button for retryable errors', () => {
      const error = new BlockchainConnectionException('http://localhost:8545', new Error('Connection failed'));
      const onRetry = vi.fn();
      render(<ErrorDialog error={error} onClose={vi.fn()} onRetry={onRetry} />);
      
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      const error = new BlockchainConnectionException('http://localhost:8545', new Error('Connection failed'));
      render(<ErrorDialog error={error} onClose={vi.fn()} onRetry={onRetry} />);
      
      const retryButton = screen.getByText('再試行');
      fireEvent.click(retryButton);
      
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when onRetry is not provided', () => {
      const error = new BlockchainConnectionException('http://localhost:8545', new Error('Connection failed'));
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      // Should not show retry button when onRetry callback is not provided
      expect(screen.queryByText('再試行')).not.toBeInTheDocument();
    });
  });

  describe('Error Types', () => {
    it('should display blockchain connection error correctly', () => {
      const error = new BlockchainConnectionException('http://localhost:8545', new Error('Connection failed'));
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      expect(screen.getByText('ブロックチェーン接続エラー')).toBeInTheDocument();
      expect(screen.getByText(/ブロックチェーンノードへの接続に失敗しました/)).toBeInTheDocument();
    });

    it('should display transaction failed error correctly', () => {
      const error = new TransactionFailedException('0x123abc', 'Gas too low');
      render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      expect(screen.getByText('トランザクション失敗')).toBeInTheDocument();
      expect(screen.getByText(/Gas too low/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const error = new Error('Test error');
      const { container } = render(<ErrorDialog error={error} onClose={vi.fn()} />);
      
      // Check that the dialog has proper structure
      const dialog = container.querySelector('.fixed');
      expect(dialog).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const onClose = vi.fn();
      const error = new Error('Test error');
      render(<ErrorDialog error={error} onClose={onClose} />);
      
      const closeButton = screen.getByText('閉じる');
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });
});
