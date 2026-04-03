import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n';

import flagJP from '../assets/flags/ja.svg';
import flagUS from '../assets/flags/en.svg';
import flagKR from '../assets/flags/ko.svg';
import flagCN from '../assets/flags/zh.svg';

const flagMap: Record<string, { src: string; label: string }> = {
  ja: { src: flagJP, label: '日本語' },
  en: { src: flagUS, label: 'English' },
  ko: { src: flagKR, label: '한국어' },
  zh: { src: flagCN, label: '中文' },
};

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const current = flagMap[i18n.language] || flagMap.en;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 text-xs bg-gray-100 border border-gray-300 rounded px-2 py-1 cursor-pointer"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <img src={current.src} alt={current.label} className="w-4 h-3 object-cover" />
        <span className="hidden sm:inline">{i18n.language.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50">
          {Object.entries(flagMap).map(([lang, { src, label }]) => (
            <button
              key={lang}
              onClick={() => {
                changeLanguage(lang);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              <img src={src} alt={label} className="w-5 h-4 object-cover" />
              <span className="flex-1">{label}</span>
              <span className="text-xs text-gray-400">{lang.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
