/**
 * Exception Hierarchy for PayrollGuardian
 * Requirements: 14.1-14.5
 */

/**
 * Base exception class for all application-specific errors
 */
export class PayrollGuardianException extends Error {
  constructor(message: string, public readonly innerError?: Error) {
    super(message);
    this.name = 'PayrollGuardianException';
    
    // エラーがスローされた場所の適切なスタックトレースを維持（V8エンジンでのみ利用可能）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Exception thrown when connection to blockchain node fails
 */
export class BlockchainConnectionException extends PayrollGuardianException {
  constructor(
    public readonly rpcUrl: string,
    innerError: Error
  ) {
    super(`Failed to connect to blockchain node at ${rpcUrl}`, innerError);
    this.name = 'BlockchainConnectionException';
  }
}

/**
 * Exception thrown when wallet connection fails
 */
export class WalletConnectionException extends PayrollGuardianException {
  constructor(message: string, innerError?: Error) {
    super(message, innerError);
    this.name = 'WalletConnectionException';
  }
}

/**
 * Exception thrown when a blockchain transaction fails
 */
export class TransactionFailedException extends PayrollGuardianException {
  constructor(
    public readonly transactionHash: string,
    public readonly reason: string,
    innerError?: Error
  ) {
    super(`Transaction ${transactionHash} failed: ${reason}`, innerError);
    this.name = 'TransactionFailedException';
  }
}

/**
 * Exception thrown when attempting to create a session with a duplicate name
 */
export class DuplicateSessionNameException extends PayrollGuardianException {
  constructor(public readonly sessionName: string) {
    super(`Session with name '${sessionName}' already exists`);
    this.name = 'DuplicateSessionNameException';
  }
}
