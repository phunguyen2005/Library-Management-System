import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n';
import { updateMyProfile, sendPasswordOtp, verifyPasswordOtp } from '../../api/userApi';
import { getActiveDevices, revokeDevice, type DeviceSession } from '../../api/authApi';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
type Feedback = {
  tone: 'success' | 'error' | 'info';
  message: string;
};

const parseBool = (val: any, defVal = true): boolean => {
  if (val === null || val === undefined) return defVal;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.toLowerCase().trim();
    return s === 'true' || s === '1';
  }
  return !!val;
};

export default function StudentSettings() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    notify_due_soon: true,
    notify_new_books: true,
    notify_borrow_status: true,
    notify_room_status: true,
    notify_room_reminder: true,
    notify_fine_status: true,
    notify_reservation: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
    otp: '',
  });
  const [otpCountdown, setOtpCountdown] = useState(60);
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

  const handleOpenPasswordModal = async () => {
    try {
      setFeedback(null);
      setIsSendingOtp(true);
      await sendPasswordOtp();
      setIsSendingOtp(false);
      setOtpCountdown(60);
      setIsOtpVerified(false);
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
        otp: '',
      });
      setOtpError(null);
      setShowPasswordModal(true);
      emitToast({
        tone: 'success',
        title: t('studentSettings.toastOtpSent'),
        message: t('studentSettings.toastOtpSentMsg'),
      });
    } catch (error: unknown) {
      setIsSendingOtp(false);
      const message = getErrorMessage(error, t('studentSettings.toastOtpError'));
      setFeedback({ tone: 'error', message });
      emitToast({
        tone: 'error',
        title: t('studentSettings.toastOtpError'),
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
        title: t('studentSettings.toastVerifySuccess'),
        message: t('studentSettings.toastVerifySuccessMsg'),
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('studentSettings.toastVerifyErrorMsg'));
      setOtpError(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSaveNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setOtpError(null);

    try {
      const response = await updateMyProfile({
        name: form.name,
        phone_number: form.phone_number || null,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation,
        otp: passwordForm.otp,
      });

      updateUser(response.user);
      setFeedback({ tone: 'success', message: response.message || t('studentSettings.toastPasswordSuccess') });
      emitToast({
        tone: 'success',
        title: t('common.success'),
        message: response.message || t('studentSettings.toastPasswordSuccess'),
      });
      setShowPasswordModal(false);
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('studentSettings.toastPasswordError'));
      setOtpError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendOtp = async () => {
    setResendingOtp(true);
    setOtpError(null);

    try {
      await sendPasswordOtp();
      setOtpCountdown(60);
      setPasswordForm((prev) => ({ ...prev, otp: '' }));
      emitToast({
        tone: 'success',
        title: t('studentSettings.toastOtpSent'),
        message: t('studentSettings.toastOtpSentMsg'),
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('studentSettings.toastOtpError'));
      setOtpError(message);
    } finally {
      setResendingOtp(false);
    }
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
      emitToast({ tone: 'success', title: t('common.success'), message: t('studentSettings.toastRevokeSuccess') });
      setDevices((prev) => prev.filter((d) => d.token_id !== tokenId));
    } catch (error: any) {
      emitToast({ tone: 'error', title: t('common.error'), message: error?.message || t('studentSettings.toastRevokeError') });
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      name: user?.name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      notify_due_soon: parseBool(user?.notify_due_soon, true),
      notify_new_books: parseBool(user?.notify_new_books, true),
      notify_borrow_status: parseBool(user?.notify_borrow_status, true),
      notify_room_status: parseBool(user?.notify_room_status, true),
      notify_room_reminder: parseBool(user?.notify_room_reminder, true),
      notify_fine_status: parseBool(user?.notify_fine_status, true),
      notify_reservation: parseBool(user?.notify_reservation, true),
    }));
  }, [user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await updateMyProfile({
        name: form.name,
        phone_number: form.phone_number || null,
        notify_due_soon: form.notify_due_soon,
        notify_new_books: form.notify_new_books,
        notify_borrow_status: form.notify_borrow_status,
        notify_room_status: form.notify_room_status,
        notify_room_reminder: form.notify_room_reminder,
        notify_fine_status: form.notify_fine_status,
        notify_reservation: form.notify_reservation,
      });

      updateUser(response.user);
      setFeedback({ tone: 'success', message: response.message || t('studentSettings.toastSaved') });
      emitToast({
        tone: 'success',
        title: t('studentSettings.toastSaved'),
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('studentSettings.toastSaveError'));
      setFeedback({ tone: 'error', message });
      emitToast({
        tone: 'error',
        title: t('studentSettings.toastSaveError'),
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-on-surface">{t('studentSettings.title')}</h2>
          <p className="mt-1 text-xs md:text-sm text-on-surface-variant">
            {t('studentSettings.subtitle')}
          </p>
        </div>
        <button
          type="submit"
          className="w-full md:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          {isSaving ? t('studentSettings.saving') : t('studentSettings.btnSave')}
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
        <section className="p-4 md:p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-primary">
              account_circle
            </span>
            {t('studentSettings.profileSection')}
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
                  {t('studentSettings.fullName')}
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
                  {t('studentSettings.memberId')}
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
                  {t('studentSettings.email')}
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
                  {t('studentSettings.phone')}
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

        <section className="p-4 md:p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-orange-500">
              lock
            </span>
            {t('studentSettings.securitySection')}
          </h4>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">{t('studentSettings.passwordLabel')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('studentSettings.passwordDesc')}</p>
            </div>
            <button
              type="button"
              onClick={handleOpenPasswordModal}
              disabled={isSendingOtp}
              className="w-full sm:w-auto text-center text-xs font-bold text-primary hover:text-white bg-white border border-primary hover:bg-primary px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              {isSendingOtp ? t('studentSettings.btnSendingOtp') : t('studentSettings.btnChangePassword')}
            </button>
          </div>
        </section>

        <section className="p-4 md:p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-purple-500">
              notifications
            </span>
            {t('studentSettings.notificationsSection')}
          </h4>
          <div className="max-w-2xl space-y-4">
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_due_soon}
                onChange={(e) => setForm({ ...form, notify_due_soon: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyDueSoon')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyDueSoonDesc')}
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_borrow_status}
                onChange={(e) => setForm({ ...form, notify_borrow_status: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyBorrowStatus')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyBorrowStatusDesc')}
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_reservation}
                onChange={(e) => setForm({ ...form, notify_reservation: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyReservation')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyReservationDesc')}
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_room_status}
                onChange={(e) => setForm({ ...form, notify_room_status: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyRoomStatus')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyRoomStatusDesc')}
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_room_reminder}
                onChange={(e) => setForm({ ...form, notify_room_reminder: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyRoomReminder')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyRoomReminderDesc')}
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_fine_status}
                onChange={(e) => setForm({ ...form, notify_fine_status: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyFineStatus')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyFineStatusDesc')}
                </p>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-4">
              <input
                type="checkbox"
                checked={form.notify_new_books}
                onChange={(e) => setForm({ ...form, notify_new_books: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-outline text-primary focus:ring-primary"
              />
              <span>
                <p className="text-sm font-bold text-slate-800">{t('studentSettings.notifyNewBooks')}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t('studentSettings.notifyNewBooksDesc')}
                </p>
              </span>
            </label>
          </div>
        </section>

        <section className="p-4 md:p-8">
          <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-800">
            <span className="material-symbols-outlined filled text-[20px] text-blue-500">
              devices
            </span>
            {t('studentSettings.devicesSection')}
          </h4>
          <p className="text-xs text-slate-500 mb-6">
            {t('studentSettings.devicesDesc')}
          </p>

          {loadingDevices ? (
            <div className="text-xs text-slate-400 py-4 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              {t('studentSettings.loadingDevices')}
            </div>
          ) : devices.length === 0 ? (
            <div className="text-xs text-slate-400 py-4">{t('studentSettings.emptyDevices')}</div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div key={device.history_id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-500 bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined">
                        {device.device_type === 'Mobile' ? 'smartphone' : device.device_type === 'Tablet' ? 'tablet' : 'desktop_windows'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">
                          {device.platform} - {device.browser}
                        </span>
                        {device.is_current ? (
                          <span className="bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {t('studentSettings.currentDevice')}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>IP: {device.ip_address}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0" />
                        <span className="line-clamp-1">
                          {t('common.time', 'Lúc')}: {new Date(device.created_at).toLocaleString(getIntlLocale())}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!device.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(device.token_id)}
                      className="w-full sm:w-auto text-center text-xs font-bold text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                      {t('studentSettings.btnRevoke')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </form>

    {showPasswordModal && (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/60 p-0 md:p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-t-3xl rounded-b-none md:rounded-2xl border border-white/20 bg-white/95 p-5 md:p-8 shadow-2xl shadow-slate-900/30 animate-in slide-in-from-bottom duration-300 md:animate-none">
          {!isOtpVerified ? (
            <>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                  <span className="material-symbols-outlined text-3xl font-light">mail</span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{t('studentSettings.modalOtpTitle')}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {t('studentSettings.modalOtpDesc')} <span className="font-semibold text-slate-700">{user?.email}</span>.
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
                    {t('studentSettings.formOtp')}
                  </label>
                  <input
                    aria-label={t('studentSettings.otpAriaLabel', 'Mã OTP đổi mật khẩu')}
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
                      <>{t('studentSettings.countdownActive', { time: formatCountdown(otpCountdown) })}</>
                    ) : (
                      <span className="text-rose-500 font-semibold">{t('studentSettings.countdownExpired')}</span>
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
                    {resendingOtp ? t('studentSettings.btnResendingOtp') : t('studentSettings.btnResendOtp')}
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    {t('studentSettings.btnCancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={passwordForm.otp.length !== 6 || isVerifyingOtp}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                  >
                    {isVerifyingOtp ? t('common.processing') : t('studentSettings.btnContinue')}
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
                <h3 className="text-xl font-bold text-slate-800">{t('studentSettings.modalPasswordTitle')}</h3>
                <p className="mt-2 text-sm text-slate-500">
                  {t('studentSettings.modalPasswordDesc')}
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
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    {t('studentSettings.formNewPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    {t('studentSettings.formConfirmNewPassword')}
                  </label>
                  <input
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
                    {t('studentSettings.btnCancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait cursor-pointer"
                  >
                    {isSaving ? t('studentSettings.saving') : t('studentSettings.btnConfirm')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
