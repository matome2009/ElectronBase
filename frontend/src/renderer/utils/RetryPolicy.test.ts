/**
 * Unit tests for RetryPolicy
 * 
 * **Validates: Requirements 14.4**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RetryPolicy,
  defaultBlockchainRetryPolicy,
  defaultApiRetryPolicy,
} from './RetryPolicy';
import {
  BlockchainConnectionException,
  TransactionFailedException,
} from '../exceptions';

describe('RetryPolicy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default values when no options provided', () => {
      const policy = new RetryPolicy();
      expect(policy).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const policy = new RetryPolicy({
        maxRetries: 5,
        initialDelayMs: 2000,
        backoffMultiplier: 3.0,
      });
      expect(policy).toBeDefined();
    });
  });

  describe('execute - success cases', () => {
    it('should return result on first successful attempt', async () => {
      const policy = new RetryPolicy();
      const operation = vi.fn().mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should return result after one retry', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      
      // Fast-forward through the delay
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should return result after multiple retries', async () => {
      const policy = new RetryPolicy({ maxRetries: 3, initialDelayMs: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      
      // Fast-forward through delays
      await vi.advanceTimersByTimeAsync(100); // First retry
      await vi.advanceTimersByTimeAsync(200); // Second retry (exponential backoff)
      
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('execute - failure cases', () => {
    it('should throw error after max retries exhausted', async () => {
      // Use real timers for this test to avoid timing issues
      vi.useRealTimers();
      
      const policy = new RetryPolicy({ maxRetries: 2, initialDelayMs: 10 });
      const error = new Error('timeout');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(policy.execute(operation)).rejects.toThrow('timeout');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should not retry on non-retryable errors', async () => {
      const policy = new RetryPolicy();
      const error = new TransactionFailedException('0x123', 'Transaction failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(policy.execute(operation)).rejects.toThrow('Transaction failed');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should throw immediately on validation errors', async () => {
      const policy = new RetryPolicy();
      const error = new Error('Invalid input');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(policy.execute(operation)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('exponential backoff', () => {
    it('should apply exponential backoff between retries', async () => {
      const policy = new RetryPolicy({
        maxRetries: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2.0,
      });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      
      // First retry: 100ms
      await vi.advanceTimersByTimeAsync(100);
      expect(operation).toHaveBeenCalledTimes(2);
      
      // Second retry: 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200);
      expect(operation).toHaveBeenCalledTimes(3);
      
      // Third retry: 400ms (200 * 2)
      await vi.advanceTimersByTimeAsync(400);
      expect(operation).toHaveBeenCalledTimes(4);

      const result = await promise;
      expect(result).toBe('success');
    });

    it('should use custom backoff multiplier', async () => {
      const policy = new RetryPolicy({
        maxRetries: 2,
        initialDelayMs: 100,
        backoffMultiplier: 3.0,
      });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      
      // First retry: 100ms
      await vi.advanceTimersByTimeAsync(100);
      
      // Second retry: 300ms (100 * 3)
      await vi.advanceTimersByTimeAsync(300);

      const result = await promise;
      expect(result).toBe('success');
    });
  });

  describe('retryable error detection', () => {
    it('should retry on BlockchainConnectionException', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new BlockchainConnectionException('http://localhost:8545', new Error('Connection refused')))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on fetch errors', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit errors (429)', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 100 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on server errors (502, 503, 504)', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 100 });
      
      // Test 502
      const operation502 = vi
        .fn()
        .mockRejectedValueOnce(new Error('502 Bad Gateway'))
        .mockResolvedValueOnce('success');
      
      let promise = policy.execute(operation502);
      await vi.advanceTimersByTimeAsync(100);
      expect(await promise).toBe('success');

      // Test 503
      const operation503 = vi
        .fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce('success');
      
      promise = policy.execute(operation503);
      await vi.advanceTimersByTimeAsync(100);
      expect(await promise).toBe('success');

      // Test 504
      const operation504 = vi
        .fn()
        .mockRejectedValueOnce(new Error('504 Gateway Timeout'))
        .mockResolvedValueOnce('success');
      
      promise = policy.execute(operation504);
      await vi.advanceTimersByTimeAsync(100);
      expect(await promise).toBe('success');
    });
  });

  describe('custom shouldRetry predicate', () => {
    it('should use custom retry logic', async () => {
      const customShouldRetry = (error: Error) => error.message.includes('CUSTOM');
      const policy = new RetryPolicy({
        initialDelayMs: 100,
        shouldRetry: customShouldRetry,
      });

      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('CUSTOM error'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry when custom predicate returns false', async () => {
      const customShouldRetry = () => false;
      const policy = new RetryPolicy({
        shouldRetry: customShouldRetry,
      });

      const operation = vi.fn().mockRejectedValue(new Error('Any error'));

      await expect(policy.execute(operation)).rejects.toThrow('Any error');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancellation support', () => {
    it('should cancel operation when signal is aborted', async () => {
      // Use real timers for this test
      vi.useRealTimers();
      
      const policy = new RetryPolicy({ initialDelayMs: 50 });
      const abortController = new AbortController();
      const operation = vi.fn().mockRejectedValue(new Error('timeout'));

      const promise = policy.execute(operation, abortController.signal);
      
      // Abort after a short delay
      setTimeout(() => abortController.abort(), 25);

      await expect(promise).rejects.toThrow('Operation cancelled');
      
      // Restore fake timers
      vi.useFakeTimers();
    });

    it('should not start operation if already cancelled', async () => {
      const policy = new RetryPolicy();
      const abortController = new AbortController();
      abortController.abort();

      const operation = vi.fn().mockResolvedValue('success');

      await expect(
        policy.execute(operation, abortController.signal)
      ).rejects.toThrow('Operation cancelled');
      
      expect(operation).not.toHaveBeenCalled();
    });
  });

  describe('default policy instances', () => {
    it('should provide default blockchain retry policy', () => {
      expect(defaultBlockchainRetryPolicy).toBeDefined();
      expect(defaultBlockchainRetryPolicy).toBeInstanceOf(RetryPolicy);
    });

    it('should provide default API retry policy', () => {
      expect(defaultApiRetryPolicy).toBeDefined();
      expect(defaultApiRetryPolicy).toBeInstanceOf(RetryPolicy);
    });
  });

  describe('edge cases', () => {
    it('should handle non-Error objects thrown', async () => {
      const policy = new RetryPolicy();
      const operation = vi.fn().mockRejectedValue('string error');

      await expect(policy.execute(operation)).rejects.toThrow('string error');
    });

    it('should handle zero max retries', async () => {
      const policy = new RetryPolicy({ maxRetries: 0 });
      const operation = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(policy.execute(operation)).rejects.toThrow('fail');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle very small initial delay', async () => {
      const policy = new RetryPolicy({ initialDelayMs: 1 });
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce('success');

      const promise = policy.execute(operation);
      await vi.advanceTimersByTimeAsync(1);
      const result = await promise;

      expect(result).toBe('success');
    });
  });
});
