import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './locales/ja.json';
import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

function getSavedLanguage(): string {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      const stored = localStorage.getItem('app_language');
      if (stored) {
        return stored;
      }
    }
  } catch {
    // ignore storage access errors in tests / restricted environments
  }

  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    return navigator.language.split('-')[0];
  }

  return 'en';
}

const savedLang = getSavedLanguage();
const defaultLang = ['ja', 'en', 'ko', 'zh'].includes(savedLang) ? savedLang : 'en';

i18n.use(initReactI18next).init({
  resources: { ja: { translation: ja }, en: { translation: en }, ko: { translation: ko }, zh: { translation: zh } },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
export const changeLanguage = (lang: string) => {
  try {
    if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
      localStorage.setItem('app_language', lang);
    }
  } catch {
    // ignore storage access errors in tests / restricted environments
  }
  return i18n.changeLanguage(lang);
};
export const getCurrentLanguage = () => i18n.language;
