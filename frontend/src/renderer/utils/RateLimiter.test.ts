/**
 * Unit tests for RateLimiter
 *
 * Tests rate limiting functionality including:
 * - Basic rate limiting behavior
 * - Sliding window algorithm
 * - Concurrent request handling
 * - Configuration validation
 * - Statistics and monitoring
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, defaultBlockchainRateLimiter, defaultApiRateLimiter } from './RateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create with default max requests per minute (60)', () => {
      const limiter = new RateLimiter();
      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(60);
    });

    it('should create with custom max requests per minute', () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 30 });
      const stats = limiter.getStats();
      expect(stats.maxRequests).toBe(30);
    });

    it('should throw error if maxRequestsPerMinute is zero', () => {
      expect(() => new RateLimiter({ maxRequestsPerMinute: 0 })).toThrow(
        'maxRequestsPerMinute must be greater than 0'
      );
    });

    it('should throw error if maxRequestsPerMinute is negative', () => {
      expect(() => new RateLimiter({ maxRequestsPerMinute: -10 })).toThrow(
        'maxRequestsPerMinute must be greater than 0'
      );
    });
  });

  describe('execute', () => {
    it('should execute operation immediately when under rate limit', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      const operation = vi.fn().mockResolvedValue('success');

      const result = await limiter.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple operations when under rate limit', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      const operation = vi.fn().mockResolvedValue('success');

      const results = await Promise.all([
        limiter.execute(operation),
        limiter.execute(operation),
        limiter.execute(operation),
      ]);

      expect(results).toEqual(['success', 'success', 'success']);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should wait when rate limit is reached', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 2 });
      const operation = vi.fn().mockResolvedValue('success');

      // Execute 2 requests (at limit)
      await limiter.execute(operation);
      await limiter.execute(operation);

      // Third request should wait
      const thirdRequest = limiter.execute(operation);

      // Advance time by 30 seconds (not enough)
      await vi.advanceTimersByTimeAsync(30000);
      expect(operation).toHaveBeenCalledTimes(2);

      // Advance time by another 30 seconds (total 60 seconds)
      await vi.advanceTimersByTimeAsync(30000);
      await thirdRequest;

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should implement sliding window correctly', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 3 });
      const operation = vi.fn().mockResolvedValue('success');

      // Execute 3 requests at t=0
      await limiter.execute(operation);
      await limiter.execute(operation);
      await limiter.execute(operation);

      expect(operation).toHaveBeenCalledTimes(3);

      // Advance time by 40 seconds
      await vi.advanceTimersByTimeAsync(40000);

      // Fourth request should still wait (oldest request is only 40s old)
      const fourthRequest = limiter.execute(operation);
      await vi.advanceTimersByTimeAsync(0);
      expect(operation).toHaveBeenCalledTimes(3);

      // Advance time by another 20 seconds (total 60s from first request)
      await vi.advanceTimersByTimeAsync(20000);
      await fourthRequest;

      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should handle operation errors correctly', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(limiter.execute(operation)).rejects.toThrow('Operation failed');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should continue rate limiting after operation error', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 2 });
      const failingOp = vi.fn().mockRejectedValue(new Error('Failed'));
      const successOp = vi.fn().mockResolvedValue('success');

      // First request fails
      await expect(limiter.execute(failingOp)).rejects.toThrow('Failed');

      // Second request succeeds
      await limiter.execute(successOp);

      // Third request should wait (rate limit still applies)
      const thirdRequest = limiter.execute(successOp);
      await vi.advanceTimersByTimeAsync(0);
      expect(successOp).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(60000);
      await thirdRequest;
      expect(successOp).toHaveBeenCalledTimes(2);
    });

    it('should return operation result correctly', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      
      const result1 = await limiter.execute(async () => 42);
      const result2 = await limiter.execute(async () => 'hello');
      const result3 = await limiter.execute(async () => ({ data: 'test' }));

      expect(result1).toBe(42);
      expect(result2).toBe('hello');
      expect(result3).toEqual({ data: 'test' });
    });
  });

  describe('getStats', () => {
    it('should return correct initial stats', () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 60 });
      const stats = limiter.getStats();

      expect(stats.requestsInWindow).toBe(0);
      expect(stats.maxRequests).toBe(60);
      expect(stats.availableSlots).toBe(60);
      expect(stats.oldestRequestAge).toBeNull();
    });

    it('should return correct stats after requests', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      const operation = vi.fn().mockResolvedValue('success');

      await limiter.execute(operation);
      await limiter.execute(operation);
      await limiter.execute(operation);

      const stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(3);
      expect(stats.maxRequests).toBe(10);
      expect(stats.availableSlots).toBe(7);
      expect(stats.oldestRequestAge).toBeGreaterThanOrEqual(0);
    });

    it('should update stats as requests expire from window', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 5 });
      const operation = vi.fn().mockResolvedValue('success');

      await limiter.execute(operation);
      await limiter.execute(operation);

      // Advance time by 61 seconds (requests should expire)
      await vi.advanceTimersByTimeAsync(61000);

      const stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(0);
      expect(stats.availableSlots).toBe(5);
      expect(stats.oldestRequestAge).toBeNull();
    });

    it('should show correct oldest request age', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 10 });
      const operation = vi.fn().mockResolvedValue('success');

      await limiter.execute(operation);
      await vi.advanceTimersByTimeAsync(5000);

      const stats = limiter.getStats();
      expect(stats.oldestRequestAge).toBeGreaterThanOrEqual(5000);
      expect(stats.oldestRequestAge).toBeLessThan(6000);
    });
  });

  describe('reset', () => {
    it('should clear all request history', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 5 });
      const operation = vi.fn().mockResolvedValue('success');

      await limiter.execute(operation);
      await limiter.execute(operation);
      await limiter.execute(operation);

      let stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(3);

      limiter.reset();

      stats = limiter.getStats();
      expect(stats.requestsInWindow).toBe(0);
      expect(stats.availableSlots).toBe(5);
    });

    it('should allow immediate requests after reset', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 2 });
      const operation = vi.fn().mockResolvedValue('success');

      // Fill the rate limit
      await limiter.execute(operation);
      await limiter.execute(operation);

      // Reset
      limiter.reset();

      // Should be able to execute immediately
      await limiter.execute(operation);
      await limiter.execute(operation);

      expect(operation).toHaveBeenCalledTimes(4);
    });
  });

  describe('concurrent requests', () => {
    it('should handle concurrent requests correctly', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 5 });
      const operation = vi.fn().mockResolvedValue('success');

      // Start 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => limiter.execute(operation));

      // First 5 should execute immediately
      await vi.advanceTimersByTimeAsync(0);
      expect(operation).toHaveBeenCalledTimes(5);

      // Advance time to allow remaining requests
      await vi.advanceTimersByTimeAsync(60000);
      await Promise.all(promises);

      expect(operation).toHaveBeenCalledTimes(10);
    });

    it('should maintain rate limit with concurrent requests', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 3 });
      let executionCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        executionCount++;
        return 'success';
      });

      // Start 6 concurrent requests
      const promises = Array.from({ length: 6 }, () => limiter.execute(operation));

      // Check that only 3 execute initially
      await vi.advanceTimersByTimeAsync(0);
      expect(executionCount).toBe(3);

      // Advance time and check remaining execute
      await vi.advanceTimersByTimeAsync(60000);
      await Promise.all(promises);
      expect(executionCount).toBe(6);
    });
  });

  describe('default instances', () => {
    it('should provide default blockchain rate limiter', () => {
      expect(defaultBlockchainRateLimiter).toBeDefined();
      expect(defaultBlockchainRateLimiter).toBeInstanceOf(RateLimiter);
      
      const stats = defaultBlockchainRateLimiter.getStats();
      expect(stats.maxRequests).toBe(60);
    });

    it('should provide default API rate limiter', () => {
      expect(defaultApiRateLimiter).toBeDefined();
      expect(defaultApiRateLimiter).toBeInstanceOf(RateLimiter);
      
      const stats = defaultApiRateLimiter.getStats();
      expect(stats.maxRequests).toBe(30);
    });
  });

  describe('edge cases', () => {
    it('should handle very high rate limits', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 1000 });
      const operation = vi.fn().mockResolvedValue('success');

      const promises = Array.from({ length: 100 }, () => limiter.execute(operation));
      await Promise.all(promises);

      expect(operation).toHaveBeenCalledTimes(100);
    });

    it('should handle rate limit of 1', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 1 });
      const operation = vi.fn().mockResolvedValue('success');

      await limiter.execute(operation);
      
      const secondRequest = limiter.execute(operation);
      await vi.advanceTimersByTimeAsync(0);
      expect(operation).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(60000);
      await secondRequest;
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple sequential operations', async () => {
      const limiter = new RateLimiter({ maxRequestsPerMinute: 5 });
      let completedCount = 0;
      
      const operation = vi.fn().mockImplementation(async () => {
        completedCount++;
        return 'success';
      });

      const promises = Array.from({ length: 3 }, () => limiter.execute(operation));
      
      await Promise.all(promises);

      expect(completedCount).toBe(3);
    });
  });
});
