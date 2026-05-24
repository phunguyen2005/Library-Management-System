import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

export type AppLanguage = 'vi' | 'en';

export const LANGUAGE_STORAGE_KEY = 'book-loan-language';

const SUPPORTED_LANGUAGES: AppLanguage[] = ['vi', 'en'];

function normalizeLanguage(value?: string | null): AppLanguage {
  const language = value?.toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.includes(language as AppLanguage) ? (language as AppLanguage) : 'vi';
}

function getStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'vi';
  }

  try {
    return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return 'vi';
  }
}

function persistLanguage(language: AppLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language changes should still apply even if storage is unavailable.
  }
}

function applyDocumentLanguage(language: AppLanguage) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
  }
}

const initialLanguage = getStoredLanguage();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'vi',
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: {
    escapeValue: false,
  },
});

applyDocumentLanguage(initialLanguage);

i18n.on('languageChanged', (language) => {
  const normalizedLanguage = normalizeLanguage(language);
  persistLanguage(normalizedLanguage);
  applyDocumentLanguage(normalizedLanguage);
});

export function getCurrentLanguage(): AppLanguage {
  return normalizeLanguage(i18n.resolvedLanguage || i18n.language || getStoredLanguage());
}

export function setAppLanguage(language: AppLanguage) {
  const normalizedLanguage = normalizeLanguage(language);
  persistLanguage(normalizedLanguage);
  applyDocumentLanguage(normalizedLanguage);
  void i18n.changeLanguage(normalizedLanguage);
}

export function getIntlLocale(language: AppLanguage = getCurrentLanguage()) {
  return language === 'en' ? 'en-US' : 'vi-VN';
}

export default i18n;
