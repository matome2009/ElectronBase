/**
 * RetryPolicy - Exponential backoff retry strategy
 * 
 * Provides configurable retry logic with exponential backoff for:
 * - Blockchain queries (Web3 calls)
 * - API calls (Google Sheets, exchange rates)
 * - Network operations that may experience transient failures
 * 
 * **Validates: Requirements 14.4**
 */

import {
  BlockchainConnectionException,
  TransactionFailedException,
} from '../exceptions';

/**
 * Configuration options for RetryPolicy
 */
export interface RetryPolicyOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay before first retry in milliseconds (default: 1000ms) */
  initialDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2.0) */
  backoffMultiplier?: number;
  /** Custom function to determine if an error should trigger a retry */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Default retry predicate - retries on transient network errors
 */
const defaultShouldRetry = (error: Error): boolean => {
  // Retry on network/connection errors
  if (error instanceof BlockchainConnectionException) {
    return true;
  }

  // Retry on fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry on timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    return true;
  }

  // Retry on rate limit errors (429)
  if (error.message.includes('429') || error.message.includes('rate limit')) {
    return true;
  }

  // Retry on temporary server errors (502, 503, 504)
  if (
    error.message.includes('502') ||
    error.message.includes('503') ||
    error.message.includes('504')
  ) {
    return true;
  }

  // Do NOT retry on transaction failures (these are permanent)
  if (error instanceof TransactionFailedException) {
    return false;
  }

  return false;
};

/**
 * RetryPolicy implements exponential backoff retry strategy
 * 
 * Example usage:
 * ```typescript
 * const retryPolicy = new RetryPolicy({ maxRetries: 3, initialDelayMs: 1000 });
 * 
 * const result = await retryPolicy.execute(async () => {
 *   return await fetch('https://api.example.com/data');
 * });
 * ```
 */
export class RetryPolicy {
  private readonly maxRetries: number;
  private readonly initialDelayMs: number;
  private readonly backoffMultiplier: number;
  private readonly shouldRetry: (error: Error) => boolean;

  constructor(options: RetryPolicyOptions = {}) {
    this.maxRetries = options.maxRetries ?? 3;
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2.0;
    this.shouldRetry = options.shouldRetry ?? defaultShouldRetry;
  }

  /**
   * Execute an async operation with retry logic
   * 
   * @param operation - The async function to execute
   * @param signal - Optional AbortSignal to cancel the operation
   * @returns The result of the operation
   * @throws The last error if all retries are exhausted
   */
  async execute<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    let attempt = 0;
    let delayMs = this.initialDelayMs;
    let lastError: Error;

    while (attempt <= this.maxRetries) {
      // Check if operation was cancelled
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      try {
        // Attempt the operation
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is the last attempt or error is not retryable, throw
        if (attempt >= this.maxRetries || !this.shouldRetry(lastError)) {
          throw lastError;
        }

        // Log retry attempt
        console.warn(
          `Operation failed (attempt ${attempt + 1}/${this.maxRetries}). ` +
          `Retrying in ${delayMs}ms...`,
          { error: lastError.message }
        );

        // Wait before retrying
        await this.delay(delayMs, signal);

        // Increase delay for next attempt (exponential backoff)
        delayMs = Math.floor(delayMs * this.backoffMultiplier);
        attempt++;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
  }

  /**
   * Delay execution for specified milliseconds
   * 
   * @param ms - Milliseconds to delay
   * @param signal - Optional AbortSignal to cancel the delay
   */
  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Operation cancelled'));
        return;
      }

      const timeout = setTimeout(resolve, ms);

      // Handle cancellation during delay
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Operation cancelled'));
        });
      }
    });
  }
}

/**
 * Default retry policy instance for blockchain operations
 * - 3 retries
 * - 1 second initial delay
 * - 2x exponential backoff
 */
export const defaultBlockchainRetryPolicy = new RetryPolicy({
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2.0,
});

/**
 * Retry policy for API calls (more aggressive)
 * - 5 retries
 * - 500ms initial delay
 * - 1.5x exponential backoff
 */
export const defaultApiRetryPolicy = new RetryPolicy({
  maxRetries: 5,
  initialDelayMs: 500,
  backoffMultiplier: 1.5,
});
