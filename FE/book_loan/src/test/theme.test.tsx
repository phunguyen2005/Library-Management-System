import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from '../theme/ThemeContext';
import Landing from '../pages/public/Landing';
import Login from '../pages/auth/Login';

function ThemeProbe() {
  const { theme, isDark } = useTheme();

  return (
    <output data-testid="theme-state">
      {theme}:{String(isDark)}
    </output>
  );
}

function renderWithTheme(ui: React.ReactNode) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function renderPublicRoute(ui: React.ReactNode, path: string) {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={ui} />
            <Route path="/login" element={<div>login page</div>} />
            <Route path="/home" element={<div>home page</div>} />
            <Route path="/admin/dashboard" element={<div>admin page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('ThemeProvider', () => {
  it('defaults to light mode when no theme is stored', async () => {
    renderWithTheme(<ThemeProbe />);

    expect(screen.getByTestId('theme-state')).toHaveTextContent('light:false');
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('toggles dark mode on the document element and persists the choice', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ThemeToggle />);

    // Click trigger to open dropdown
    await user.click(screen.getByRole('button', { name: 'Chọn giao diện' }));

    // Click dark mode option
    await user.click(screen.getByRole('button', { name: 'Chế độ tối' }));

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('restores a stored dark mode preference', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    renderWithTheme(<ThemeToggle />);

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
  });
});

describe('public theme toggles', () => {
  it('shows the theme toggle on the landing header', async () => {
    renderPublicRoute(<Landing />, '/');

    expect(await screen.findByRole('button', { name: 'Chọn giao diện' })).toBeInTheDocument();
  });

  it('shows the theme toggle on the login header', async () => {
    renderPublicRoute(<Login />, '/login');

    expect(await screen.findByRole('button', { name: 'Chọn giao diện' })).toBeInTheDocument();
  });
});
