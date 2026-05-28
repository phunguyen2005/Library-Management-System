import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, registerStudent } from '../../api/authApi';
import { useAuth } from '../../auth/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageToggle from '../../components/LanguageToggle';
import logo from '../../assets/logo.png';
import { ApiError, getErrorMessage } from '../../lib/errors';
import LoginHelpModal from '../../components/LoginHelpModal';
import { API_BASE_URL } from '../../api/client';

export default function Login() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { setSession } = useAuth();

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setIdentifier(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const response = isLogin
        ? await loginUser(identifier, password)
        : await registerStudent(name, identifier, password, phone);

      if ((response as any).require_otp && (response as any).email) {
        navigate('/verify-otp', { state: { email: (response as any).email } });
        return;
      }

      if (isLogin) {
        if (rememberMe) {
          localStorage.setItem('remembered_email', identifier);
        } else {
          localStorage.removeItem('remembered_email');
        }
      }

      setSession({
        user: response.user,
        role: response.role,
        token: response.token,
      });

      navigate(response.role === 'admin' || response.role === 'librarian' ? '/admin/dashboard' : '/home');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.details && (error.details as any).require_otp) {
        navigate('/verify-otp', { state: { email: (error.details as any).email } });
        return;
      }
      setErrorMsg(getErrorMessage(error, t('auth.serverFallback')));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="academic-pattern flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-surface-bright/80 px-6 shadow-xl shadow-blue-900/5 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-105">
          <div className="flex h-10 w-16 items-center justify-center rounded-xl bg-surface-container p-1">
            <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
          </div>
          <span className="font-headline text-xl font-bold tracking-tight text-primary">
            {t('common.appName')}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageToggle />
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="text-on-surface-variant transition-colors hover:text-primary"
            aria-label="Help"
          >
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center px-4 py-24">
        <div className="grid w-full max-w-[1100px] overflow-hidden rounded-xl bg-surface-bright shadow-2xl shadow-blue-900/10 md:grid-cols-2">
          <div className="relative hidden flex-col justify-center overflow-hidden bg-primary p-12 md:flex">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute right-[-10%] top-[-10%] h-64 w-64 rounded-full border-[20px] border-white"></div>
              <div className="absolute bottom-[-5%] left-[-5%] h-48 w-48 rounded-full border-[15px] border-white"></div>
            </div>
            <div className="relative z-10">
              <span className="mb-4 block text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                {t('auth.heroEyebrow')}
              </span>
              <h1 className="font-headline mb-6 text-4xl font-extrabold leading-tight text-white">
                {t('auth.heroTitle')}
              </h1>
              <p className="mb-8 max-w-md text-lg leading-relaxed text-white/80">
                {t('auth.heroBody')}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-surface-bright p-8 md:p-12">
            <div className="mb-10">
              <h2 className="font-headline mb-2 text-3xl font-bold text-slate-900">
                {t('auth.welcome')}
              </h2>
              <p className="text-slate-500">
                {t('auth.subtitle')}
              </p>
            </div>

            <div className="mb-6 flex gap-8 border-b border-surface-container-high">
              <button
                className={`pb-4 text-sm font-semibold transition-colors ${isLogin
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
                onClick={() => setIsLogin(true)}
              >
                {t('auth.login')}
              </button>
              <button
                type="button"
                className={`pb-4 text-sm font-semibold transition-colors ${!isLogin
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
                onClick={() => setIsLogin(false)}
              >
                {t('auth.register')}
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
                  <span className="material-symbols-outlined">error</span>
                  {errorMsg}
                </div>
              )}

              {!isLogin && (
                <>
                  <div>
                    <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                      {t('auth.fullName')}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                        badge
                      </span>
                      <input
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn A"
                        className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                      {t('auth.phone')}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                        call
                      </span>
                      <input
                        type="text"
                        name="phone"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0123456789"
                        className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="font-label mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                    mail
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="email@hcmue.edu.vn"
                    className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label className="font-label block text-xs font-bold uppercase tracking-widest text-slate-500">
                    {t('auth.password')}
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-12 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined select-none text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {!isLogin && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t('auth.passwordHint')}
                  </p>
                )}
              </div>

              {isLogin && (
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-surface-container-high text-primary focus:ring-primary bg-surface-container-low cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 text-sm text-slate-600 cursor-pointer select-none"
                  >
                    {t('auth.rememberMe')}
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] ${isLoading ? 'cursor-wait bg-primary/70' : 'bg-primary hover:bg-blue-700'
                  }`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                    {t('common.processing')}
                  </>
                ) : isLogin ? (
                  t('auth.loginNow')
                ) : (
                  t('auth.registerAccount')
                )}
              </button>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-4 text-xs uppercase tracking-widest text-slate-400 font-semibold">
                  {t('auth.continueWith')}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => window.location.href = `${API_BASE_URL}/auth/google/redirect`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.href = `${API_BASE_URL}/auth/github/redirect`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    Github
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => window.location.href = `${API_BASE_URL}/auth/microsoft/redirect`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-600 transition-all hover:bg-blue-50/30 hover:text-blue-600 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <rect x="0" y="0" width="11" height="11" fill="#f35325" />
                    <rect x="13" y="0" width="11" height="11" fill="#81bc06" />
                    <rect x="0" y="13" width="11" height="11" fill="#05a6f0" />
                    <rect x="13" y="13" width="11" height="11" fill="#ffba08" />
                  </svg>
                  Đăng nhập bằng tài khoản Outlook
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <LoginHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
