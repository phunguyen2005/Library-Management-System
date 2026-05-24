import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage, setAppLanguage, type AppLanguage } from '../i18n';

type LanguageToggleProps = {
  className?: string;
};

export default function LanguageToggle({ className = '' }: LanguageToggleProps) {
  const { t, i18n } = useTranslation();
  const currentLanguage = getCurrentLanguage();
  const nextLanguage: AppLanguage = currentLanguage === 'vi' ? 'en' : 'vi';
  const label = currentLanguage === 'vi' ? t('language.toggleToEnglish') : t('language.toggleToVietnamese');

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const handleToggle = () => {
    setAppLanguage(nextLanguage);
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={currentLanguage === 'en'}
      title={label}
      onClick={handleToggle}
      className={`inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 text-xs font-bold uppercase text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${className}`}
    >
      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
        language
      </span>
      <span>{i18n.language === 'vi' ? 'EN' : 'VI'}</span>
    </button>
  );
}
