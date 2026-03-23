import { describe, it, expect } from 'vitest';
import { validateHttpsUrl } from './validation';

describe('validateHttpsUrl', () => {
  it('should accept valid HTTPS URLs', () => {
    const result = validateHttpsUrl('https://docs.google.com/forms/d/e/1FAIpQLSc');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject HTTP URLs', () => {
    const result = validateHttpsUrl('http://example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('HTTPSプロトコルのURLを入力してください');
  });

  it('should reject empty strings', () => {
    const result = validateHttpsUrl('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('URLを入力してください');
  });

  it('should reject whitespace-only strings', () => {
    const result = validateHttpsUrl('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('URLを入力してください');
  });

  it('should reject invalid URLs', () => {
    const result = validateHttpsUrl('not-a-url');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('有効なURLを入力してください');
  });

  it('should accept HTTPS URLs with query parameters', () => {
    const result = validateHttpsUrl('https://example.com/path?param=value');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should accept HTTPS URLs with fragments', () => {
    const result = validateHttpsUrl('https://example.com/path#section');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
