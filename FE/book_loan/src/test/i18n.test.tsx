import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageToggle from '../components/LanguageToggle';
import {
  LANGUAGE_STORAGE_KEY,
  getCurrentLanguage,
  setAppLanguage,
} from '../i18n';
import { apiRequest } from '../api/client';

vi.mock('../auth/storage', () => ({
  getStoredToken: () => null,
}));

describe('LanguageToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  it('defaults to Vietnamese and switches to English persistently', async () => {
    const user = userEvent.setup();

    render(<LanguageToggle />);

    expect(getCurrentLanguage()).toBe('vi');
    expect(document.documentElement.lang).toBe('vi');

    await user.click(screen.getByRole('button', { name: 'Switch language to English' }));

    expect(getCurrentLanguage()).toBe('en');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(screen.getByRole('button', { name: 'Switch language to Vietnamese' })).toBeInTheDocument();
  });
});

describe('apiRequest localization', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: 'ok' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  it('sends the selected language with API requests', async () => {
    setAppLanguage('en');

    await apiRequest('/health', { auth: false });

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const headers = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].headers as Headers;

    expect(headers.get('Accept-Language')).toBe('en');
  });
});
