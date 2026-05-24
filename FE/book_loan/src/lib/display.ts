import i18n, { getIntlLocale } from '../i18n';

export const FALLBACK_COVER_URL =
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getCoverUrl(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || FALLBACK_COVER_URL;
}

export function applyImageFallback(image: HTMLImageElement) {
  if (image.src !== FALLBACK_COVER_URL) {
    image.src = FALLBACK_COVER_URL;
  }
}

export function formatDisplayDate(value?: string | null, fallback = 'N/A') {
  const date = parseDate(value);

  if (!date) {
    return fallback;
  }

  return date.toLocaleDateString(getIntlLocale());
}

export function formatDisplayCurrency(value: string | number) {
  return `${Number(value || 0).toLocaleString(getIntlLocale())} VND`;
}

export function getLoanDueLabel(value?: string | null, now = new Date()) {
  const dueDate = parseDate(value);

  if (!dueDate) {
    return {
      label: i18n.t('due.none'),
      isWarning: false,
      isOverdue: false,
      daysDelta: 0,
    };
  }

  const today = startOfLocalDay(now);
  const dueDay = startOfLocalDay(dueDate);
  const daysDelta = Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);

  if (daysDelta < 0) {
    return {
      label: i18n.t('due.overdue', { count: Math.abs(daysDelta) }),
      isWarning: true,
      isOverdue: true,
      daysDelta,
    };
  }

  if (daysDelta === 0) {
    return {
      label: i18n.t('due.today'),
      isWarning: true,
      isOverdue: false,
      daysDelta,
    };
  }

  return {
    label: i18n.t('due.remaining', { count: daysDelta }),
    isWarning: daysDelta <= 3,
    isOverdue: false,
    daysDelta,
  };
}
