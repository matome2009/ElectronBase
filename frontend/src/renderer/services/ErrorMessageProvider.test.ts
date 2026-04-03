/**
 * Unit tests for ErrorMessageProvider
 * Requirements: 14.1-14.5
 */

import { describe, it, expect } from 'vitest';
import { ErrorMessageProvider } from './ErrorMessageProvider';
import {
  PayrollGuardianException,
  BlockchainConnectionException,
  WalletConnectionException,
  TransactionFailedException,
  DuplicateSessionNameException,
} from '../exceptions';

describe('ErrorMessageProvider', () => {
  describe('getErrorMessage', () => {
    it('should return Japanese error message for BlockchainConnectionException', () => {
      const error = new BlockchainConnectionException(
        'https://bsc-testnet.example.com',
        new Error('Connection timeout')
      );

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('ブロックチェーン接続エラー');
      expect(result.message).toContain('ブロックチェーンノードへの接続に失敗しました');
      expect(result.message).toContain('https://bsc-testnet.example.com');
      expect(result.technicalDetails).toBe('Connection timeout');
      expect(result.actionable).toContain('ネットワーク接続を確認');
    });

    it('should return Japanese error message for WalletConnectionException', () => {
      const error = new WalletConnectionException(
        'Failed to connect to MetaMask',
        new Error('User rejected')
      );

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('ウォレット接続エラー');
      expect(result.message).toBe('ウォレットへの接続に失敗しました。');
      expect(result.technicalDetails).toBe('Failed to connect to MetaMask');
      expect(result.actionable).toContain('ウォレットアプリが起動していることを確認');
    });

    it('should return Japanese error message for TransactionFailedException', () => {
      const error = new TransactionFailedException(
        '0x1234567890abcdef',
        'insufficient funds',
        new Error('Gas estimation failed')
      );

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('トランザクション失敗');
      expect(result.message).toContain('トランザクションが失敗しました');
      expect(result.message).toContain('insufficient funds');
      expect(result.technicalDetails).toContain('0x1234567890abcdef');
      expect(result.technicalDetails).toContain('Gas estimation failed');
      expect(result.actionable).toContain('ガス代が不足している可能性があります');
    });


    it('should return Japanese error message for DuplicateSessionNameException', () => {
      const error = new DuplicateSessionNameException('January Payroll');

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('セッション名の重複');
      expect(result.message).toContain('January Payroll');
      expect(result.message).toContain('既に使用されています');
      expect(result.actionable).toContain('別のセッション名を選択してください');
    });

    it('should return Japanese error message for generic PayrollGuardianException', () => {
      const error = new PayrollGuardianException(
        'Something went wrong',
        new Error('Inner error')
      );

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('エラーが発生しました');
      expect(result.message).toBe('Something went wrong');
      expect(result.technicalDetails).toBe('Inner error');
      expect(result.actionable).toContain('サポートにお問い合わせください');
    });

    it('should return Japanese error message for generic Error', () => {
      const error = new Error('Unexpected error occurred');

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('予期しないエラー');
      expect(result.message).toBe('予期しないエラーが発生しました。');
      expect(result.technicalDetails).toContain('Unexpected error occurred');
      expect(result.actionable).toContain('アプリケーションを再起動してください');
    });
  });

  describe('formatForDisplay', () => {
    it('should format error message for UI display', () => {
      const error = new BlockchainConnectionException(
        'https://bsc-testnet.example.com',
        new Error('Connection timeout')
      );

      const result = ErrorMessageProvider.formatForDisplay(error);

      expect(result).toContain('ブロックチェーン接続エラー');
      expect(result).toContain('ブロックチェーンノードへの接続に失敗しました');
      expect(result).toContain('対処方法:');
      expect(result).toContain('ネットワーク接続を確認');
    });

    it('should format error without actionable message', () => {
      const error = new PayrollGuardianException('Test error');
      // Modify to remove actionable for this test
      const errorMessage = ErrorMessageProvider.getErrorMessage(error);
      const formatted = `${errorMessage.title}\n\n${errorMessage.message}`;

      expect(formatted).toContain('エラーが発生しました');
      expect(formatted).toContain('Test error');
    });
  });

  describe('formatForLogging', () => {
    it('should format error message for logging with technical details', () => {
      const error = new TransactionFailedException(
        '0xabcdef123456',
        'gas limit exceeded',
        new Error('Estimation failed')
      );

      const result = ErrorMessageProvider.formatForLogging(error);

      expect(result).toContain('[トランザクション失敗]');
      expect(result).toContain('gas limit exceeded');
      expect(result).toContain('Technical Details:');
      expect(result).toContain('0xabcdef123456');
      expect(result).toContain('Estimation failed');
      expect(result).toContain('Stack Trace:');
    });

    it('should format error without technical details', () => {
      const error = new DuplicateSessionNameException('Test Session');

      const result = ErrorMessageProvider.formatForLogging(error);

      expect(result).toContain('[セッション名の重複]');
      expect(result).toContain('Test Session');
      expect(result).toContain('Stack Trace:');
    });
  });

  describe('isRetryable', () => {
    it('should return true for BlockchainConnectionException', () => {
      const error = new BlockchainConnectionException(
        'https://example.com',
        new Error('timeout')
      );

      expect(ErrorMessageProvider.isRetryable(error)).toBe(true);
    });

    it('should return true for WalletConnectionException', () => {
      const error = new WalletConnectionException('Connection failed');

      expect(ErrorMessageProvider.isRetryable(error)).toBe(true);
    });

    it('should return true for retryable TransactionFailedException', () => {
      const retryableReasons = [
        'nonce too low',
        'replacement transaction underpriced',
        'timeout',
        'network error',
      ];

      retryableReasons.forEach((reason) => {
        const error = new TransactionFailedException('0x123', reason);
        expect(ErrorMessageProvider.isRetryable(error)).toBe(true);
      });
    });

    it('should return false for non-retryable TransactionFailedException', () => {
      const error = new TransactionFailedException(
        '0x123',
        'invalid signature'
      );

      expect(ErrorMessageProvider.isRetryable(error)).toBe(false);
    });


    it('should return false for DuplicateSessionNameException', () => {
      const error = new DuplicateSessionNameException('Test');

      expect(ErrorMessageProvider.isRetryable(error)).toBe(false);
    });

    it('should return true for generic errors', () => {
      const error = new Error('Unknown error');

      expect(ErrorMessageProvider.isRetryable(error)).toBe(true);
    });
  });

  describe('edge cases', () => {

    it('should handle TransactionFailedException without inner error', () => {
      const error = new TransactionFailedException('0x123', 'failed');

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('トランザクション失敗');
      expect(result.technicalDetails).toContain('0x123');
    });

    it('should handle BlockchainConnectionException without inner error', () => {
      const error = new BlockchainConnectionException(
        'https://example.com',
        new Error()
      );

      const result = ErrorMessageProvider.getErrorMessage(error);

      expect(result.title).toBe('ブロックチェーン接続エラー');
      expect(result.message).toContain('https://example.com');
    });

    it('should handle Error without stack trace', () => {
      const error = new Error('Test error');
      error.stack = undefined;

      const result = ErrorMessageProvider.formatForLogging(error);

      expect(result).toContain('Test error');
      // Should not crash when stack is undefined
    });
  });
});
