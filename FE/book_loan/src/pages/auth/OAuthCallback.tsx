import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processOAuth = async () => {
      // 1. Get token from URL params
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const error = params.get('error');

      if (error) {
        setErrorMsg(`Đăng nhập thất bại: ${error}`);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!token) {
        setErrorMsg('Không tìm thấy token xác thực từ máy chủ.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // 2. Fetch user profile using the new token
        // We use a manual fetch/apiRequest here because we don't have it in context yet
        const response = await fetch('http://localhost:8000/api/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error('Lấy thông tin người dùng thất bại');
        }

        const data = await response.json();

        // 3. Update AuthContext
        setSession({
          user: data.user,
          role: data.role || 'student',
          token: token,
        });

        // 4. Redirect
        navigate('/home');
      } catch (err) {
        console.error(err);
        setErrorMsg('Có lỗi xảy ra trong quá trình xác thực.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processOAuth();
  }, [location, navigate, setSession]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex max-w-md flex-col items-center rounded-2xl bg-white p-8 text-center shadow-xl shadow-blue-900/10">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-3xl">sync</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900">Đang xác thực...</h2>
        
        {errorMsg ? (
          <p className="text-red-500">{errorMsg}</p>
        ) : (
          <p className="text-slate-500">
            Vui lòng đợi trong giây lát, chúng tôi đang thiết lập phiên làm việc của bạn.
          </p>
        )}
      </div>
    </div>
  );
}
