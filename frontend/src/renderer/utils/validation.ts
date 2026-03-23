import { isAddress, getAddress, keccak256, toUtf8Bytes } from 'ethers';

export const validateHttpsUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url || url.trim() === '') {
    return { isValid: false, error: 'URLを入力してください' };
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== 'https:') {
      return { isValid: false, error: 'HTTPSプロトコルのURLを入力してください' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: '有効なURLを入力してください' };
  }
};

/**
 * AddressValidator - Validates Ethereum addresses with EIP-55 checksum support
 */
export class AddressValidator {
  /**
   * Validates if a string is a valid Ethereum address format
   * @param address - The address string to validate
   * @returns Validation result with error message if invalid
   */
  static isValidEthereumAddress(address: string): { isValid: boolean; error?: string } {
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'アドレスを入力してください' };
    }

    const trimmedAddress = address.trim();

    // Check format: must start with 0x and be 42 characters long
    if (!trimmedAddress.startsWith('0x') || trimmedAddress.length !== 42) {
      return { isValid: false, error: 'アドレスは0xで始まる42文字である必要があります' };
    }

    // Check if all characters after 0x are valid hex
    const hexPart = trimmedAddress.substring(2);
    const isValidHex = /^[0-9a-fA-F]{40}$/.test(hexPart);

    if (!isValidHex) {
      return { isValid: false, error: 'アドレスに無効な文字が含まれています' };
    }

    return { isValid: true };
  }

  /**
   * Validates EIP-55 checksum for an Ethereum address
   * @param address - The address string to validate
   * @returns Validation result with error message if invalid
   */
  static isValidChecksumAddress(address: string): { isValid: boolean; error?: string } {
    // First check basic format
    const formatCheck = this.isValidEthereumAddress(address);
    if (!formatCheck.isValid) {
      return formatCheck;
    }

    const trimmedAddress = address.trim();

    // If address is all lowercase or all uppercase (except 0x), skip checksum validation
    const hexPart = trimmedAddress.substring(2);
    const isAllLower = hexPart === hexPart.toLowerCase();
    const isAllUpper = hexPart === hexPart.toUpperCase();

    if (isAllLower || isAllUpper) {
      return { isValid: true };
    }

    // Perform EIP-55 checksum validation
    try {
      // Use ethers.js to get the checksummed address
      const checksummedAddress = getAddress(trimmedAddress);

      if (checksummedAddress !== trimmedAddress) {
        return {
          isValid: false,
          error: 'アドレスのチェックサムが無効です。正しいアドレス: ' + checksummedAddress,
        };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'アドレスの検証中にエラーが発生しました' };
    }
  }

  /**
   * Validates an Ethereum address using ethers.js isAddress function
   * This is a convenience method that uses ethers.js built-in validation
   * @param address - The address string to validate
   * @returns Validation result with error message if invalid
   */
  static validate(address: string): { isValid: boolean; error?: string } {
    if (!address || typeof address !== 'string') {
      return { isValid: false, error: 'アドレスを入力してください' };
    }

    const trimmedAddress = address.trim();

    if (!isAddress(trimmedAddress)) {
      return { isValid: false, error: '無効なEthereumアドレスです' };
    }

    return { isValid: true };
  }
}

/**
 * AmountValidator - Validates token amounts with precision and max supply checks
 */
export class AmountValidator {
  /**
   * Validates if an amount is valid for a token with specified decimals
   * @param amount - The amount to validate (as string or number)
   * @param decimals - The token's decimal places
   * @returns Validation result with error message if invalid
   */
  static isValidAmount(
    amount: string | number,
    decimals: number
  ): { isValid: boolean; error?: string } {
    // Convert to number if string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Check if amount is a valid number
    if (isNaN(numAmount)) {
      return { isValid: false, error: '有効な数値を入力してください' };
    }

    // Check if amount is positive
    if (numAmount <= 0) {
      return { isValid: false, error: '金額は0より大きい必要があります' };
    }

    // Check if decimals is valid
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
      return { isValid: false, error: '無効なトークンの小数点桁数です' };
    }

    // Check if amount exceeds token precision
    // Convert to string to check decimal places
    const amountStr = numAmount.toString();
    const decimalIndex = amountStr.indexOf('.');

    if (decimalIndex !== -1) {
      const decimalPlaces = amountStr.length - decimalIndex - 1;
      if (decimalPlaces > decimals) {
        return {
          isValid: false,
          error: `金額の小数点以下は${decimals}桁以内である必要があります`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Validates if an amount is within the maximum supply limit
   * Maximum is 2^256 - 1 (max uint256 value)
   * @param amount - The amount to validate (as string or number)
   * @param decimals - The token's decimal places
   * @returns Validation result with error message if invalid
   */
  static isWithinMaxSupply(
    amount: string | number,
    decimals: number
  ): { isValid: boolean; error?: string } {
    // First validate the amount format
    const amountCheck = this.isValidAmount(amount, decimals);
    if (!amountCheck.isValid) {
      return amountCheck;
    }

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    try {
      // Calculate token units (amount * 10^decimals)
      const multiplier = Math.pow(10, decimals);
      const tokenUnits = numAmount * multiplier;

      // Check for overflow - JavaScript's Number.MAX_SAFE_INTEGER is 2^53 - 1
      // For amounts that would overflow, we need to use BigInt
      if (tokenUnits > Number.MAX_SAFE_INTEGER) {
        // Convert to BigInt for large numbers
        const amountStr = numAmount.toFixed(decimals);
        const [intPart, decPart = ''] = amountStr.split('.');
        const paddedDecPart = decPart.padEnd(decimals, '0');
        const tokenUnitsBigInt = BigInt(intPart + paddedDecPart);

        // Max uint256 value: 2^256 - 1
        const maxSupply = (BigInt(2) ** BigInt(256)) - BigInt(1);

        if (tokenUnitsBigInt > maxSupply) {
          return { isValid: false, error: '金額が最大供給量を超えています' };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: '金額の検証中にエラーが発生しました' };
    }
  }

  /**
   * Validates an amount comprehensively (format, precision, and max supply)
   * @param amount - The amount to validate (as string or number)
   * @param decimals - The token's decimal places
   * @returns Validation result with error message if invalid
   */
  static validate(
    amount: string | number,
    decimals: number
  ): { isValid: boolean; error?: string } {
    // Check amount format and precision
    const amountCheck = this.isValidAmount(amount, decimals);
    if (!amountCheck.isValid) {
      return amountCheck;
    }

    // Check max supply
    return this.isWithinMaxSupply(amount, decimals);
  }
}
