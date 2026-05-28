import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import logo from '../assets/logo.png';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

const navItems = [
  { path: '/home', icon: 'home', labelKey: 'nav.home' },
  { path: '/catalog', icon: 'search', labelKey: 'nav.catalog' },
  { path: '/favorites', icon: 'favorite', labelKey: 'nav.favorites' },
  { path: '/digital', icon: 'menu_book', labelKey: 'nav.digital' },
  { path: '/my-books', icon: 'library_books', labelKey: 'nav.myBooks' },
  { path: '/requests', icon: 'pending_actions', labelKey: 'nav.requests' },
  { path: '/room-booking', icon: 'meeting_room', labelKey: 'nav.roomBooking' },
  { path: '/history', icon: 'history', labelKey: 'nav.history' },
  { path: '/fines', icon: 'payments', labelKey: 'nav.fines' },
  { path: '/gamify', icon: 'emoji_events', labelKey: 'nav.gamify' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMap?: () => void;
}

export default function Sidebar({ isOpen, onClose, onOpenMap }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role, logout } = useAuth();

  const isOutlookStudent = !!(user?.email && (
    user.email.toLowerCase().endsWith('@student.hcmue.edu.vn') || 
    user.email.toLowerCase().endsWith('@hcmue.edu.vn')
  ));
  const isGuest = role === 'student' && !isOutlookStudent;

  const filteredNavItems = navItems.filter((item) => {
    if (isGuest && ['/requests', '/room-booking', '/history', '/fines', '/gamify'].includes(item.path)) {
      return false;
    }
    return true;
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-surface-container-high bg-surface-bright transition-transform duration-300 lg:static lg:z-30 lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <Link to="/" onClick={onClose} className="flex items-center gap-3 p-6 hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-16 items-center justify-center rounded-xl bg-surface-container p-1">
            <img src={logo} alt="HCMUE Logo" className="h-full w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight text-primary">{t('common.appName')}</h1>
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">
              {t('header.systemLabel')}
            </p>
          </div>
        </Link>
        <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
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
                  <span className="text-sm">{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-4 border-t border-surface-container-high p-4">
          {/* Mobile controls - only visible on mobile/tablet */}
          <div className="flex lg:hidden items-center justify-around py-2 rounded-xl bg-surface-container-low border border-surface-container-high/60">
            <ThemeToggle />
            <LanguageToggle />
            {onOpenMap && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMap();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                title={t('header.libraryMap')}
                aria-label={t('header.libraryMap')}
              >
                <span className="material-symbols-outlined text-2xl">map</span>
              </button>
            )}
          </div>

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex w-full items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                isActive
                  ? 'bg-primary font-medium text-white'
                  : 'font-medium text-on-surface-variant hover:bg-surface-container-low'
              }`
            }
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm">{t('common.settings')}</span>
          </NavLink>
          <button
            onClick={() => {
              onClose();
              void handleLogout();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-error transition-colors hover:bg-red-50 cursor-pointer"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">{t('common.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
