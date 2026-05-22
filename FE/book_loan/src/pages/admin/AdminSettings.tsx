import React, { useEffect, useState } from 'react';
import { fetchLibrarySettings, updateLibrarySettings, type LibrarySettings } from '../../api/librarySettingsApi';
import { updateMyProfile } from '../../api/userApi';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

const defaultSettings: LibrarySettings = {
  loan_period_days: 14,
  max_active_loans: 5,
};

type ProfileForm = {
  name: string;
  email: string;
  phone_number: string;
  current_password: string;
  password: string;
  password_confirmation: string;
};

const emptyProfileForm: ProfileForm = {
  name: '',
  email: '',
  phone_number: '',
  current_password: '',
  password: '',
  password_confirmation: '',
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

    const isChangingPassword = Boolean(
      profileForm.current_password || profileForm.password || profileForm.password_confirmation,
    );

    try {
      const response = await updateMyProfile({
        name: profileForm.name.trim(),
        phone_number: profileForm.phone_number.trim() || null,
        current_password: isChangingPassword ? profileForm.current_password : undefined,
        password: isChangingPassword ? profileForm.password : undefined,
        password_confirmation: isChangingPassword ? profileForm.password_confirmation : undefined,
      });

      updateUser(response.user);
      setProfileForm((current) => ({
        ...current,
        current_password: '',
        password: '',
        password_confirmation: '',
      }));

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

  const handleSettingsSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingSettings(true);
    setSettingsFeedback(null);
    setSettingsError(null);

    try {
      const response = await updateLibrarySettings({
        loan_period_days: settings.loan_period_days,
        max_active_loans: settings.max_active_loans,
      });

      setSettings({
        ...settings,
        loan_period_days: response.loan_period_days,
        max_active_loans: response.max_active_loans,
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

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Mật khẩu hiện tại
            </span>
            <input
              aria-label="Mật khẩu hiện tại"
              type="password"
              value={profileForm.current_password}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  current_password: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="current-password"
            />
          </label>

          <label className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Mật khẩu mới
            </span>
            <input
              aria-label="Mật khẩu mới"
              type="password"
              value={profileForm.password}
              onChange={(event) =>
                setProfileForm((current) => ({ ...current, password: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="new-password"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-slate-500">
              Xác nhận mật khẩu mới
            </span>
            <input
              aria-label="Xác nhận mật khẩu mới"
              type="password"
              value={profileForm.password_confirmation}
              onChange={(event) =>
                setProfileForm((current) => ({
                  ...current,
                  password_confirmation: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="new-password"
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
              </div>
            )}
          </section>
        </div>
      </form>
    </div>
  );
}
