import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ja from './locales/ja.json';
import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

const savedLang = localStorage.getItem('app_language') || navigator.language.split('-')[0];
const defaultLang = ['ja', 'en', 'ko', 'zh'].includes(savedLang) ? savedLang : 'en';

i18n.use(initReactI18next).init({
  resources: { ja: { translation: ja }, en: { translation: en }, ko: { translation: ko }, zh: { translation: zh } },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
export const changeLanguage = (lang: string) => {
  localStorage.setItem('app_language', lang);
  i18n.changeLanguage(lang);
};
export const getCurrentLanguage = () => i18n.language;
