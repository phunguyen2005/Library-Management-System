import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, registerStudent } from '../../api/authApi';
import { useAuth } from '../../auth/AuthContext';
import { getErrorMessage } from '../../lib/errors';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'student' | 'admin'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { setSession } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const response = isLogin
        ? await loginUser(selectedRole, identifier, password)
        : await registerStudent(name, identifier, password, phone);

      setSession({
        user: response.user,
        role: response.role,
        token: response.token,
      });

      navigate(response.role === 'admin' ? '/admin/dashboard' : '/home');
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, 'Không thể kết nối tới máy chủ.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="academic-pattern flex min-h-screen flex-col bg-background">
      <header className="fixed top-0 z-50 flex h-16 w-full items-center justify-between bg-white/80 px-6 shadow-xl shadow-blue-900/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <span className="material-symbols-outlined filled">school</span>
          </div>
          <span className="font-headline text-xl font-bold tracking-tight text-primary">
            Thư viện HCMUE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-slate-500 transition-colors hover:text-primary">
            <span className="material-symbols-outlined">language</span>
          </button>
          <button className="text-slate-500 transition-colors hover:text-primary">
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
                HCMUE Digital Library
              </span>
              <h1 className="font-headline mb-6 text-4xl font-extrabold leading-tight text-white">
                Khám phá kho tri thức số đa phương tiện.
              </h1>
              <p className="mb-8 max-w-md text-lg leading-relaxed text-white/80">
                Truy cập hàng ngàn tài liệu học tập, nghiên cứu và bài giảng số mọi lúc,
                mọi nơi.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center bg-white p-8 md:p-12">
            <div className="mb-10">
              <h2 className="font-headline mb-2 text-3xl font-bold text-slate-900">
                Chào mừng bạn!
              </h2>
              <p className="text-slate-500">
                Đăng nhập để tiếp tục hành trình học thuật của bạn.
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
                Đăng nhập
              </button>
              <button
                type="button"
                className={`pb-4 text-sm font-semibold transition-colors ${!isLogin
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-400 hover:text-slate-600'
                  }`}
                onClick={() => {
                  setIsLogin(false);
                  setSelectedRole('student');
                }}
              >
                Đăng ký
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {isLogin && (
                <div className="flex gap-4 rounded-lg bg-surface-container-low p-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === 'student'}
                      onChange={() => setSelectedRole('student')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Sinh viên</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="role"
                      checked={selectedRole === 'admin'}
                      onChange={() => setSelectedRole('admin')}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium">Thủ thư (Admin)</span>
                  </label>
                </div>
              )}

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
                      Họ và tên
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                        badge
                      </span>
                      <input
                        type="text"
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
                      Số điện thoại
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                        call
                      </span>
                      <input
                        type="text"
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
                  Mã số hoặc Email
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-slate-400">
                    person
                  </span>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="MSSV"
                    className="w-full rounded-lg border-none bg-surface-container-low py-3 pl-11 pr-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <label className="font-label block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Mật khẩu
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() =>
                        setErrorMsg('Vui lòng liên hệ thủ thư hoặc phòng công tác sinh viên để đặt lại mật khẩu.')
                      }
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
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
                  />
                </div>
                {!isLogin && (
                  <p className="mt-2 text-xs text-slate-500">
                    Mật khẩu cần tối thiểu 8 ký tự và bao gồm chữ cái, số.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 text-lg font-bold text-white shadow-xl shadow-blue-900/20 transition-all active:scale-[0.98] ${isLoading ? 'cursor-wait bg-primary/70' : 'bg-primary hover:bg-blue-700'
                  }`}
              >
                {isLoading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                    Đang xử lý...
                  </>
                ) : isLogin ? (
                  'Đăng nhập ngay'
                ) : (
                  'Đăng ký tài khoản'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
