import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword, verifyForgotPasswordOtp } from '../../api/authApi';
import ThemeToggle from '../../components/ThemeToggle';
import { getErrorMessage } from '../../lib/errors';

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await forgotPassword(email);
      setSuccessMsg('Mã xác thực đã được gửi đến email của bạn.');
      setStep(2);
      setCountdown(300); // 5 minutes
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, 'Không tìm thấy tài khoản với email này.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await verifyForgotPasswordOtp(email, otp);
      setSuccessMsg('Mã xác thực hợp lệ. Vui lòng nhập mật khẩu mới.');
      setStep(3);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, 'Mã xác thực không hợp lệ hoặc đã hết hạn.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await resetPassword(email, otp, password);
      setSuccessMsg('Đặt lại mật khẩu thành công. Đang chuyển hướng...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, 'Mã xác thực không hợp lệ hoặc đã hết hạn.'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="academic-pattern flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-surface-bright/80 px-6 shadow-xl shadow-blue-900/5 backdrop-blur-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <span className="material-symbols-outlined filled">school</span>
          </div>
          <span className="font-headline text-xl font-bold tracking-tight text-primary">
            Thư viện HCMUE
          </span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-grow items-center justify-center px-4 py-24">
        <div className="grid w-full max-w-[1100px] overflow-hidden rounded-xl bg-surface-bright shadow-2xl shadow-blue-900/10 md:grid-cols-2">
          <div className="relative hidden flex-col justify-center overflow-hidden bg-primary p-12 md:flex">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute right-[-10%] top-[-10%] h-64 w-64 rounded-full border-[20px] border-white"></div>
              <div className="absolute bottom-[-5%] left-[-5%] h-48 w-48 rounded-full border-[15px] border-white"></div>
            </div>
            <div className="relative z-10">
              <h1 className="font-headline mb-6 text-4xl font-extrabold leading-tight text-white">
                Khôi phục mật khẩu
              </h1>
              <p className="mb-8 max-w-md text-lg leading-relaxed text-white/80">
                Khôi phục quyền truy cập vào tài khoản của bạn thông qua địa chỉ email đã đăng ký.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-surface-bright p-8 md:p-12">
            <div className="mb-10">
              <h2 className="font-headline mb-2 text-3xl font-bold text-slate-900">
                {step === 1 ? 'Quên mật khẩu?' : step === 2 ? 'Xác minh OTP' : 'Đặt lại mật khẩu'}
              </h2>
              <p className="text-slate-500">
                {step === 1 
                  ? 'Vui lòng nhập địa chỉ email của bạn để nhận mã xác thực OTP.' 
                  : step === 2 
                    ? `Mã xác thực gồm 6 chữ số đã được gửi đến email ${email}.`
                    : 'Hãy tạo một mật khẩu mới an toàn cho tài khoản của bạn.'}
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                <span className="material-symbols-outlined">error</span>
                {errorMsg}
              </div>
            )}
            
            {successMsg && (
              <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                <span className="material-symbols-outlined">check_circle</span>
                {successMsg}
              </div>
            )}

            {step === 1 ? (
              <form className="space-y-6" onSubmit={handleSendOtp}>
                <div>
                  <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                      email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nguyenvana@example.com"
                      className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] ${
                    isLoading ? 'cursor-wait bg-primary/70' : 'bg-primary hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Gửi mã xác nhận'
                  )}
                </button>
              </form>
            ) : step === 2 ? (
              <form className="space-y-6" onSubmit={handleVerifyOtp}>
                <div>
                  <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Mã xác thực (OTP)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                      dialpad
                    </span>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary text-center tracking-[0.5em] font-bold"
                      required
                    />
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-xs text-slate-500">
                      {countdown > 0 ? (
                        <>Mã hết hạn sau: <strong className="text-slate-700">{formatTime(countdown)}</strong></>
                      ) : (
                        <span className="text-red-500">Mã đã hết hạn. <button type="button" onClick={handleSendOtp} className="text-primary hover:underline">Gửi lại</button></span>
                      )}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] ${
                    isLoading || otp.length !== 6 ? 'cursor-not-allowed bg-primary/50' : 'bg-primary hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Đang kiểm tra...
                    </>
                  ) : (
                    'Xác nhận mã OTP'
                  )}
                </button>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleResetPassword}>
                <div>
                  <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                      lock
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                      lock_reset
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] ${
                    isLoading || !password || !confirmPassword ? 'cursor-not-allowed bg-primary/50' : 'bg-primary hover:bg-blue-700'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                      Đang xử lý...
                    </>
                  ) : (
                    'Đổi mật khẩu'
                  )}
                </button>
              </form>
            )}

            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="text-sm text-slate-500 hover:text-primary transition-colors font-semibold"
              >
                Quay lại đăng nhập
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
