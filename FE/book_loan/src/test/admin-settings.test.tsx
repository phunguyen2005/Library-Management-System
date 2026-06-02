import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminSettings from '../pages/admin/AdminSettings';

const {
  updateMyProfileMock,
  sendPasswordOtpMock,
  verifyPasswordOtpMock,
  updateUserMock,
  fetchLibrarySettingsMock,
  updateLibrarySettingsMock,
} = vi.hoisted(() => ({
  updateMyProfileMock: vi.fn(),
  sendPasswordOtpMock: vi.fn(),
  verifyPasswordOtpMock: vi.fn(),
  updateUserMock: vi.fn(),
  fetchLibrarySettingsMock: vi.fn(),
  updateLibrarySettingsMock: vi.fn(),
}));

vi.mock('../api/userApi', () => ({
  updateMyProfile: (...args: unknown[]) => updateMyProfileMock(...args),
  sendPasswordOtp: () => sendPasswordOtpMock(),
  verifyPasswordOtp: (otp: string) => verifyPasswordOtpMock(otp),
}));

vi.mock('../api/librarySettingsApi', () => ({
  fetchLibrarySettings: () => fetchLibrarySettingsMock(),
  updateLibrarySettings: (payload: unknown) => updateLibrarySettingsMock(payload),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      librarian_id: 1,
      name: 'Old Admin',
      email: 'old.admin@hcmue.edu.vn',
      phone_number: '0901000001',
    },
    updateUser: updateUserMock,
  }),
}));

describe('AdminSettings', () => {
  it('loads backend settings and explains how they apply', async () => {
    fetchLibrarySettingsMock.mockResolvedValueOnce({
      loan_period_days: 14,
      max_active_loans: 5,
      fine_per_day: 5000,
      max_fine_per_loan: 200000,
      grace_period_days: 0,
    });

    render(<AdminSettings />);

    expect(await screen.findByTestId('borrow-settings-note')).toBeInTheDocument();
    expect(screen.getByTestId('admin-librarian-id')).toHaveValue('1');
    expect(screen.getByTestId('admin-email')).toHaveValue('old.admin@hcmue.edu.vn');
    expect(screen.getByTestId('admin-email')).toHaveAttribute('readonly');
  });

  it('saves admin profile details through the authenticated profile API', async () => {
    const user = userEvent.setup();
    updateMyProfileMock.mockResolvedValueOnce({
      message: 'Cập nhật hồ sơ thành công.',
      role: 'admin',
      user: {
        librarian_id: 1,
        name: 'Updated Admin',
        email: 'old.admin@hcmue.edu.vn',
        phone_number: '0901999999',
      },
    });

    fetchLibrarySettingsMock.mockResolvedValueOnce({
      loan_period_days: 14,
      max_active_loans: 5,
      fine_per_day: 5000,
      max_fine_per_loan: 200000,
      grace_period_days: 0,
    });

    render(<AdminSettings />);

    await user.clear(await screen.findByTestId('admin-name'));
    await user.type(screen.getByTestId('admin-name'), 'Updated Admin');
    await user.clear(screen.getByTestId('admin-phone'));
    await user.type(screen.getByTestId('admin-phone'), '0901999999');
    await user.click(screen.getByTestId('save-admin-profile'));

    expect(updateMyProfileMock).toHaveBeenCalledWith({
      name: 'Updated Admin',
      phone_number: '0901999999',
      current_password: undefined,
      password: undefined,
      password_confirmation: undefined,
    });
    expect(updateUserMock).toHaveBeenCalledWith({
      librarian_id: 1,
      name: 'Updated Admin',
      email: 'old.admin@hcmue.edu.vn',
      phone_number: '0901999999',
    });
  });

  it('submits password fields without allowing email edits, requiring OTP flow', async () => {
    const user = userEvent.setup();
    sendPasswordOtpMock.mockResolvedValueOnce({ message: 'Success' });
    verifyPasswordOtpMock.mockResolvedValueOnce({ message: 'Success' });
    updateMyProfileMock.mockResolvedValueOnce({
      message: 'Cập nhật hồ sơ thành công.',
      role: 'admin',
      user: {
        librarian_id: 1,
        name: 'Old Admin',
        email: 'old.admin@hcmue.edu.vn',
        phone_number: '0901000001',
      },
    });

    fetchLibrarySettingsMock.mockResolvedValueOnce({
      loan_period_days: 14,
      max_active_loans: 5,
      fine_per_day: 5000,
      max_fine_per_loan: 200000,
      grace_period_days: 0,
    });

    render(<AdminSettings />);

    // Click "Thay đổi mật khẩu" to trigger OTP sending
    const changePasswordBtn = await screen.findByRole('button', { name: 'Thay đổi mật khẩu' });
    await user.click(changePasswordBtn);

    expect(sendPasswordOtpMock).toHaveBeenCalled();

    // Fill in OTP and click "Tiếp tục"
    const otpInput = await screen.findByLabelText('Mã OTP đổi mật khẩu');
    await user.type(otpInput, '123456');
    await user.click(screen.getByRole('button', { name: 'Tiếp tục' }));

    expect(verifyPasswordOtpMock).toHaveBeenCalledWith('123456');

    // Fill in the new password fields in step 2
    const passwordInput = await screen.findByLabelText('Mật khẩu mới');
    const confirmInput = screen.getByLabelText('Xác nhận mật khẩu mới');
    await user.type(passwordInput, 'NewPass123');
    await user.type(confirmInput, 'NewPass123');
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }));

    expect(updateMyProfileMock).toHaveBeenCalledWith({
      name: 'Old Admin',
      phone_number: '0901000001',
      password: 'NewPass123',
      password_confirmation: 'NewPass123',
      otp: '123456',
    });
    expect(screen.getByTestId('admin-email')).toHaveAttribute('readonly');
  });

  it('saves borrowing rules through the settings API', async () => {
    const user = userEvent.setup();
    fetchLibrarySettingsMock.mockResolvedValueOnce({
      loan_period_days: 14,
      max_active_loans: 5,
      fine_per_day: 5000,
      max_fine_per_loan: 200000,
      grace_period_days: 0,
    });
    updateLibrarySettingsMock.mockResolvedValueOnce({
      loan_period_days: 21,
      max_active_loans: 7,
      fine_per_day: 10000,
      max_fine_per_loan: 150000,
      grace_period_days: 2,
    });

    render(<AdminSettings />);

    await user.clear(await screen.findByTestId('loan-period-days'));
    await user.type(screen.getByTestId('loan-period-days'), '21');
    await user.clear(screen.getByTestId('max-active-loans'));
    await user.type(screen.getByTestId('max-active-loans'), '7');
    await user.clear(screen.getByTestId('fine-per-day'));
    await user.type(screen.getByTestId('fine-per-day'), '10000');
    await user.clear(screen.getByTestId('max-fine-per-loan'));
    await user.type(screen.getByTestId('max-fine-per-loan'), '150000');
    await user.clear(screen.getByTestId('grace-period-days'));
    await user.type(screen.getByTestId('grace-period-days'), '2');
    await user.click(screen.getByTestId('save-borrow-settings'));

    expect(updateLibrarySettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        loan_period_days: 21,
        max_active_loans: 7,
        fine_per_day: 10000,
        max_fine_per_loan: 150000,
        grace_period_days: 2,
      })
    );
  });
});
