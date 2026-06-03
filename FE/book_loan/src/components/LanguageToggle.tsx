import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage, setAppLanguage, type AppLanguage } from '../i18n';

type LanguageToggleProps = {
  className?: string;
};

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
] as const;

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { t } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Sync html lang attribute
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const currentLangObj = LANGUAGES.find(l => l.code === currentLanguage) || LANGUAGES[0];

  const handleSelectLanguage = (langCode: AppLanguage) => {
    if (langCode === currentLanguage) {
      setIsOpen(false);
      return;
    }

    const targetLang = LANGUAGES.find(l => l.code === langCode);
    const targetLabel = targetLang ? targetLang.label : langCode;
    const confirmMsg = t('language.confirmChange', { lang: targetLabel });

    if (window.confirm(confirmMsg)) {
      setAppLanguage(langCode);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-label={t('language.label') || 'Select Language'}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold uppercase text-on-surface-variant transition-all hover:bg-surface-container-low hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/25 border border-outline/10 bg-surface/50 backdrop-blur-sm shadow-sm"
      >
        <span className="text-base" role="img" aria-hidden="true">
          {currentLangObj.flag}
        </span>
        <span className="hidden sm:inline text-xs font-bold tracking-wider">{currentLangObj.code}</span>
        <span className="material-symbols-outlined text-[16px] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          keyboard_arrow_down
        </span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Language selection"
          className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl border border-outline/10 bg-surface-container-high/95 p-1.5 shadow-xl backdrop-blur-md transition-all z-[999] focus:outline-none animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <li key={lang.code} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all hover:bg-primary/10 hover:text-primary ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-on-surface font-normal'
                  }`}
                >
                  <span className="text-lg" role="img" aria-label={lang.label}>
                    {lang.flag}
                  </span>
                  <span className="flex-1">{lang.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-sm font-bold text-primary">
                      check
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
