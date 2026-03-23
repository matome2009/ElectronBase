/**
 * Unit tests for LoggingService
 * Requirements: 19.1-19.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoggingService, LogLevel } from './LoggingService';
import { PayrollGuardianException } from '../exceptions';

describe('LoggingService', () => {
  beforeEach(() => {
    // Clear logs before each test
    LoggingService.clearLogs();
    
    // Mock console methods
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      LoggingService.debug('Test debug message');
      
      const logs = LoggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Test debug message');
    });

    it('should log info messages', () => {
      LoggingService.info('Test info message');
      
      const logs = LoggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Test info message');
    });

    it('should log warning messages', () => {
      LoggingService.warn('Test warning message');
      
      const logs = LoggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[0].message).toBe('Test warning message');
    });

    it('should log error messages with stack traces', () => {
      const error = new Error('Test error');
      LoggingService.error(error);
      
      const logs = LoggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toContain('Test error');
      expect(logs[0].stackTrace).toBeDefined();
    });
  });

  describe('Context Logging', () => {
    it('should log messages with context', () => {
      LoggingService.info('Test message', { userId: '123', action: 'login' });
      
      const logs = LoggingService.getLogs();
      expect(logs[0].context).toEqual({ userId: '123', action: 'login' });
    });
  });

  describe('Log Management', () => {
    it('should maintain maximum memory logs', () => {
      // Log more than MAX_MEMORY_LOGS (1000)
      for (let i = 0; i < 1100; i++) {
        LoggingService.info(`Message ${i}`);
      }
      
      const logs = LoggingService.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });

    it('should export logs as JSON', () => {
      LoggingService.info('Test message 1');
      LoggingService.warn('Test message 2');
      
      const exported = LoggingService.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Test message 1');
      expect(parsed[1].message).toBe('Test message 2');
    });

    it('should clear all logs', () => {
      LoggingService.info('Test message');
      expect(LoggingService.getLogs()).toHaveLength(1);
      
      LoggingService.clearLogs();
      expect(LoggingService.getLogs()).toHaveLength(0);
    });
  });

  describe('Error Logging', () => {
    it('should log PayrollGuardian exceptions with formatted messages', () => {
      const error = new PayrollGuardianException('Custom error message');
      LoggingService.error(error);
      
      const logs = LoggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toContain('Custom error message');
    });

    it('should include stack trace in error logs', () => {
      const error = new Error('Test error');
      LoggingService.error(error);
      
      const logs = LoggingService.getLogs();
      expect(logs[0].stackTrace).toBeDefined();
      expect(logs[0].stackTrace).toContain('Error: Test error');
    });
  });

  describe('Timestamp', () => {
    it('should include ISO timestamp in log entries', () => {
      LoggingService.info('Test message');
      
      const logs = LoggingService.getLogs();
      expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
