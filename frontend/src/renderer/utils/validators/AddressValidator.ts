import { getAddress } from 'ethers';

/**
 * AddressValidator provides Ethereum address validation utilities
 * including format validation and EIP-55 checksum validation.
 */
export class AddressValidator {
  /**
   * Validates if a string is a valid Ethereum address format.
   * Checks for 0x prefix and 40 hexadecimal characters.
   * Does not validate checksum - use isValidChecksumAddress for that.
   * 
   * @param address - The address string to validate
   * @returns true if the address has valid format, false otherwise
   */
  static isValidEthereumAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Must start with 0x and be 42 characters long
    if (!address.startsWith('0x') || address.length !== 42) {
      return false;
    }

    // Check if all characters after 0x are valid hex
    const hexPart = address.slice(2);
    return /^[0-9a-fA-F]{40}$/.test(hexPart);
  }

  /**
   * Validates if an address has a valid EIP-55 checksum.
   * EIP-55 uses mixed case to encode a checksum in the address itself.
   * 
   * @param address - The address string to validate
   * @returns true if the checksum is valid, false otherwise
   */
  static isValidChecksumAddress(address: string): boolean {
    if (!this.isValidEthereumAddress(address)) {
      return false;
    }

    try {
      // ethers.js getAddress() will throw if checksum is invalid
      // and the address contains mixed case
      const checksumAddress = getAddress(address);
      
      // If address is all lowercase or all uppercase, it's considered valid
      // but not checksummed
      const hasUpperCase = /[A-F]/.test(address.slice(2));
      const hasLowerCase = /[a-f]/.test(address.slice(2));
      
      if (!hasUpperCase || !hasLowerCase) {
        // All same case - valid but not checksummed
        return true;
      }
      
      // Mixed case - must match checksum
      return address === checksumAddress;
    } catch (error) {
      return false;
    }
  }

  /**
   * Converts an address to its EIP-55 checksummed format.
   * 
   * @param address - The address to convert
   * @returns The checksummed address, or null if invalid
   */
  static toChecksumAddress(address: string): string | null {
    if (!this.isValidEthereumAddress(address)) {
      return null;
    }

    try {
      return getAddress(address);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validates address format and optionally enforces checksum validation.
   * 
   * @param address - The address to validate
   * @param requireChecksum - If true, requires valid EIP-55 checksum
   * @returns Validation result with success flag and error message
   */
  static validate(
    address: string,
    requireChecksum: boolean = false
  ): { isValid: boolean; error?: string } {
    if (!address) {
      return { isValid: false, error: 'Address is required' };
    }

    if (!this.isValidEthereumAddress(address)) {
      return { isValid: false, error: 'Invalid Ethereum address format' };
    }

    if (requireChecksum && !this.isValidChecksumAddress(address)) {
      return { isValid: false, error: 'Invalid EIP-55 checksum' };
    }

    return { isValid: true };
  }
}
