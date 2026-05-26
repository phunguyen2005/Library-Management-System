import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { searchBooks } from '../api/bookApi';
import { applyImageFallback } from '../lib/display';
import type { FormattedBook } from '../types/book';
import NotificationDropdown from './NotificationDropdown';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenMap?: () => void;
}

export default function Header({ onToggleSidebar, onOpenMap }: HeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FormattedBook[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const userName = user?.name || t('common.user');
  const userEmail = user?.email || t('header.accountMenu.emailFallback');
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';
  const accountMenuLabel = t('header.accountMenu.open');
  const userLevel = typeof user?.level === 'number' ? user.level : null;

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchData = await searchBooks(query);
        setResults(searchData.data.slice(0, 6));
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleAccountNavigate = (path: string) => {
    setIsAccountMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setIsAccountMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-surface-container-high bg-surface-bright/80 px-4 md:px-8 backdrop-blur-md">
      <div className="flex flex-1 items-center gap-3" ref={wrapperRef}>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container lg:hidden cursor-pointer"
          aria-label={t('header.openMenu')}
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <div className="relative w-full max-w-xl lg:ml-6">

          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={t('header.searchPlaceholder')}
            className="w-full rounded-full border-none bg-surface-container py-2 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20"
          />
          {isSearching ? (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-outline">
              {t('header.searching')}
            </span>
          ) : null}

          {showDropdown ? (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-surface-container-low bg-surface-bright shadow-2xl">
              {results.length > 0 ? (
                <>
                  {results.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => {
                        navigate(`/catalog?book=${book.id}`);
                        setShowDropdown(false);
                        setQuery('');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                    >
                      <img
                        src={book.cover}
                        alt={book.title}
                        onError={(event) => applyImageFallback(event.currentTarget)}
                        className="h-10 w-8 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-on-surface">{book.title}</p>
                        <p className="text-xs text-on-surface-variant">{book.author}</p>
                      </div>
                      <span
                        className={`whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold text-white ${book.statusColor}`}
                      >
                        {book.status}
                      </span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
                      setShowDropdown(false);
                      setQuery('');
                    }}
                    className="w-full border-t border-surface-container-low px-4 py-3 text-center text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                  >
                    {t('header.viewAllCatalogResults')}
                  </button>
                </>
              ) : query.trim() ? (
                <div className="px-4 py-6 text-center text-sm text-on-surface-variant">
                  {t('header.noBooksFound', { query })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden flex-col items-end md:flex">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {t('common.digitalLibrary')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <LanguageToggle />
          <button
            type="button"
            onClick={onOpenMap}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            title={t('header.libraryMap')}
            aria-label={t('header.libraryMap')}
          >
            <span className="material-symbols-outlined text-2xl">map</span>
          </button>
          <NotificationDropdown />
          <div
            className="relative ml-2 border-l border-surface-container-high pl-4"
            ref={accountMenuRef}
          >
            <button
              type="button"
              aria-label={accountMenuLabel}
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              onClick={() => setIsAccountMenuOpen((current) => !current)}
              className="flex min-h-10 items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2 transition-colors hover:border-surface-container-high hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow">
                {userInitial}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-32 truncate text-xs font-bold leading-tight text-on-surface">
                  {userName}
                </span>
                {userLevel !== null ? (
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase leading-tight tracking-wide text-primary">
                    {t('header.accountMenu.level', { level: userLevel })}
                  </span>
                ) : null}
              </span>
              <span
                className={`material-symbols-outlined hidden text-[18px] text-on-surface-variant transition-transform sm:block ${
                  isAccountMenuOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>

            {isAccountMenuOpen ? (
              <div
                role="menu"
                aria-label={accountMenuLabel}
                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright shadow-2xl ring-1 ring-black/5"
              >
                <div className="border-b border-surface-container-low bg-surface-container-low/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-black text-white shadow-md">
                      {userInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-on-surface">{userName}</p>
                      <p className="truncate text-xs font-medium text-on-surface-variant">{userEmail}</p>
                      {userLevel !== null ? (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {t('header.accountMenu.level', { level: userLevel })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAccountNavigate('/settings')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant" aria-hidden="true">
                      account_circle
                    </span>
                    <span>{t('header.accountMenu.profile')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleAccountNavigate('/gamify')}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus:bg-surface-container-low focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant" aria-hidden="true">
                      emoji_events
                    </span>
                    <span>{t('header.accountMenu.rewards')}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleLogout()}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl border-t border-surface-container-low px-3 py-2.5 text-left text-sm font-semibold text-error transition-colors hover:bg-red-50 focus:bg-red-50 focus:outline-none cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                      logout
                    </span>
                    <span>{t('common.logout')}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
