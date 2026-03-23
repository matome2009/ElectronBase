import { safeStorage } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';

/**
 * Secure storage service using Electron's safeStorage API
 * Uses Windows Data Protection API (DPAPI) on Windows
 * Requirement 35.4: Store Google Sheets configuration securely
 * Task 31.2: Implement secure configuration storage
 */
export class SecureStorageService {
  private static readonly GOOGLE_SHEETS_CREDS_FILE = 'google_sheets_creds.enc';
  private static readonly WALLETCONNECT_SESSION_FILE = 'walletconnect_session.enc';

  private static getStorageDir(): string {
    return path.join(app.getPath('userData'), 'secure');
  }

  /**
   * Initialize secure storage directory
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.getStorageDir(), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize secure storage directory:', error);
      throw error;
    }
  }

  /**
   * Check if encryption is available
   * @returns true if safeStorage encryption is available
   */
  static isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Encrypt and save Google Sheets credentials
   * @param credentialsJson - Google Sheets API credentials in JSON format
   */
  static async saveGoogleSheetsCredentials(credentialsJson: string): Promise<void> {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    try {
      // プラットフォーム固有の暗号化を使用して認証情報を暗号化（WindowsではDPAPI）
      const encrypted = safeStorage.encryptString(credentialsJson);

      // 暗号化されたデータをファイルに保存
      const filePath = path.join(this.getStorageDir(), this.GOOGLE_SHEETS_CREDS_FILE);
      await fs.writeFile(filePath, encrypted);

      console.log('Google Sheets credentials encrypted and saved successfully');
    } catch (error) {
      console.error('Failed to save Google Sheets credentials:', error);
      throw error;
    }
  }

  /**
   * Load and decrypt Google Sheets credentials
   * @returns Decrypted credentials JSON string, or null if not found
   */
  static async loadGoogleSheetsCredentials(): Promise<string | null> {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    try {
      const filePath = path.join(this.getStorageDir(), this.GOOGLE_SHEETS_CREDS_FILE);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null; // ファイルが存在しない
      }

      // 暗号化されたデータを読み込み
      const encrypted = await fs.readFile(filePath);

      // プラットフォーム固有の復号化を使用
      const decrypted = safeStorage.decryptString(encrypted);

      return decrypted;
    } catch (error) {
      console.error('Failed to load Google Sheets credentials:', error);
      throw error;
    }
  }

  /**
   * Delete Google Sheets credentials
   */
  static async deleteGoogleSheetsCredentials(): Promise<void> {
    try {
      const filePath = path.join(this.getStorageDir(), this.GOOGLE_SHEETS_CREDS_FILE);
      await fs.unlink(filePath);
      console.log('Google Sheets credentials deleted successfully');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to delete Google Sheets credentials:', error);
        throw error;
      }
      // ファイルが存在しない場合は削除不要
    }
  }

  /**
   * Encrypt and save WalletConnect session data
   * @param sessionData - WalletConnect session data in JSON format
   */
  static async saveWalletConnectSession(sessionData: string): Promise<void> {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    try {
      // プラットフォーム固有の暗号化を使用してセッションデータを暗号化（WindowsではDPAPI）
      const encrypted = safeStorage.encryptString(sessionData);

      // 暗号化されたデータをファイルに保存
      const filePath = path.join(this.getStorageDir(), this.WALLETCONNECT_SESSION_FILE);
      await fs.writeFile(filePath, encrypted);

      console.log('WalletConnect session encrypted and saved successfully');
    } catch (error) {
      console.error('Failed to save WalletConnect session:', error);
      throw error;
    }
  }

  /**
   * Load and decrypt WalletConnect session data
   * @returns Decrypted session data JSON string, or null if not found
   */
  static async loadWalletConnectSession(): Promise<string | null> {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    try {
      const filePath = path.join(this.getStorageDir(), this.WALLETCONNECT_SESSION_FILE);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return null; // ファイルが存在しない
      }

      // 暗号化されたデータを読み込み
      const encrypted = await fs.readFile(filePath);

      // プラットフォーム固有の復号化を使用
      const decrypted = safeStorage.decryptString(encrypted);

      return decrypted;
    } catch (error) {
      console.error('Failed to load WalletConnect session:', error);
      throw error;
    }
  }

  /**
   * Delete WalletConnect session data
   */
  static async deleteWalletConnectSession(): Promise<void> {
    try {
      const filePath = path.join(this.getStorageDir(), this.WALLETCONNECT_SESSION_FILE);
      await fs.unlink(filePath);
      console.log('WalletConnect session deleted successfully');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to delete WalletConnect session:', error);
        throw error;
      }
      // ファイルが存在しない場合は削除不要
    }
  }

  /**
   * Check if Google Sheets credentials exist
   */
  static async hasGoogleSheetsCredentials(): Promise<boolean> {
    try {
      const filePath = path.join(this.getStorageDir(), this.GOOGLE_SHEETS_CREDS_FILE);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if WalletConnect session exists
   */
  static async hasWalletConnectSession(): Promise<boolean> {
    try {
      const filePath = path.join(this.getStorageDir(), this.WALLETCONNECT_SESSION_FILE);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
