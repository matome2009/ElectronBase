/**
 * Global type definitions for PayrollGuardian
 */

import { LogEntry } from '../services/LoggingService';

/**
 * Electron IPC interface
 */
interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (...args: any[]) => void) => void;
    once: (channel: string, listener: (...args: any[]) => void) => void;
    removeListener: (channel: string, listener: (...args: any[]) => void) => void;
  };
}

/**
 * Extend Window interface with Electron API
 */
declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
