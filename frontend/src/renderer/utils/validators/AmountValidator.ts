import { parseUnits, MaxUint256 } from 'ethers';

/**
 * AmountValidator provides token amount validation utilities
 * including precision validation and max supply checks.
 */
export class AmountValidator {
  /**
   * Validates if an amount is valid for a token with specified decimals.
   * Checks if the amount is positive and doesn't exceed token precision.
   * 
   * @param amount - The amount to validate (as string or number)
   * @param decimals - The token's decimal places
   * @returns true if the amount is valid, false otherwise
   */
  static isValidAmount(amount: string | number, decimals: number): boolean {
    if (amount === null || amount === undefined) {
      return false;
    }

    const amountStr = typeof amount === 'number' ? amount.toString() : amount;

    // Check if amount is a valid number
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      return false;
    }

    // Check if amount has more decimal places than token supports
    const decimalPart = amountStr.split('.')[1];
    if (decimalPart && decimalPart.length > decimals) {
      return false;
    }

    try {
      // Try to parse the amount - will throw if invalid
      parseUnits(amountStr, decimals);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates if an amount is within the maximum supply limit.
   * Checks against the maximum uint256 value to prevent overflow.
   * 
   * @param amount - The amount to validate (as string or number)
   * @param decimals - The token's decimal places
   * @returns true if the amount is within max supply, false otherwise
   */
  static isWithinMaxSupply(amount: string | number, decimals: number): boolean {
    if (!this.isValidAmount(amount, decimals)) {
      return false;
    }

    const amountStr = typeof amount === 'number' ? amount.toString() : amount;

    try {
      const tokenUnits = parseUnits(amountStr, decimals);
      
      // Check if amount exceeds uint256 max value
      return tokenUnits <= MaxUint256;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates token amount with comprehensive checks.
   * 
   * @param amount - The amount to validate
   * @param decimals - The token's decimal places
   * @param maxSupply - Optional maximum supply limit (in token units)
   * @returns Validation result with success flag and error message
   */
  static validate(
    amount: string | number,
    decimals: number,
    maxSupply?: bigint
  ): { isValid: boolean; error?: string } {
    if (amount === null || amount === undefined) {
      return { isValid: false, error: 'Amount is required' };
    }

    if (decimals < 0 || decimals > 77) {
      return { isValid: false, error: 'Invalid decimal places (must be 0-77)' };
    }

    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    const numAmount = parseFloat(amountStr);

    if (isNaN(numAmount)) {
      return { isValid: false, error: 'Amount must be a valid number' };
    }

    if (numAmount <= 0) {
      return { isValid: false, error: 'Amount must be greater than zero' };
    }

    // Check decimal precision
    const decimalPart = amountStr.split('.')[1];
    if (decimalPart && decimalPart.length > decimals) {
      return {
        isValid: false,
        error: `Amount exceeds token precision (max ${decimals} decimal places)`,
      };
    }

    try {
      const tokenUnits = parseUnits(amountStr, decimals);

      // Check against uint256 max
      if (tokenUnits > MaxUint256) {
        return { isValid: false, error: 'Amount exceeds maximum supply limit' };
      }

      // Check against custom max supply if provided
      if (maxSupply !== undefined && tokenUnits > maxSupply) {
        return { isValid: false, error: 'Amount exceeds token max supply' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid amount format' };
    }
  }

  /**
   * Converts an amount string to token units (wei equivalent).
   * 
   * @param amount - The amount to convert
   * @param decimals - The token's decimal places
   * @returns The amount in token units as bigint, or null if invalid
   */
  static toTokenUnits(amount: string | number, decimals: number): bigint | null {
    if (!this.isValidAmount(amount, decimals)) {
      return null;
    }

    const amountStr = typeof amount === 'number' ? amount.toString() : amount;

    try {
      return parseUnits(amountStr, decimals);
    } catch (error) {
      return null;
    }
  }
}
