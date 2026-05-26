import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '../i18n';
import Header from '../components/Header';
import type { AuthUser } from '../auth/storage';

const { logoutMock, useAuthMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../api/bookApi', () => ({
  searchBooks: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../components/ThemeToggle', () => ({
  default: () => <button type="button">Theme toggle</button>,
}));

vi.mock('../components/LanguageToggle', () => ({
  default: () => <button type="button">Language toggle</button>,
}));

vi.mock('../components/NotificationDropdown', () => ({
  default: () => <button type="button">Notifications</button>,
}));

const student: AuthUser = {
  member_id: 4801104101,
  name: 'Nguyễn Phú Gia',
  email: 'phugia@student.hcmue.edu.vn',
  level: 3,
};

function LocationProbe() {
  const location = useLocation();

  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <Header onToggleSidebar={vi.fn()} onOpenMap={vi.fn()} />
      <button type="button">Outside target</button>
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('Header account menu', () => {
  beforeEach(() => {
    logoutMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      user: student,
      role: 'student',
      logout: logoutMock,
    });
  });

  it('keeps the header compact and opens the student identity dropdown', async () => {
    const user = userEvent.setup();
    renderHeader();

    expect(screen.getByRole('button', { name: 'Mở menu tài khoản' })).toHaveTextContent('Nguyễn Phú Gia');
    expect(screen.queryByText('phugia@student.hcmue.edu.vn')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));

    const menu = screen.getByRole('menu', { name: 'Mở menu tài khoản' });
    expect(within(menu).getByText('Nguyễn Phú Gia')).toBeInTheDocument();
    expect(within(menu).getByText('phugia@student.hcmue.edu.vn')).toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);
    expect(within(menu).getByRole('menuitem', { name: 'Hồ sơ của tôi' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Thành tích & phần thưởng' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();
  });

  it('navigates from the account dropdown actions and logs out', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
    await user.click(screen.getByRole('menuitem', { name: 'Hồ sơ của tôi' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/settings');

    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
    await user.click(screen.getByRole('menuitem', { name: 'Thành tích & phần thưởng' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/gamify');

    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
    await user.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/');
  });

  it('closes the account dropdown with Escape and outside clicks', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
    expect(screen.getByRole('menu', { name: 'Mở menu tài khoản' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu', { name: 'Mở menu tài khoản' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mở menu tài khoản' }));
    await user.click(screen.getByRole('button', { name: 'Outside target' }));
    expect(screen.queryByRole('menu', { name: 'Mở menu tài khoản' })).not.toBeInTheDocument();
  });
});
