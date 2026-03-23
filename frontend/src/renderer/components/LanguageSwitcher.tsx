import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

const flags: Record<string, string> = { ja: '🇯🇵', en: '🇺🇸', ko: '🇰🇷', zh: '🇨🇳' };

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
      className="text-xs bg-gray-100 border border-gray-300 rounded px-1.5 py-1 cursor-pointer"
      aria-label="Language"
    >
      {Object.entries(flags).map(([lang, flag]) => (
        <option key={lang} value={lang}>{flag} {lang.toUpperCase()}</option>
      ))}
    </select>
  );
};

export default LanguageSwitcher;
