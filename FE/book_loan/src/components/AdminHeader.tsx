import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

type AdminHeaderProps = {
  onOpenPolicy: () => void;
  onToggleSidebar?: () => void;
};

export default function AdminHeader({ onOpenPolicy, onToggleSidebar }: AdminHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-surface-container/40 bg-surface/80 px-4 md:px-8 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container lg:hidden cursor-pointer"
            aria-label="Mở thanh điều hướng"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenPolicy}
          title="Chính sách & Quy định Thư viện"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-surface-container-high bg-surface-bright text-on-surface shadow-sm transition-all hover:bg-surface-container-low hover:text-primary active:scale-95"
        >
          <span className="material-symbols-outlined text-[22px] font-light">menu_book</span>
        </button>

        <ThemeToggle />
        <LanguageToggle />
        <NotificationDropdown />

        <div className="mx-2 h-6 w-px bg-surface-container-high"></div>

        <div className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-surface-container-low">
          <div className="hidden text-right sm:block">
            <p className="mb-1 text-sm font-bold leading-none text-on-surface">
              {user?.name || t('common.librarian')}
            </p>
            <p className="text-[10px] font-medium text-on-surface-variant">
              {user?.email || t('common.admin')}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
