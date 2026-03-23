/**
 * Error Message Provider for PayrollGuardian
 * Provides user-friendly Japanese error messages for all exception types
 * Requirements: 14.1-14.5
 */

import {
  PayrollGuardianException,
  BlockchainConnectionException,
  WalletConnectionException,
  TransactionFailedException,
  DuplicateSessionNameException,
} from '../exceptions';
import i18n from '../i18n';

export interface ErrorMessage {
  title: string;
  message: string;
  technicalDetails?: string;
  actionable?: string;
}

/**
 * ErrorMessageProvider maps exceptions to localized, user-friendly Japanese error messages
 */
export class ErrorMessageProvider {
  /**
   * Get user-friendly error message for any exception
   * Requirement 14.1: Log error messages for transaction failures
   * Requirement 14.5: Preserve Payment_Record data during application restart
   */
  static getErrorMessage(error: Error): ErrorMessage {
    // Handle specific exception types
    if (error instanceof BlockchainConnectionException) {
      return this.getBlockchainConnectionError(error);
    }

    if (error instanceof WalletConnectionException) {
      return this.getWalletConnectionError(error);
    }

    if (error instanceof TransactionFailedException) {
      return this.getTransactionFailedError(error);
    }

    if (error instanceof DuplicateSessionNameException) {
      return this.getDuplicateSessionNameError(error);
    }

    if (error instanceof PayrollGuardianException) {
      return this.getGenericPayrollGuardianError(error);
    }

    // Handle generic errors
    return this.getGenericError(error);
  }

  /**
   * Get error message for blockchain connection failures
   * Requirement 14.3: Display connection error when Blockchain_Node connection is lost
   */
  private static getBlockchainConnectionError(
    error: BlockchainConnectionException
  ): ErrorMessage {
    return {
      title: i18n.t('errors.blockchainConnection'),
      message: i18n.t('errors.blockchainConnectionMsg', { rpcUrl: error.rpcUrl }),
      technicalDetails: error.innerError?.message,
      actionable: i18n.t('errors.blockchainConnectionAction'),
    };
  }

  /**
   * Get error message for wallet connection failures
   * Requirement 14.1: Log error messages for wallet connection failures
   */
  private static getWalletConnectionError(
    error: WalletConnectionException
  ): ErrorMessage {
    return {
      title: i18n.t('errors.walletConnection'),
      message: i18n.t('errors.walletConnectionMsg'),
      technicalDetails: error.message,
      actionable: i18n.t('errors.walletConnectionAction'),
    };
  }

  /**
   * Get error message for transaction failures
   * Requirement 14.1: Log error messages for transaction failures
   * Requirement 14.2: Allow User to retry failed Payment_Record objects
   */
  private static getTransactionFailedError(
    error: TransactionFailedException
  ): ErrorMessage {
    return {
      title: i18n.t('errors.transactionFailed'),
      message: i18n.t('errors.transactionFailedMsg', { reason: error.reason }),
      technicalDetails: `Transaction Hash: ${error.transactionHash}\n${error.innerError?.message || ''}`,
      actionable: i18n.t('errors.transactionFailedAction'),
    };
  }

  /**
   * Get error message for duplicate session name
   */
  private static getDuplicateSessionNameError(
    error: DuplicateSessionNameException
  ): ErrorMessage {
    return {
      title: i18n.t('errors.duplicateSession'),
      message: i18n.t('errors.duplicateSessionMsg', { name: error.sessionName }),
      technicalDetails: error.message,
      actionable: i18n.t('errors.duplicateSessionAction'),
    };
  }

  /**
   * Get error message for generic PayrollGuardian exceptions
   */
  private static getGenericPayrollGuardianError(
    error: PayrollGuardianException
  ): ErrorMessage {
    return {
      title: i18n.t('errors.genericError'),
      message: error.message,
      technicalDetails: error.innerError?.message,
      actionable: i18n.t('errors.genericAction'),
    };
  }

  /**
   * Get error message for generic errors
   */
  private static getGenericError(error: Error): ErrorMessage {
    return {
      title: i18n.t('errors.unexpectedError'),
      message: i18n.t('errors.unexpectedErrorMsg'),
      technicalDetails: `${error.name}: ${error.message}\n${error.stack || ''}`,
      actionable: i18n.t('errors.unexpectedAction'),
    };
  }

  /**
   * Format error message for display in UI
   */
  static formatForDisplay(error: Error): string {
    const errorMessage = this.getErrorMessage(error);
    let formatted = `${errorMessage.title}\n\n${errorMessage.message}`;

    if (errorMessage.actionable) {
      formatted += `\n\n${i18n.t('errors.remedy')}:\n${errorMessage.actionable}`;
    }

    return formatted;
  }

  /**
   * Format error message for logging
   * Requirement 14.1: Log all errors with stack traces
   */
  static formatForLogging(error: Error): string {
    const errorMessage = this.getErrorMessage(error);
    let formatted = `[${errorMessage.title}] ${errorMessage.message}`;

    if (errorMessage.technicalDetails) {
      formatted += `\n\nTechnical Details:\n${errorMessage.technicalDetails}`;
    }

    if (error.stack) {
      formatted += `\n\nStack Trace:\n${error.stack}`;
    }

    return formatted;
  }

  /**
   * Check if error is retryable
   * Requirement 14.2: Allow User to retry failed Payment_Record objects
   * Requirement 14.4: Automatically reconnect to Blockchain_Node when connection is restored
   */
  static isRetryable(error: Error): boolean {
    // Connection errors are retryable
    if (
      error instanceof BlockchainConnectionException ||
      error instanceof WalletConnectionException
    ) {
      return true;
    }

    // Transaction failures may be retryable depending on the reason
    if (error instanceof TransactionFailedException) {
      const retryableReasons = [
        'nonce too low',
        'replacement transaction underpriced',
        'timeout',
        'network error',
      ];
      return retryableReasons.some((reason) =>
        error.reason.toLowerCase().includes(reason)
      );
    }

    // Duplicate session name is not retryable
    if (error instanceof DuplicateSessionNameException) {
      return false;
    }

    // Generic errors may be retryable
    return true;
  }
}
