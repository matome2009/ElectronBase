import { describe, it, expect } from 'vitest';
import { AddressValidator } from './AddressValidator';

describe('AddressValidator', () => {
  describe('isValidEthereumAddress', () => {
    it('should return true for valid lowercase address', () => {
      const address = '0x742d35cc6634c0532925a3b844bc9e7595f0beb2';
      expect(AddressValidator.isValidEthereumAddress(address)).toBe(true);
    });

    it('should return true for valid checksummed address', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      expect(AddressValidator.isValidEthereumAddress(address)).toBe(true);
    });

    it('should return true for valid uppercase address', () => {
      const address = '0x742D35CC6634C0532925A3B844BC9E7595F0BEB2';
      expect(AddressValidator.isValidEthereumAddress(address)).toBe(true);
    });

    it('should return false for address without 0x prefix', () => {
      const address = '742d35cc6634c0532925a3b844bc9e7595f0beb2';
      expect(AddressValidator.isValidEthereumAddress(address)).toBe(false);
    });

    it('should return false for address with wrong length', () => {
      const address = '0x742d35cc6634c0532925a3b844bc9e7595f0be';
      expect(AddressValidator.isValidEthereumAddress(address)).toBe(false);
    });

    it('should return false for address with invalid characters', () => {
      const address = '0x742d35cc6634c0532925a3b844bc9e7595f0beg2';
      expect(AddressValidator.isValidEthereumAddress(address)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(AddressValidator.isValidEthereumAddress('')).toBe(false);
    });

    it('should return false for null', () => {
      expect(AddressValidator.isValidEthereumAddress(null as any)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(AddressValidator.isValidEthereumAddress(undefined as any)).toBe(false);
    });
  });

  describe('isValidChecksumAddress', () => {
    it('should return true for valid checksummed address', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      expect(AddressValidator.isValidChecksumAddress(address)).toBe(true);
    });

    it('should return true for all lowercase address', () => {
      const address = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      expect(AddressValidator.isValidChecksumAddress(address)).toBe(true);
    });

    it('should return true for all uppercase address', () => {
      const address = '0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED';
      expect(AddressValidator.isValidChecksumAddress(address)).toBe(true);
    });

    it('should return false for invalid checksum', () => {
      // Intentionally wrong checksum
      const address = '0x5aAeb6053f3e94c9b9a09f33669435e7ef1beaed';
      expect(AddressValidator.isValidChecksumAddress(address)).toBe(false);
    });

    it('should return false for invalid address format', () => {
      const address = '0xinvalid';
      expect(AddressValidator.isValidChecksumAddress(address)).toBe(false);
    });

    it('should return true for another valid checksummed address', () => {
      const address = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
      expect(AddressValidator.isValidChecksumAddress(address)).toBe(true);
    });
  });

  describe('toChecksumAddress', () => {
    it('should convert lowercase address to checksummed format', () => {
      const address = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const result = AddressValidator.toChecksumAddress(address);
      expect(result).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
    });

    it('should convert uppercase address to checksummed format', () => {
      const address = '0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED';
      const result = AddressValidator.toChecksumAddress(address);
      expect(result).toBe('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
    });

    it('should return same address if already checksummed', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = AddressValidator.toChecksumAddress(address);
      expect(result).toBe(address);
    });

    it('should return null for invalid address', () => {
      const address = '0xinvalid';
      const result = AddressValidator.toChecksumAddress(address);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = AddressValidator.toChecksumAddress('');
      expect(result).toBeNull();
    });
  });

  describe('validate', () => {
    it('should return valid for correct address without checksum requirement', () => {
      const address = '0x742d35cc6634c0532925a3b844bc9e7595f0beb2';
      const result = AddressValidator.validate(address);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid for checksummed address with checksum requirement', () => {
      const address = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const result = AddressValidator.validate(address, true);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for wrong checksum when required', () => {
      const address = '0x5aAeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const result = AddressValidator.validate(address, true);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid EIP-55 checksum');
    });

    it('should return invalid for empty address', () => {
      const result = AddressValidator.validate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Address is required');
    });

    it('should return invalid for malformed address', () => {
      const address = '0xinvalid';
      const result = AddressValidator.validate(address);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid Ethereum address format');
    });

    it('should return invalid for address without 0x prefix', () => {
      const address = '742d35cc6634c0532925a3b844bc9e7595f0beb2';
      const result = AddressValidator.validate(address);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid Ethereum address format');
    });

    it('should return valid for all lowercase address even with checksum requirement', () => {
      const address = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
      const result = AddressValidator.validate(address, true);
      expect(result.isValid).toBe(true);
    });
  });
});
