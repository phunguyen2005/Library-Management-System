import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../../api/authApi';
import { useAuth } from '../../auth/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import { getErrorMessage } from '../../lib/errors';

export default function VerifyOtp() {
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes

  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  
  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await verifyOtp(email, otp);
      setSession({
        user: response.user,
        role: response.role,
        token: response.token,
      });
      navigate(response.role === 'admin' || response.role === 'librarian' ? '/admin/dashboard' : '/home');
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, 'Mã xác thực không hợp lệ.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await resendOtp(email);
      setSuccessMsg('Mã OTP mới đã được gửi đến email của bạn.');
      setCountdown(300);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, 'Không thể gửi lại mã xác thực.'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!email) return null;

  return (
    <div className="academic-pattern flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-surface-bright/80 px-6 shadow-xl shadow-blue-900/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
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
                Xác thực Email
              </h1>
              <p className="mb-8 max-w-md text-lg leading-relaxed text-white/80">
                Bảo vệ tài khoản của bạn bằng cách xác minh địa chỉ email chính chủ.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-surface-bright p-8 md:p-12">
            <div className="mb-10">
              <h2 className="font-headline mb-2 text-3xl font-bold text-slate-900">
                Nhập mã OTP
              </h2>
              <p className="text-slate-500">
                Mã xác thực gồm 6 chữ số đã được gửi đến email <span className="font-semibold text-primary">{email}</span>.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                  <span className="material-symbols-outlined">error</span>
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
                  <span className="material-symbols-outlined">check_circle</span>
                  {successMsg}
                </div>
              )}

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
                    className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary text-center text-xl tracking-[0.5em] font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {countdown > 0 ? (
                    <>Mã hết hạn sau: <strong className="text-slate-700">{formatTime(countdown)}</strong></>
                  ) : (
                    <span className="text-red-500">Mã đã hết hạn</span>
                  )}
                </span>
                
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || isLoading}
                  className={`text-sm font-semibold transition-colors ${
                    countdown > 0 
                      ? 'text-slate-400 cursor-not-allowed' 
                      : 'text-primary hover:underline'
                  }`}
                >
                  Gửi lại mã
                </button>
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
                    Đang xử lý...
                  </>
                ) : (
                  'Xác nhận'
                )}
              </button>
              
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => navigate('/login')}
                  className="text-sm text-slate-500 hover:text-primary transition-colors"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
