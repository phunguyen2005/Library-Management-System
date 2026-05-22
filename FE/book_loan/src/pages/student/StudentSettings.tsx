import React, { useEffect, useState } from 'react';
import { updateMyProfile } from '../../api/userApi';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

const PREFS_KEY = 'student-notification-prefs';

type Feedback = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

type NotificationPrefs = {
  dueSoon: boolean;
  newBooks: boolean;
  smsUpdates: boolean;
};

export default function StudentSettings() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    dueSoon: true,
    newBooks: true,
    smsUpdates: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
    }));

    const storedPrefs = localStorage.getItem(PREFS_KEY);
    if (!storedPrefs) {
      return;
    }

    try {
      const parsedPrefs = JSON.parse(storedPrefs) as Partial<NotificationPrefs>;
      setPrefs({
        dueSoon: Boolean(parsedPrefs.dueSoon ?? true),
        newBooks: Boolean(parsedPrefs.newBooks ?? true),
        smsUpdates: Boolean(parsedPrefs.smsUpdates ?? false),
      });
    } catch {
      localStorage.removeItem(PREFS_KEY);
    }
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await updateMyProfile({
        name: form.name,
        phone_number: form.phone_number || null,
        current_password: form.current_password || undefined,
        password: form.password || undefined,
        password_confirmation: form.password_confirmation || undefined,
      });

      updateUser(response.user);
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      setFeedback({ tone: 'success', message: response.message });
      emitToast({
        tone: 'success',
        title: 'Đã lưu hồ sơ',
        message: response.message,
      });
      setForm((current) => ({
        ...current,
        current_password: '',
        password: '',
        password_confirmation: '',
      }));
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể cập nhật hồ sơ.');
      setFeedback({ tone: 'error', message });
      emitToast({
        tone: 'error',
        title: 'Không thể cập nhật hồ sơ',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Cài đặt cá nhân</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quản lý hồ sơ độc giả và tùy chọn nhận thông báo của bạn
          </p>
        </div>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : feedback.tone === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-sky-200 bg-sky-50 text-sky-900'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="divide-y divide-surface-container overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <section className="p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-primary">
              account_circle
            </span>
            Thông tin hồ sơ
          </h4>
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-surface-container-high text-4xl font-bold text-primary shadow-md">
                {user?.name?.charAt(0).toUpperCase() || 'SV'}
              </div>
            </div>
            <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="student-settings-name"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                >
                  Họ và tên
                </label>
                <input
                  id="student-settings-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="student-settings-member-id"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                >
                  Mã số độc giả
                </label>
                <input
                  id="student-settings-member-id"
                  type="text"
                  value={user?.member_id || ''}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="student-settings-email"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                >
                  Email liên hệ
                </label>
                <input
                  id="student-settings-email"
                  type="email"
                  value={user?.email || ''}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="student-settings-phone"
                  className="block text-xs font-bold uppercase tracking-widest text-slate-500"
                >
                  Số điện thoại
                </label>
                <input
                  id="student-settings-phone"
                  type="text"
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-orange-500">
              lock
            </span>
            Bảo mật tài khoản
          </h4>
          <div className="grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="student-settings-current-password"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500"
              >
                Mật khẩu hiện tại
              </label>
              <input
                id="student-settings-current-password"
                type="password"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div />
            <div className="space-y-2">
              <label
                htmlFor="student-settings-password"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500"
              >
                Mật khẩu mới
              </label>
              <input
                id="student-settings-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="student-settings-password-confirmation"
                className="block text-xs font-bold uppercase tracking-widest text-slate-500"
              >
                Xác nhận mật khẩu mới
              </label>
              <input
                id="student-settings-password-confirmation"
                type="password"
                value={form.password_confirmation}
                onChange={(e) =>
                  setForm({ ...form, password_confirmation: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </section>

        <section className="p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-purple-500">
              notifications
            </span>
            Tùy chọn thông báo
          </h4>
          <div className="max-w-2xl space-y-4">
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={prefs.dueSoon}
                onChange={(e) => setPrefs({ ...prefs, dueSoon: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">Cảnh báo sách sắp đến hạn trả</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hệ thống sẽ gửi email nhắc nhở trước 2 ngày.
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={prefs.newBooks}
                onChange={(e) => setPrefs({ ...prefs, newBooks: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">Nhận thông báo sách mới</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Gợi ý đầu sách mới phù hợp với hồ sơ của bạn.
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={prefs.smsUpdates}
                onChange={(e) => setPrefs({ ...prefs, smsUpdates: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">Nhận cập nhật qua SMS</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chỉ bật nếu bạn muốn nhận nhắc nhở bằng số điện thoại.
                </p>
              </span>
            </label>
          </div>
        </section>
      </div>
    </form>
  );
}
