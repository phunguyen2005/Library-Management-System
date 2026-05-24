import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import logo from '../assets/logo.png';



export default function AdminSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout, role, hasPermission } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { path: '/admin/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard' },
    { path: '/admin/inventory', icon: 'inventory', labelKey: 'nav.inventory', permission: 'manage_books' },
    { path: '/admin/requests', icon: 'pending_actions', labelKey: 'nav.adminRequests', permission: 'approve_requests' },
    { path: '/admin/members', icon: 'group', labelKey: 'nav.members', permission: 'manage_members' },
    { path: '/admin/librarians', icon: 'manage_accounts', labelKey: 'nav.librarians', permission: 'manage_librarians' },
    { path: '/admin/reports', icon: 'bar_chart', labelKey: 'nav.reports', permission: 'view_reports' },
    { path: '/admin/fines', icon: 'payments', labelKey: 'nav.fines', permissions: ['manage_fines', 'waive_fines'] },
    { path: '/admin/room-bookings', icon: 'meeting_room', labelKey: 'nav.adminRoomBookings', permission: 'manage_rooms' },
    { path: '/admin/audit-logs', icon: 'receipt_long', labelKey: 'nav.auditLogs', permission: 'view_audit_logs' },
  ].filter(item => {
    if (item.permission) return hasPermission(item.permission);
    if (item.permissions) return item.permissions.some(perm => hasPermission(perm));
    return true;
  });

  const subLabel = role === 'admin' ? t('common.admin') : t('common.librarian');

  return (
    <aside className="z-30 flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-300">
      <Link to="/" className="flex items-center gap-3 p-6 hover:opacity-80 transition-opacity">
        <div className="flex h-10 w-16 items-center justify-center rounded-xl bg-white p-1">
          <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight text-white">{t('common.adminAppName')}</h1>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">{subLabel}</p>
        </div>
      </Link>
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
                <span className="text-sm">{t(item.labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-slate-800 p-4">
        {hasPermission('manage_settings') && (
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
            <span className="text-sm">{t('common.systemSettings')}</span>
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400 transition-colors hover:bg-red-500/10"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="text-sm font-medium">{t('common.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
