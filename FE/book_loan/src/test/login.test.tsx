import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import Login from '../pages/auth/Login';
import { ThemeProvider } from '../theme/ThemeContext';

const loginUserMock = vi.fn();
const registerStudentMock = vi.fn();

vi.mock('../api/authApi', () => ({
  loginUser: (...args: unknown[]) => loginUserMock(...args),
  registerStudent: (...args: unknown[]) => registerStudentMock(...args),
}));

function renderLogin() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/home" element={<div>home page</div>} />
            <Route path="/admin/dashboard" element={<div>admin page</div>} />
            <Route path="/verify-otp" element={<div>verify otp page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    loginUserMock.mockReset();
    registerStudentMock.mockReset();
  });

  it('does not render role selection controls on the login form', () => {
    renderLogin();

    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('logs in a student with email and password only, then redirects to home', async () => {
    const user = userEvent.setup();
    loginUserMock.mockResolvedValueOnce({
      message: 'Logged in',
      user: {
        member_id: 7,
        name: 'Nguyen Van A',
        email: 'student@example.com',
      },
      role: 'student',
      token: 'student-token',
    });

    const { container } = renderLogin();

    await user.type(screen.getByPlaceholderText('email@hcmue.edu.vn'), 'student@example.com');
    await user.type(container.querySelector('input[type="password"]')!, 'Password123');
    await user.click(container.querySelector('button[type="submit"]')!);

    expect(loginUserMock).toHaveBeenCalledWith('student@example.com', 'Password123');
    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(localStorage.getItem('book-loan-auth')).toContain('student-token');
  }, 10000);

  it('redirects admins to the admin dashboard based on the backend role', async () => {
    const user = userEvent.setup();
    loginUserMock.mockResolvedValueOnce({
      message: 'Logged in',
      user: {
        librarian_id: 1,
        name: 'Nguyen Van An',
        email: 'admin@example.com',
      },
      role: 'admin',
      token: 'admin-token',
    });

    const { container } = renderLogin();

    await user.type(screen.getByPlaceholderText('email@hcmue.edu.vn'), 'admin@example.com');
    await user.type(container.querySelector('input[type="password"]')!, 'Password123');
    await user.click(container.querySelector('button[type="submit"]')!);

    expect(loginUserMock).toHaveBeenCalledWith('admin@example.com', 'Password123');
    expect(await screen.findByText('admin page')).toBeInTheDocument();
  }, 10000);

  it('redirects to OTP verification when the backend requires OTP', async () => {
    const user = userEvent.setup();
    loginUserMock.mockResolvedValueOnce({
      message: 'OTP required',
      email: 'student@example.com',
      require_otp: true,
    });

    const { container } = renderLogin();

    await user.type(screen.getByPlaceholderText('email@hcmue.edu.vn'), 'student@example.com');
    await user.type(container.querySelector('input[type="password"]')!, 'Password123');
    await user.click(container.querySelector('button[type="submit"]')!);

    expect(loginUserMock).toHaveBeenCalledWith('student@example.com', 'Password123');
    expect(await screen.findByText('verify otp page')).toBeInTheDocument();
  }, 10000);

  it('shows register validation feedback inline', async () => {
    const user = userEvent.setup();
    registerStudentMock.mockRejectedValueOnce(new Error('Email khong hop le'));

    const { container } = renderLogin();
    const registerTab = Array.from(screen.getAllByRole('button')).find((button) =>
      button.textContent?.includes('Đăng ký'),
    );

    await user.click(registerTab!);
    await user.type(screen.getByPlaceholderText('Nguyễn Văn A'), 'Nguyen Van A');
    await user.type(screen.getByPlaceholderText('email@hcmue.edu.vn'), 'invalid@example.com');
    await user.type(container.querySelector('input[type="password"]')!, 'Password123');
    await user.click(container.querySelector('button[type="submit"]')!);

    await waitFor(() => {
      expect(screen.getByText('Email khong hop le')).toBeInTheDocument();
    });
  });
});
