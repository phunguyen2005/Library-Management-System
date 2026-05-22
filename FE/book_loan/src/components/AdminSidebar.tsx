import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const navItems = [
  { path: '/admin/dashboard', icon: 'dashboard', label: 'Tổng quan' },
  { path: '/admin/inventory', icon: 'inventory', label: 'Quản lý kho sách' },
  { path: '/admin/requests', icon: 'pending_actions', label: 'Duyệt mượn sách' },
  { path: '/admin/members', icon: 'group', label: 'Thành viên' },
  { path: '/admin/reports', icon: 'bar_chart', label: 'Báo cáo thống kê' },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="z-30 flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300">
      <div className="flex items-center gap-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <span className="material-symbols-outlined filled">admin_panel_settings</span>
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-white">Quản trị HCMUE</h1>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Bảng thủ thư</p>
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
                  : 'font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
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
      <div className="space-y-1 border-t border-slate-800 p-4">
        <NavLink
          to="/admin/settings"
          className={({ isActive }) =>
            `flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
              isActive
                ? 'bg-primary font-medium text-white'
                : 'font-medium text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`
          }
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm">Cài đặt hệ thống</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition-colors hover:bg-red-500/10"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
