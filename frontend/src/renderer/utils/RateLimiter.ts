/**
 * RateLimiter - Token bucket rate limiting for external API calls
 *
 * Provides configurable rate limiting to prevent overwhelming external services:
 * - Blockchain queries (Web3 RPC calls)
 * - API calls (CoinGecko, Google Sheets)
 * - Any external network operations
 *
 * **Validates: Requirements 2.3**
 */

/**
 * Configuration options for RateLimiter
 */
export interface RateLimiterOptions {
  /** Maximum number of requests allowed per minute (default: 60) */
  maxRequestsPerMinute?: number;
}

/**
 * RateLimiter implements a sliding window rate limiting strategy
 *
 * The limiter tracks request timestamps and ensures that no more than
 * maxRequestsPerMinute requests are made within any 60-second window.
 * If the limit is reached, the limiter will wait until the oldest
 * request falls outside the window before allowing the next request.
 *
 * Example usage:
 * ```typescript
 * const rateLimiter = new RateLimiter({ maxRequestsPerMinute: 60 });
 *
 * const result = await rateLimiter.execute(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 * ```
 */
export class RateLimiter {
  private readonly maxRequestsPerMinute: number;
  private readonly requestTimes: number[] = [];
  private executionPromise: Promise<void> = Promise.resolve();

  constructor(options: RateLimiterOptions = {}) {
    this.maxRequestsPerMinute = options.maxRequestsPerMinute ?? 60;

    if (this.maxRequestsPerMinute <= 0) {
      throw new Error('maxRequestsPerMinute must be greater than 0');
    }
  }

  /**
   * Execute an async operation with rate limiting
   *
   * This method ensures that the operation is executed only when
   * the rate limit allows. If the limit is reached, it will wait
   * until a slot becomes available.
   *
   * @param operation - The async function to execute
   * @returns The result of the operation
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Chain executions to ensure serial processing
    // This prevents race conditions when checking/updating requestTimes
    const currentExecution = this.executionPromise.then(async () => {
      await this.waitForRateLimit();
      return await operation();
    });

    // Update the execution promise for the next caller
    this.executionPromise = currentExecution.then(
      () => {},
      () => {}
    );

    return await currentExecution;
  }

  /**
   * Wait until rate limit allows the next request
   *
   * This method implements the sliding window algorithm:
   * 1. Remove timestamps older than 1 minute
   * 2. If we're at the limit, calculate wait time until oldest request expires
   * 3. Wait if necessary
   * 4. Record the current request timestamp
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds in milliseconds

    // Remove requests older than 1 minute (sliding window)
    while (this.requestTimes.length > 0 && this.requestTimes[0] < oneMinuteAgo) {
      this.requestTimes.shift();
    }

    // Check if we've reached the rate limit
    if (this.requestTimes.length >= this.maxRequestsPerMinute) {
      // Calculate how long to wait until the oldest request expires
      const oldestRequest = this.requestTimes[0];
      const waitTimeMs = oldestRequest + 60000 - now;

      if (waitTimeMs > 0) {
        // Wait until the oldest request falls outside the window
        await this.delay(waitTimeMs);

        // After waiting, remove the expired request
        this.requestTimes.shift();
      }
    }

    // Record this request
    this.requestTimes.push(Date.now());
  }

  /**
   * Delay execution for specified milliseconds
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limiter statistics
   *
   * Useful for monitoring and debugging
   *
   * @returns Statistics about current rate limiter state
   */
  getStats(): {
    requestsInWindow: number;
    maxRequests: number;
    availableSlots: number;
    oldestRequestAge: number | null;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old requests for accurate stats
    while (this.requestTimes.length > 0 && this.requestTimes[0] < oneMinuteAgo) {
      this.requestTimes.shift();
    }

    const oldestRequestAge =
      this.requestTimes.length > 0 ? now - this.requestTimes[0] : null;

    return {
      requestsInWindow: this.requestTimes.length,
      maxRequests: this.maxRequestsPerMinute,
      availableSlots: Math.max(0, this.maxRequestsPerMinute - this.requestTimes.length),
      oldestRequestAge,
    };
  }

  /**
   * Reset the rate limiter state
   *
   * Clears all tracked request timestamps.
   * Useful for testing or when you need to reset the limiter.
   */
  reset(): void {
    this.requestTimes.length = 0;
  }
}

/**
 * Default rate limiter instance for blockchain queries
 * - 60 requests per minute (default)
 */
export const defaultBlockchainRateLimiter = new RateLimiter({
  maxRequestsPerMinute: 60,
});

/**
 * Rate limiter for API calls (more conservative)
 * - 30 requests per minute
 */
export const defaultApiRateLimiter = new RateLimiter({
  maxRequestsPerMinute: 30,
});
