import React, { useEffect, useState } from 'react';
import { fetchLibrarySettings, updateLibrarySettings, type LibrarySettings } from '../../api/librarySettingsApi';
import { getActiveDevices, revokeDevice, type DeviceSession } from '../../api/authApi';
import { updateMyProfile, sendPasswordOtp, verifyPasswordOtp } from '../../api/userApi';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

const defaultSettings: LibrarySettings = {
  loan_period_days: 14,
  max_active_loans: 5,
  fine_per_day: 5000,
  max_fine_per_loan: 200000,
  grace_period_days: 0,
  room_max_hours_per_booking: 3,
  room_max_hours_per_week: 4,
  room_max_bookings_per_day: 2,
  room_advance_booking_days: 7,
  room_min_group_size: 2,
  room_checkin_window_minutes: 15,
  room_booking_requires_approval: false,
  room_open_time: '07:00',
  room_close_time: '21:00',
  room_cancel_deadline_hours: 2,
  pickup_deadline_hours: 24,
  max_missed_pickups: 3,
  suspension_duration_days: 14,
};

type ProfileForm = {
  name: string;
  email: string;
  phone_number: string;
};

const emptyProfileForm: ProfileForm = {
  name: '',
  email: '',
  phone_number: '',
};

export default function AdminSettings() {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState<LibrarySettings>(defaultSettings);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyProfileForm);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    password_confirmation: '',
    otp: '',
  });
  const [otpCountdown, setOtpCountdown] = useState(300);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendingOtp, setResendingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    if (showPasswordModal && otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showPasswordModal, otpCountdown]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await getActiveDevices();
      setDevices(res);
    } catch (e) {
      // Ignore
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleRevoke = async (tokenId: string) => {
    try {
      await revokeDevice(tokenId);
      emitToast({ tone: 'success', title: 'Thành công', message: 'Đã hủy phiên làm việc của thiết bị thành công.' });
      setDevices((prev) => prev.filter((d) => d.token_id !== tokenId));
    } catch (error: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: error?.message || 'Không thể hủy phiên đăng nhập.' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    setIsLoadingSettings(true);
    setSettingsError(null);

    fetchLibrarySettings()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        setSettings({
          ...defaultSettings,
          loan_period_days: data.loan_period_days,
          max_active_loans: data.max_active_loans,
          fine_per_day: data.fine_per_day ?? 5000,
          max_fine_per_loan: data.max_fine_per_loan ?? 200000,
          grace_period_days: data.grace_period_days ?? 0,
          room_max_hours_per_booking: data.room_max_hours_per_booking ?? 3,
          room_max_hours_per_week: data.room_max_hours_per_week ?? 4,
          room_max_bookings_per_day: data.room_max_bookings_per_day ?? 2,
          room_advance_booking_days: data.room_advance_booking_days ?? 7,
          room_min_group_size: data.room_min_group_size ?? 2,
          room_checkin_window_minutes: data.room_checkin_window_minutes ?? 15,
          room_booking_requires_approval: data.room_booking_requires_approval ?? false,
          room_open_time: data.room_open_time ?? '07:00',
          room_close_time: data.room_close_time ?? '21:00',
          room_cancel_deadline_hours: data.room_cancel_deadline_hours ?? 2,
          pickup_deadline_hours: data.pickup_deadline_hours ?? 24,
          max_missed_pickups: data.max_missed_pickups ?? 3,
          suspension_duration_days: data.suspension_duration_days ?? 14,
        });
      })
      .catch((error: unknown) => {
        if (!isMounted || isUnauthorizedError(error)) {
          return;
        }

        const message = getErrorMessage(error, 'Không thể tải quy tắc mượn sách.');
        setSettingsError(message);
        emitToast({ tone: 'error', title: 'Không thể tải quy tắc mượn sách', message });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingSettings(false);
        }
      });

    fetchDevices();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setProfileForm((current) => ({
      ...current,
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
    }));
  }, [user?.email, user?.name, user?.phone_number]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setProfileFeedback(null);

    try {
      const response = await updateMyProfile({
        name: profileForm.name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
      });

      updateUser(response.user);
      const message = response.message || 'Đã cập nhật hồ sơ quản trị.';
      setProfileFeedback(message);
      emitToast({ tone: 'success', title: 'Đã cập nhật hồ sơ', message });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể cập nhật hồ sơ quản trị.');
      setProfileFeedback(message);
      emitToast({ tone: 'error', title: 'Không thể cập nhật hồ sơ', message });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenPasswordModal = async () => {
    try {
      setProfileFeedback(null);
      setIsSendingOtp(true);
      await sendPasswordOtp();
      setIsSendingOtp(false);
      setOtpCountdown(300);
      setIsOtpVerified(false);
      setPasswordForm({
        password: '',
        password_confirmation: '',
        otp: '',
      });
      setOtpError(null);
      setShowPasswordModal(true);
      emitToast({
        tone: 'success',
        title: 'Mã OTP đã gửi',
        message: 'Vui lòng kiểm tra email của bạn để nhận mã xác thực.',
      });
    } catch (error: unknown) {
      setIsSendingOtp(false);
      const message = getErrorMessage(error, 'Không thể gửi mã xác thực OTP.');
      setProfileFeedback(message);
      emitToast({
        tone: 'error',
        title: 'Không thể gửi OTP',
        message,
      });
    }
  };

  const handleVerifyOtpStep = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.otp.length !== 6) return;

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      await verifyPasswordOtp(passwordForm.otp);
      setIsOtpVerified(true);
      setOtpError(null);
      emitToast({
        tone: 'success',
        title: 'Xác thực thành công',
        message: 'Vui lòng thiết lập mật khẩu mới của bạn.',
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Mã OTP không chính xác hoặc đã hết hạn.');
      setOtpError(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setOtpError(null);

    try {
      const response = await updateMyProfile({
        name: profileForm.name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
        otp: passwordForm.otp,
      });

      updateUser(response.user);
      setProfileForm((current) => ({
        ...current,
        password: '',
        password_confirmation: '',
      }));

      const message = response.message || 'Thay đổi mật khẩu thành công.';
      setProfileFeedback(message);
      emitToast({
        tone: 'success',
        title: 'Thành công',
        message: response.message || 'Đổi mật khẩu thành công.',
      });
      setShowPasswordModal(false);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Không thể cập nhật mật khẩu mới.');
      setOtpError(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResendOtp = async () => {
    setResendingOtp(true);
    setOtpError(null);

    try {
      await sendPasswordOtp();
      setOtpCountdown(300);
      setPasswordForm((prev) => ({ ...prev, otp: '' }));
      emitToast({
        tone: 'success',
        title: 'Mã OTP mới đã gửi',
        message: 'Mã xác thực mới đã được gửi về email của bạn.',
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Không thể gửi lại mã xác thực.');
      setOtpError(message);
    } finally {
      setResendingOtp(false);
    }
  };

  const handleSettingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingSettings(true);
    setSettingsFeedback(null);
    setSettingsError(null);

    try {
      const response = await updateLibrarySettings({
        loan_period_days: settings.loan_period_days,
        max_active_loans: settings.max_active_loans,
        fine_per_day: settings.fine_per_day,
        max_fine_per_loan: settings.max_fine_per_loan,
        grace_period_days: settings.grace_period_days,
        room_max_hours_per_booking: settings.room_max_hours_per_booking,
        room_max_hours_per_week: settings.room_max_hours_per_week,
        room_max_bookings_per_day: settings.room_max_bookings_per_day,
        room_advance_booking_days: settings.room_advance_booking_days,
        room_min_group_size: settings.room_min_group_size,
        room_checkin_window_minutes: settings.room_checkin_window_minutes,
        room_booking_requires_approval: settings.room_booking_requires_approval,
        room_open_time: settings.room_open_time,
        room_close_time: settings.room_close_time,
        room_cancel_deadline_hours: settings.room_cancel_deadline_hours,
        pickup_deadline_hours: settings.pickup_deadline_hours,
        max_missed_pickups: settings.max_missed_pickups,
        suspension_duration_days: settings.suspension_duration_days,
      });

      setSettings({
        ...settings,
        loan_period_days: response.loan_period_days,
        max_active_loans: response.max_active_loans,
        fine_per_day: response.fine_per_day,
        max_fine_per_loan: response.max_fine_per_loan,
        grace_period_days: response.grace_period_days,
        room_max_hours_per_booking: response.room_max_hours_per_booking,
        room_max_hours_per_week: response.room_max_hours_per_week,
        room_max_bookings_per_day: response.room_max_bookings_per_day,
        room_advance_booking_days: response.room_advance_booking_days,
        room_min_group_size: response.room_min_group_size,
        room_checkin_window_minutes: response.room_checkin_window_minutes,
        room_booking_requires_approval: response.room_booking_requires_approval,
        room_open_time: response.room_open_time,
        room_close_time: response.room_close_time,
        room_cancel_deadline_hours: response.room_cancel_deadline_hours,
        pickup_deadline_hours: response.pickup_deadline_hours,
        max_missed_pickups: response.max_missed_pickups,
        suspension_duration_days: response.suspension_duration_days,
      });

      const message = 'Đã cập nhật quy tắc mượn sách.';
      setSettingsFeedback(message);
      emitToast({ tone: 'success', title: 'Đã lưu quy tắc mượn sách', message });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể lưu quy tắc mượn sách.');
      setSettingsError(message);
      emitToast({ tone: 'error', title: 'Không thể lưu quy tắc mượn sách', message });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Cài đặt quản trị</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quản lý hồ sơ thủ thư và quy tắc mượn sách.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleProfileSubmit}
        className="space-y-6 rounded-2xl border border-surface-container-low bg-surface-bright p-8 scholar-shadow"
      >
        <div>
          <h3 className="text-xl font-bold text-on-surface">Thông tin cá nhân</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Các thông tin này được lưu qua API hồ sơ Laravel.
          </p>
        </div>

        {profileFeedback ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {profileFeedback}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Họ và tên
            </span>
            <input
              aria-label="Họ tên quản trị"
              data-testid="admin-name"
              required
              type="text"
              value={profileForm.name}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Mã thủ thư
            </span>
            <input
              aria-label="Mã thủ thư"
              data-testid="admin-librarian-id"
              type="text"
              value={user?.librarian_id ?? ''}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Email
            </span>
            <input
              aria-label="Email quản trị"
              data-testid="admin-email"
              type="email"
              value={profileForm.email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Số điện thoại
            </span>
            <input
              aria-label="Số điện thoại quản trị"
              data-testid="admin-phone"
              type="tel"
              value={profileForm.phone_number}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, phone_number: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            aria-label="Lưu hồ sơ quản trị"
            data-testid="save-admin-profile"
            disabled={isSavingProfile}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">save</span>
            {isSavingProfile ? 'Đang lưu...' : 'Lưu hồ sơ quản trị'}
          </button>
        </div>
      </form>

      <section className="space-y-6 rounded-2xl border border-surface-container-low bg-surface-bright p-8 scholar-shadow">
        <div>
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined filled text-[20px] text-orange-500">
              lock
            </span>
            Bảo mật tài khoản
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Thay đổi mật khẩu tài khoản của bạn để bảo mật thông tin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Mật khẩu tài khoản</p>
            <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ gửi mã OTP xác thực về email quản trị trước khi đặt lại.</p>
          </div>
          <button
            type="button"
            onClick={handleOpenPasswordModal}
            disabled={isSendingOtp}
            className="w-full sm:w-auto text-center text-xs font-bold text-primary hover:text-white bg-white border border-primary hover:bg-primary px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {isSendingOtp ? 'Đang gửi mã...' : 'Thay đổi mật khẩu'}
          </button>
        </div>
      </section>

      <form onSubmit={handleSettingsSubmit} className="space-y-8">
        <div
          data-testid="borrow-settings-note"
          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <p className="font-semibold">Quy tắc mượn sách được lưu trên hệ thống.</p>
          <p className="mt-1">
            Thời hạn mượn mới chỉ áp dụng cho các yêu cầu được duyệt sau khi lưu. Các sách đã mượn
            giữ nguyên ngày đến hạn hiện tại.
          </p>
        </div>

        {settingsError ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          >
            {settingsError}
          </div>
        ) : null}

        {settingsFeedback ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {settingsFeedback}
          </div>
        ) : null}

        <div className="space-y-10 overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright p-8 scholar-shadow">
          <section>
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h4 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="material-symbols-outlined filled text-[20px] text-primary">
                  timelapse
                </span>
                Quy tắc mượn sách
              </h4>
              <button
                type="submit"
                disabled={isSavingSettings || isLoadingSettings}
                data-testid="save-borrow-settings"
                className="flex items-center gap-2 rounded-xl bg-surface-container px-5 py-2.5 font-medium text-on-surface transition-all hover:bg-surface-container-high disabled:cursor-wait disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {isSavingSettings ? 'Đang lưu...' : 'Lưu quy tắc mượn sách'}
              </button>
            </div>

            {isLoadingSettings ? (
              <div className="rounded-xl border border-dashed border-surface-container-high bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
                Đang tải quy tắc mượn sách...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Thời hạn mượn trước khi quá hạn (ngày)
                  </span>
                  <input
                    aria-label="Thời hạn mượn trước khi quá hạn"
                    data-testid="loan-period-days"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.loan_period_days}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        loan_period_days: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Số lượng mượn tối đa đang hoạt động
                  </span>
                  <input
                    aria-label="Số lượng mượn tối đa đang hoạt động"
                    data-testid="max-active-loans"
                    type="number"
                    min={1}
                    max={50}
                    value={settings.max_active_loans}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        max_active_loans: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Phí phạt trễ hạn mỗi ngày (VND)
                  </span>
                  <input
                    aria-label="Phí phạt trễ hạn mỗi ngày"
                    data-testid="fine-per-day"
                    type="number"
                    min={0}
                    max={1000000}
                    value={settings.fine_per_day}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        fine_per_day: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Trần phạt tối đa mỗi phiếu (VND)
                  </span>
                  <input
                    aria-label="Trần phạt tối đa mỗi phiếu"
                    data-testid="max-fine-per-loan"
                    type="number"
                    min={0}
                    max={10000000}
                    value={settings.max_fine_per_loan}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        max_fine_per_loan: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Số ngày ân hạn trước khi tính phạt
                  </span>
                  <input
                    aria-label="Số ngày ân hạn trước khi tính phạt"
                    data-testid="grace-period-days"
                    type="number"
                    min={0}
                    max={30}
                    value={settings.grace_period_days}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        grace_period_days: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Hạn chót đến nhận sách (tiếng)
                  </span>
                  <input
                    aria-label="Hạn chót đến nhận sách"
                    data-testid="pickup-deadline-hours"
                    type="number"
                    min={1}
                    max={168}
                    value={settings.pickup_deadline_hours}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        pickup_deadline_hours: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Số lần lỡ nhận tối đa trước khi khóa
                  </span>
                  <input
                    aria-label="Số lần lỡ nhận tối đa trước khi khóa"
                    data-testid="max-missed-pickups"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.max_missed_pickups}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        max_missed_pickups: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Số ngày khóa tài khoản khi vi phạm
                  </span>
                  <input
                    aria-label="Số ngày khóa tài khoản khi vi phạm"
                    data-testid="suspension-duration-days"
                    type="number"
                    min={1}
                    max={365}
                    value={settings.suspension_duration_days}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        suspension_duration_days: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
              </div>
            )}
          </section>

          <hr className="border-slate-100" />

          <section>
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h4 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <span className="material-symbols-outlined filled text-[20px] text-primary">
                  meeting_room
                </span>
                Quy tắc đặt phòng học nhóm
              </h4>
            </div>

            {isLoadingSettings ? (
              <div className="rounded-xl border border-dashed border-surface-container-high bg-surface-container-low px-4 py-6 text-center text-sm text-on-surface-variant">
                Đang tải quy tắc đặt phòng...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Thời gian sử dụng tối đa/lần đặt (tiếng)
                  </span>
                  <input
                    aria-label="Thời gian đặt tối đa"
                    type="number"
                    min={1}
                    max={12}
                    value={settings.room_max_hours_per_booking}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_max_hours_per_booking: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Thời gian sử dụng tối đa/tuần (tiếng)
                  </span>
                  <input
                    aria-label="Thời gian đặt tối đa tuần"
                    type="number"
                    min={1}
                    max={168}
                    value={settings.room_max_hours_per_week}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_max_hours_per_week: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Số lượt đặt tối đa mỗi sinh viên/ngày
                  </span>
                  <input
                    aria-label="Lượt đặt tối đa ngày"
                    type="number"
                    min={1}
                    max={10}
                    value={settings.room_max_bookings_per_day}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_max_bookings_per_day: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Được đặt trước tối đa bao nhiêu ngày
                  </span>
                  <input
                    aria-label="Đặt trước tối đa"
                    type="number"
                    min={1}
                    max={30}
                    value={settings.room_advance_booking_days}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_advance_booking_days: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Số người tối thiểu để đặt phòng nhóm
                  </span>
                  <input
                    aria-label="Số người tối thiểu"
                    type="number"
                    min={1}
                    max={20}
                    value={settings.room_min_group_size}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_min_group_size: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Cửa sổ thời gian check-in trễ (phút)
                  </span>
                  <input
                    aria-label="Cửa sổ check-in"
                    type="number"
                    min={5}
                    max={60}
                    value={settings.room_checkin_window_minutes}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_checkin_window_minutes: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Hạn hủy lịch đặt miễn phạt (tiếng trước giờ đặt)
                  </span>
                  <input
                    aria-label="Hạn hủy miễn phạt"
                    type="number"
                    min={0}
                    max={24}
                    value={settings.room_cancel_deadline_hours}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_cancel_deadline_hours: Number(event.target.value) || 0,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Giờ mở cửa đặt phòng
                  </span>
                  <input
                    aria-label="Giờ mở cửa phòng"
                    type="text"
                    placeholder="07:00"
                    value={settings.room_open_time}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_open_time: event.target.value,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Giờ đóng cửa đặt phòng
                  </span>
                  <input
                    aria-label="Giờ đóng cửa phòng"
                    type="text"
                    placeholder="21:00"
                    value={settings.room_close_time}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_close_time: event.target.value,
                      })
                    }
                    disabled={isSavingSettings}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </label>
                <div className="flex items-center gap-3 pt-6 md:col-span-2">
                  <input
                    type="checkbox"
                    id="room_booking_requires_approval"
                    checked={settings.room_booking_requires_approval}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        room_booking_requires_approval: event.target.checked,
                      })
                    }
                    disabled={isSavingSettings}
                    className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20"
                  />
                  <label htmlFor="room_booking_requires_approval" className="text-sm font-semibold text-slate-700">
                    Yêu cầu thủ thư phê duyệt trước khi đặt phòng thành công (Manual Approve)
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>
      </form>

      <section className="space-y-6 rounded-2xl border border-surface-container-low bg-surface-bright p-8 scholar-shadow">
        <div>
          <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined filled text-[20px] text-blue-500">
              devices
            </span>
            Thiết bị đang hoạt động
          </h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Danh sách các thiết bị hiện đang đăng nhập vào bảng quản trị của bạn. Bạn có thể đăng xuất khỏi các thiết bị khác từ xa nếu phát hiện truy cập đáng ngờ.
          </p>
        </div>

        {loadingDevices ? (
          <div className="text-xs text-slate-400 py-4 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            Đang tải danh sách thiết bị...
          </div>
        ) : devices.length === 0 ? (
          <div className="text-xs text-slate-400 py-4">Không tìm thấy thông tin thiết bị hoạt động.</div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.history_id} className="flex items-center justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-slate-500 bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined">
                      {device.device_type === 'Mobile' ? 'smartphone' : device.device_type === 'Tablet' ? 'tablet' : 'desktop_windows'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">
                        {device.platform} - {device.browser}
                      </span>
                      {device.is_current ? (
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Thiết bị này
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>IP: {device.ip_address}</span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full shrink-0" />
                      <span>Đăng nhập lúc: {new Date(device.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
                
                {!device.is_current && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(device.token_id)}
                    className="text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 p-0 md:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-t-3xl rounded-b-none md:rounded-2xl border border-white/20 bg-white/95 p-5 md:p-8 shadow-2xl shadow-slate-900/30 animate-in slide-in-from-bottom duration-300 md:animate-none">
            {!isOtpVerified ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                    <span className="material-symbols-outlined text-3xl font-light">mail</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Xác thực OTP</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Mã xác thực OTP gồm 6 chữ số đã được gửi đến địa chỉ email quản trị của bạn: <span className="font-semibold text-slate-700">{user?.email}</span>.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtpStep} className="mt-6 space-y-4">
                  {otpError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                      <span className="material-symbols-outlined text-base">error</span>
                      {otpError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-center text-xs font-bold uppercase tracking-widest text-slate-500">
                      Nhập mã OTP
                    </label>
                    <input
                      aria-label="Mã OTP đổi mật khẩu"
                      type="text"
                      maxLength={6}
                      value={passwordForm.otp}
                      onChange={(e) => setPasswordForm({ ...passwordForm, otp: e.target.value.replace(/\D/g, '') })}
                      placeholder="000000"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-center text-xl font-bold tracking-[0.5em] text-slate-800 outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-500">
                      {otpCountdown > 0 ? (
                        <>Mã hết hạn sau: <span className="font-bold text-slate-700">{formatCountdown(otpCountdown)}</span></>
                      ) : (
                        <span className="text-rose-500 font-semibold">Mã đã hết hạn</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpCountdown > 0 || resendingOtp}
                      className={`font-semibold cursor-pointer ${
                        otpCountdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-primary hover:underline'
                      }`}
                    >
                      {resendingOtp ? 'Đang gửi...' : 'Gửi lại mã'}
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={passwordForm.otp.length !== 6 || isVerifyingOtp}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                    >
                      {isVerifyingOtp ? 'Đang xác thực...' : 'Tiếp tục'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <span className="material-symbols-outlined text-3xl font-light">key</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Thiết lập mật khẩu mới</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Mã OTP đã được xác thực thành công. Vui lòng nhập mật khẩu mới của bạn dưới đây.
                  </p>
                </div>

                <form onSubmit={handleSaveNewPassword} className="mt-6 space-y-4">
                  {otpError && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                      <span className="material-symbols-outlined text-base">error</span>
                      {otpError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="new-password-input" className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                      Mật khẩu mới
                    </label>
                    <input
                      id="new-password-input"
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirm-new-password-input" className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      id="confirm-new-password-input"
                      type="password"
                      value={passwordForm.password_confirmation}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                    >
                      {isSavingProfile ? 'Đang lưu...' : 'Xác nhận'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
