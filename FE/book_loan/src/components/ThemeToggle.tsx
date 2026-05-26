import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTheme = (mode: 'light' | 'dark') => {
    setTheme(mode);
    setIsOpen(false);
  };

  const isDark = theme === 'dark';
  const label = t('theme.selectTheme');

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title={label}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {isDark ? 'dark_mode' : 'light_mode'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-max origin-top-right rounded-xl border border-surface-container-low bg-surface-bright p-1 shadow-2xl ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => handleSelectTheme('light')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">light_mode</span>
              <span className="flex-1 whitespace-nowrap pr-2">{t('theme.lightLabel')}</span>
              {theme === 'light' && (
                <span className="material-symbols-outlined text-[16px] font-bold ml-auto" aria-hidden="true">check</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">dark_mode</span>
              <span className="flex-1 whitespace-nowrap pr-2">{t('theme.darkLabel')}</span>
              {theme === 'dark' && (
                <span className="material-symbols-outlined text-[16px] font-bold ml-auto" aria-hidden="true">check</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

