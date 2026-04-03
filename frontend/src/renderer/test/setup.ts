import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import i18n from '../i18n';

const localStorageMock = {
  getItem: vi.fn((key: string) => (key === 'app_language' ? 'ja' : null)),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(globalThis.navigator, 'language', {
  value: 'ja-JP',
  configurable: true,
});

await i18n.changeLanguage('ja');
