import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? t('theme.light') : t('theme.dark');

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={toggleTheme}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/25 ${className}`}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
}
