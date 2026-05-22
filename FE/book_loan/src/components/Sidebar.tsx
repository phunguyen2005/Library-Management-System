import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { path: '/home', icon: 'home', label: 'Trang chủ' },
  { path: '/catalog', icon: 'search', label: 'Tìm kiếm sách' },
  { path: '/digital', icon: 'menu_book', label: 'Tài liệu số' },
  { path: '/my-books', icon: 'library_books', label: 'Sách của tôi' },
  { path: '/requests', icon: 'pending_actions', label: 'Yêu cầu mượn' },
  { path: '/history', icon: 'history', label: 'Lịch sử' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="z-30 flex h-full w-64 shrink-0 flex-col border-r border-surface-container-high bg-surface-bright">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <span className="material-symbols-outlined filled">school</span>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-primary">Thư viện HCMUE</h1>
          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
            Hệ thống số
          </p>
        </div>
      </div>
      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-primary font-medium text-white'
                  : 'font-medium text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-surface-container-high p-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
              isActive
                ? 'bg-primary font-medium text-white'
                : 'font-medium text-on-surface-variant hover:bg-surface-container-low'
            }`
          }
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm">Cài đặt</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-error transition-colors hover:bg-red-50"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
