import { describe, it, expect } from 'vitest';
import { AmountValidator } from './AmountValidator';
import { parseUnits } from 'ethers';

describe('AmountValidator', () => {
  describe('isValidAmount', () => {
    it('should return true for valid amount with correct decimals', () => {
      expect(AmountValidator.isValidAmount('100.5', 18)).toBe(true);
    });

    it('should return true for integer amount', () => {
      expect(AmountValidator.isValidAmount('100', 18)).toBe(true);
    });

    it('should return true for amount as number', () => {
      expect(AmountValidator.isValidAmount(100.5, 18)).toBe(true);
    });

    it('should return true for small decimal amount', () => {
      expect(AmountValidator.isValidAmount('0.000001', 18)).toBe(true);
    });

    it('should return false for amount with too many decimals', () => {
      expect(AmountValidator.isValidAmount('100.123456789012345678901', 18)).toBe(false);
    });

    it('should return false for zero amount', () => {
      expect(AmountValidator.isValidAmount('0', 18)).toBe(false);
    });

    it('should return false for negative amount', () => {
      expect(AmountValidator.isValidAmount('-100', 18)).toBe(false);
    });

    it('should return false for invalid string', () => {
      expect(AmountValidator.isValidAmount('abc', 18)).toBe(false);
    });

    it('should return false for null', () => {
      expect(AmountValidator.isValidAmount(null as any, 18)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(AmountValidator.isValidAmount(undefined as any, 18)).toBe(false);
    });

    it('should return true for amount with exact decimal precision', () => {
      expect(AmountValidator.isValidAmount('1.123456', 6)).toBe(true);
    });

    it('should return false for amount exceeding decimal precision', () => {
      expect(AmountValidator.isValidAmount('1.1234567', 6)).toBe(false);
    });

    it('should return true for token with 0 decimals', () => {
      expect(AmountValidator.isValidAmount('100', 0)).toBe(true);
    });

    it('should return false for decimal amount with 0 decimal token', () => {
      expect(AmountValidator.isValidAmount('100.5', 0)).toBe(false);
    });
  });

  describe('isWithinMaxSupply', () => {
    it('should return true for normal amount', () => {
      expect(AmountValidator.isWithinMaxSupply('1000000', 18)).toBe(true);
    });

    it('should return true for large but valid amount', () => {
      expect(AmountValidator.isWithinMaxSupply('1000000000000000000', 18)).toBe(true);
    });

    it('should return false for amount exceeding uint256 max', () => {
      // This would overflow uint256
      const hugeAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639936';
      expect(AmountValidator.isWithinMaxSupply(hugeAmount, 0)).toBe(false);
    });

    it('should return false for invalid amount', () => {
      expect(AmountValidator.isWithinMaxSupply('invalid', 18)).toBe(false);
    });

    it('should return false for negative amount', () => {
      expect(AmountValidator.isWithinMaxSupply('-100', 18)).toBe(false);
    });

    it('should return true for amount at boundary', () => {
      // Max uint256 in decimal
      expect(AmountValidator.isWithinMaxSupply('1', 0)).toBe(true);
    });
  });

  describe('validate', () => {
    it('should return valid for correct amount', () => {
      const result = AmountValidator.validate('100.5', 18);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for null amount', () => {
      const result = AmountValidator.validate(null as any, 18);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should return invalid for undefined amount', () => {
      const result = AmountValidator.validate(undefined as any, 18);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount is required');
    });

    it('should return invalid for negative decimals', () => {
      const result = AmountValidator.validate('100', -1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid decimal places (must be 0-77)');
    });

    it('should return invalid for decimals > 77', () => {
      const result = AmountValidator.validate('100', 78);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid decimal places (must be 0-77)');
    });

    it('should return invalid for non-numeric amount', () => {
      const result = AmountValidator.validate('abc', 18);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be a valid number');
    });

    it('should return invalid for zero amount', () => {
      const result = AmountValidator.validate('0', 18);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be greater than zero');
    });

    it('should return invalid for negative amount', () => {
      const result = AmountValidator.validate('-100', 18);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be greater than zero');
    });

    it('should return invalid for amount exceeding precision', () => {
      const result = AmountValidator.validate('100.123456789', 6);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount exceeds token precision (max 6 decimal places)');
    });

    it('should return invalid for amount exceeding uint256 max', () => {
      const hugeAmount = '115792089237316195423570985008687907853269984665640564039457584007913129639936';
      const result = AmountValidator.validate(hugeAmount, 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount exceeds maximum supply limit');
    });

    it('should return invalid for amount exceeding custom max supply', () => {
      const maxSupply = parseUnits('1000', 18);
      const result = AmountValidator.validate('1001', 18, maxSupply);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount exceeds token max supply');
    });

    it('should return valid for amount within custom max supply', () => {
      const maxSupply = parseUnits('1000', 18);
      const result = AmountValidator.validate('999', 18, maxSupply);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for amount equal to custom max supply', () => {
      const maxSupply = parseUnits('1000', 18);
      const result = AmountValidator.validate('1000', 18, maxSupply);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle number type amount', () => {
      const result = AmountValidator.validate(100.5, 18);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate token with 0 decimals', () => {
      const result = AmountValidator.validate('100', 0);
      expect(result.isValid).toBe(true);
    });

    it('should reject decimal for token with 0 decimals', () => {
      const result = AmountValidator.validate('100.5', 0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount exceeds token precision (max 0 decimal places)');
    });
  });

  describe('toTokenUnits', () => {
    it('should convert amount to token units', () => {
      const result = AmountValidator.toTokenUnits('1', 18);
      expect(result).toBe(parseUnits('1', 18));
    });

    it('should convert decimal amount to token units', () => {
      const result = AmountValidator.toTokenUnits('1.5', 18);
      expect(result).toBe(parseUnits('1.5', 18));
    });

    it('should convert number to token units', () => {
      const result = AmountValidator.toTokenUnits(1.5, 18);
      expect(result).toBe(parseUnits('1.5', 18));
    });

    it('should return null for invalid amount', () => {
      const result = AmountValidator.toTokenUnits('invalid', 18);
      expect(result).toBeNull();
    });

    it('should return null for negative amount', () => {
      const result = AmountValidator.toTokenUnits('-1', 18);
      expect(result).toBeNull();
    });

    it('should return null for zero amount', () => {
      const result = AmountValidator.toTokenUnits('0', 18);
      expect(result).toBeNull();
    });

    it('should handle token with 0 decimals', () => {
      const result = AmountValidator.toTokenUnits('100', 0);
      expect(result).toBe(100n);
    });

    it('should return null for decimal with 0 decimal token', () => {
      const result = AmountValidator.toTokenUnits('100.5', 0);
      expect(result).toBeNull();
    });

    it('should handle very small amounts', () => {
      const result = AmountValidator.toTokenUnits('0.000000000000000001', 18);
      expect(result).toBe(1n);
    });

    it('should handle large amounts', () => {
      const result = AmountValidator.toTokenUnits('1000000', 18);
      expect(result).toBe(parseUnits('1000000', 18));
    });
  });
});
