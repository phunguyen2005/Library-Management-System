import { describe, expect, it } from 'vitest';
import {
  FALLBACK_COVER_URL,
  applyImageFallback,
  formatDisplayDate,
  getCoverUrl,
  getLoanDueLabel,
} from '../lib/display';

describe('display helpers', () => {
  it('uses a stable fallback cover when the API has no usable image', () => {
    expect(getCoverUrl(null)).toBe(FALLBACK_COVER_URL);
    expect(getCoverUrl('   ')).toBe(FALLBACK_COVER_URL);
    expect(getCoverUrl('https://example.com/cover.jpg')).toBe('https://example.com/cover.jpg');
  });

  it('replaces a broken image source with the fallback cover', () => {
    const image = document.createElement('img');
    image.src = 'https://example.com/missing.jpg';

    applyImageFallback(image);

    expect(image.src).toBe(FALLBACK_COVER_URL);
  });

  it('formats missing and invalid dates without exposing browser Invalid Date text', () => {
    expect(formatDisplayDate(null)).toBe('N/A');
    expect(formatDisplayDate('not-a-date')).toBe('N/A');
  });

  it('labels active loan due dates without negative days-left wording', () => {
    const now = new Date('2026-05-10T12:00:00.000Z');

    expect(getLoanDueLabel('2026-05-13', now)).toEqual({
      label: 'Còn 3 ngày',
      isWarning: true,
      isOverdue: false,
      daysDelta: 3,
    });
    expect(getLoanDueLabel('2026-05-10', now).label).toBe('Đến hạn hôm nay');
    expect(getLoanDueLabel('2026-05-08', now)).toEqual({
      label: 'Quá hạn 2 ngày',
      isWarning: true,
      isOverdue: true,
      daysDelta: -2,
    });
  });
});
