import React from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../auth/AuthContext';

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();
  
  const handleGoHome = () => {
    if (isAuthenticated) {
      navigate(role === 'admin' || role === 'librarian' ? '/admin/dashboard' : '/home');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <EmptyState
          icon="error_outline"
          title="Không tìm thấy trang"
          message="Trang bạn đang cố truy cập không tồn tại hoặc đã bị gỡ bỏ."
          action={
            <button
              type="button"
              onClick={handleGoHome}
              className="rounded-xl bg-primary px-6 py-2.5 font-bold text-white transition-colors hover:bg-primary/90"
            >
              Về trang chủ
            </button>
          }
        />
      </div>
    </div>
  );
}
