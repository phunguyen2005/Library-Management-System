import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '../../i18n';
import { getAuditLogs, AuditLogEntry } from '../../api/auditApi';
import { motion } from 'framer-motion';
import { echoClient } from '../../lib/echo';

// Helper functions for UI
const getUserInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getUserAvatarColorClass = (name: string) => {
  if (!name) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 6;
  const colors = [
    'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20',
    'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20',
    'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20',
    'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/20',
    'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20',
    'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20',
  ];
  return colors[index];
};

const getActionBadgeStyles = (rawAction: string) => {
  const defaultStyle = {
    bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
    icon: 'receipt_long'
  };

  switch (rawAction) {
    case 'login':
      return { bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20', icon: 'login' };
    case 'logout':
      return { bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20', icon: 'logout' };
    case 'register':
      return { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20', icon: 'person_add' };
    case 'profile_update':
      return { bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20', icon: 'manage_accounts' };
    case 'book_create':
      return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', icon: 'add_box' };
    case 'book_update':
      return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', icon: 'edit_note' };
    case 'book_delete':
      return { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', icon: 'delete_sweep' };
    case 'digital_file_upload':
      return { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20', icon: 'upload_file' };
    case 'digital_file_download':
      return { bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20', icon: 'download' };
    case 'borrow_request':
      return { bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20', icon: 'shopping_basket' };
    case 'borrow_approve':
      return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', icon: 'check_circle' };
    case 'borrow_pickup':
      return { bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20', icon: 'handshake' };
    case 'borrow_reject':
      return { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20', icon: 'cancel' };
    case 'borrow_return':
      return { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', icon: 'assignment_return' };
    case 'collect_fine':
      return { bg: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20', icon: 'currency_exchange' };
    case 'settings_update':
      return { bg: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border border-fuchsia-500/20', icon: 'settings' };
    case 'revoke_device':
      return { bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20', icon: 'device_reset' };
    default:
      return defaultStyle;
  }
};

const getActionLabel = (rawAction: string, fallback: string, t: any) => {
  const map: Record<string, string> = {
    login: t('adminAuditLogs.actionLogin'),
    logout: t('adminAuditLogs.actionLogout'),
    register: t('adminAuditLogs.actionRegister'),
    profile_update: t('adminAuditLogs.actionProfileUpdate'),
    book_create: t('adminAuditLogs.actionBookCreate'),
    book_update: t('adminAuditLogs.actionBookUpdate'),
    book_delete: t('adminAuditLogs.actionBookDelete'),
    digital_file_upload: t('adminAuditLogs.actionFileUpload'),
    digital_file_download: t('adminAuditLogs.actionFileDownload'),
    borrow_request: t('adminAuditLogs.actionBorrowRequest'),
    borrow_approve: t('adminAuditLogs.actionBorrowApprove'),
    borrow_pickup: t('adminAuditLogs.actionBorrowPickup'),
    borrow_reject: t('adminAuditLogs.actionBorrowReject'),
    borrow_return: t('adminAuditLogs.actionBorrowReturn'),
    collect_fine: t('adminAuditLogs.actionCollectFine'),
    settings_update: t('adminAuditLogs.actionSettingsUpdate'),
    revoke_device: t('adminAuditLogs.actionRevokeDevice'),
  };
  return map[rawAction] || fallback;
};

const parseUserAgent = (ua: string | null, t: any) => {
  if (!ua) return { os: t('adminAuditLogs.systemActor'), browser: t('adminAuditLogs.systemActor'), osIcon: 'settings', browserIcon: 'settings' };
  
  let os = t('adminAuditLogs.deviceOther');
  let browser = t('adminAuditLogs.browserLabel');
  let osIcon = 'devices';
  let browserIcon = 'language';
  
  const uaLower = ua.toLowerCase();
  
  // OS Detection
  if (uaLower.includes('windows')) {
    os = 'Windows';
    osIcon = 'desktop_windows';
  } else if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
    os = 'macOS';
    osIcon = 'desktop_mac';
  } else if (uaLower.includes('android')) {
    os = 'Android';
    osIcon = 'phone_android';
  } else if (uaLower.includes('iphone') || uaLower.includes('ipad')) {
    os = 'iOS';
    osIcon = 'phone_iphone';
  } else if (uaLower.includes('linux')) {
    os = 'Linux';
    osIcon = 'computer';
  }
  
  // Browser Detection
  if (uaLower.includes('edg/')) {
    browser = 'Edge';
    browserIcon = 'web';
  } else if (uaLower.includes('chrome') || uaLower.includes('crios')) {
    browser = 'Chrome';
    browserIcon = 'chrome_reader_mode';
  } else if (uaLower.includes('safari') && !uaLower.includes('chrome')) {
    browser = 'Safari';
    browserIcon = 'explore';
  } else if (uaLower.includes('firefox')) {
    browser = 'Firefox';
    browserIcon = 'open_in_browser';
  } else if (uaLower.includes('opera') || uaLower.includes('opr/')) {
    browser = 'Opera';
    browserIcon = 'language';
  }
  
  return { os, browser, osIcon, browserIcon };
};

export default function AdminAuditLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  
  // Filters
  const [userType, setUserType] = useState('');
  const [action, setAction] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Ref to hold latest filter state for stable WebSocket callback without reconnection
  const filtersRef = useRef({ userType, action, dateFilter, currentPage });
  useEffect(() => {
    filtersRef.current = { userType, action, dateFilter, currentPage };
  }, [userType, action, dateFilter, currentPage]);

  // Real-time live scrolling terminal stream
  useEffect(() => {
    const channelName = 'admin-dashboard';
    const channel = echoClient.private(channelName);

    channel.listen('.audit.log.created', (newLog: AuditLogEntry) => {
      // 1. Increment total logs
      setTotalLogs((prev) => prev + 1);

      // 2. Play subtle chime sound
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});

      // 3. Read current filters from Ref
      const { userType: curUserType, action: curAction, dateFilter: curDate, currentPage: curPage } = filtersRef.current;

      if (curPage === 1) {
        let isMatch = true;
        if (curUserType && newLog.raw_user_type !== curUserType) isMatch = false;
        if (curAction && newLog.raw_action !== curAction) isMatch = false;
        if (curDate && newLog.created_at.substring(0, 10) !== curDate) isMatch = false;

        if (isMatch) {
          setLogs((prev) => {
            if (prev.some((l) => l.log_id === newLog.log_id)) return prev;
            // Cap at 15 logs per page
            return [newLog, ...prev.slice(0, 14)];
          });
        }
      }
    });

    return () => {
      echoClient.leave(channelName);
    };
  }, []);

  const fetchLogsData = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAuditLogs({
        page,
        user_type: userType || undefined,
        action: action || undefined,
        query: searchQuery || undefined,
        user_query: userQuery || undefined,
        date: dateFilter || undefined,
      });
      setLogs(res.data);
      setCurrentPage(res.current_page);
      setTotalPages(res.last_page);
      setTotalLogs(res.total);
    } catch (err: any) {
      setError(err?.message || t('adminAuditLogs.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsData(1);
  }, [userType, action, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogsData(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchLogsData(page);
    }
  };

  // Stats derived from current page logs list
  const uniqueIpsCount = new Set(logs.map(log => log.ip_address).filter(Boolean)).size;
  const adminActionsCount = logs.filter(log => log.raw_user_type === 'admin').length;
  const studentActionsCount = logs.filter(log => log.raw_user_type === 'student').length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {t('adminAuditLogs.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('adminAuditLogs.subtitle')}
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-bright border border-border/80 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('adminAuditLogs.statTotal')}</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">{totalLogs}</h3>
            <p className="text-[10px] text-muted-foreground/80 mt-1">{t('adminAuditLogs.statTotalDesc')}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">history</span>
          </div>
        </div>

        <div className="bg-surface-bright border border-border/80 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('adminAuditLogs.statIp')}</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">{uniqueIpsCount}</h3>
            <p className="text-[10px] text-muted-foreground/80 mt-1">{t('adminAuditLogs.statIpDesc')}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">lan</span>
          </div>
        </div>

        <div className="bg-surface-bright border border-border/80 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('adminAuditLogs.statLibrarians')}</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">{adminActionsCount}</h3>
            <p className="text-[10px] text-muted-foreground/80 mt-1">{t('adminAuditLogs.statLibrariansDesc')}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">shield_person</span>
          </div>
        </div>

        <div className="bg-surface-bright border border-border/80 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('adminAuditLogs.statStudents')}</p>
            <h3 className="text-2xl font-bold text-foreground mt-1 font-mono">{studentActionsCount}</h3>
            <p className="text-[10px] text-muted-foreground/80 mt-1">{t('adminAuditLogs.statStudentsDesc')}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">person</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-surface-bright border border-border/80 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('adminAuditLogs.searchLabel')}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">search</span>
              <input
                type="text"
                placeholder={t('adminAuditLogs.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2 bg-surface border border-border/85 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setTimeout(() => fetchLogsData(1), 0);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Operator Query */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('adminAuditLogs.userLabel')}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">person</span>
              <input
                type="text"
                placeholder={t('adminAuditLogs.userPlaceholder')}
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2 bg-surface border border-border/85 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60"
              />
              {userQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setUserQuery('');
                    setTimeout(() => fetchLogsData(1), 0);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* User Type */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('adminAuditLogs.targetLabel')}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">group</span>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface border border-border/85 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('adminAuditLogs.allTargets')}</option>
                <option value="student">{t('adminAuditLogs.targetStudent')}</option>
                <option value="admin">{t('adminAuditLogs.targetAdmin')}</option>
                <option value="unknown">{t('adminAuditLogs.targetSystem')}</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-lg">arrow_drop_down</span>
            </div>
          </div>

          {/* Action type */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('adminAuditLogs.actionLabel')}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">tune</span>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface border border-border/85 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="">{t('adminAuditLogs.allActions')}</option>
                <option value="login">{t('adminAuditLogs.actionLogin')}</option>
                <option value="logout">{t('adminAuditLogs.actionLogout')}</option>
                <option value="register">{t('adminAuditLogs.actionRegister')}</option>
                <option value="profile_update">{t('adminAuditLogs.actionProfileUpdate')}</option>
                <option value="book_create">{t('adminAuditLogs.actionBookCreate')}</option>
                <option value="book_update">{t('adminAuditLogs.actionBookUpdate')}</option>
                <option value="book_delete">{t('adminAuditLogs.actionBookDelete')}</option>
                <option value="digital_file_upload">{t('adminAuditLogs.actionFileUpload')}</option>
                <option value="digital_file_download">{t('adminAuditLogs.actionFileDownload')}</option>
                <option value="borrow_request">{t('adminAuditLogs.actionBorrowRequest')}</option>
                <option value="borrow_approve">{t('adminAuditLogs.actionBorrowApprove')}</option>
                <option value="borrow_pickup">{t('adminAuditLogs.actionBorrowPickup')}</option>
                <option value="borrow_reject">{t('adminAuditLogs.actionBorrowReject')}</option>
                <option value="borrow_return">{t('adminAuditLogs.actionBorrowReturn')}</option>
                <option value="collect_fine">{t('adminAuditLogs.actionCollectFine')}</option>
                <option value="settings_update">{t('adminAuditLogs.actionSettingsUpdate')}</option>
                <option value="revoke_device">{t('adminAuditLogs.actionRevokeDevice')}</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-lg">arrow_drop_down</span>
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              {t('adminAuditLogs.dateLabel')}
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">calendar_today</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface border border-border/85 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-primary/20 h-[38px]"
            >
              <span className="material-symbols-outlined text-lg">filter_alt</span>
              <span>{t('adminAuditLogs.btnFilter')}</span>
            </button>
            {(userType || action || searchQuery || userQuery || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setUserType('');
                  setAction('');
                  setSearchQuery('');
                  setUserQuery('');
                  setDateFilter('');
                  // Immediate reload with empty params
                  setTimeout(() => {
                    setLoading(true);
                    getAuditLogs({ page: 1 }).then(res => {
                      setLogs(res.data);
                      setCurrentPage(res.current_page);
                      setTotalPages(res.last_page);
                      setTotalLogs(res.total);
                      setLoading(false);
                    }).catch(err => {
                      setError(err?.message || t('adminAuditLogs.loadError'));
                      setLoading(false);
                    });
                  }, 0);
                }}
                className="px-3.5 bg-surface hover:bg-surface-container border border-border/85 text-muted-foreground hover:text-foreground rounded-xl transition-colors flex items-center justify-center cursor-pointer h-[38px]"
                title={t('adminAuditLogs.btnReset')}
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Main logs display */}
      <div className="bg-surface-bright border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-border/60 animate-pulse">
            <div className="bg-muted/30 py-3.5 px-4 h-11"></div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center py-4 px-4 gap-4">
                <div className="w-24 h-4 bg-muted rounded-md shrink-0"></div>
                <div className="w-40 flex items-center gap-3 shrink-0">
                  <div className="w-9 h-9 bg-muted rounded-xl"></div>
                  <div className="flex-1 space-y-1.5">
                    <div className="w-24 h-3.5 bg-muted rounded-md"></div>
                    <div className="w-12 h-2.5 bg-muted rounded-md"></div>
                  </div>
                </div>
                <div className="w-32 h-6 bg-muted rounded-lg shrink-0"></div>
                <div className="flex-1 h-4 bg-muted rounded-md min-w-[200px]"></div>
                <div className="w-36 space-y-1.5 shrink-0">
                  <div className="w-20 h-3.5 bg-muted rounded-md"></div>
                  <div className="w-28 h-3 bg-muted rounded-md"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <p className="text-red-500 font-semibold text-sm mb-2">{error}</p>
            <button
              onClick={() => fetchLogsData(currentPage)}
              className="px-4 py-2 bg-surface hover:bg-surface-container border border-border/85 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              {t('adminAuditLogs.btnRetry')}
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <span className="material-symbols-outlined text-3xl">receipt_long</span>
            </div>
            <h3 className="text-base font-bold text-foreground">{t('adminAuditLogs.emptyTitle')}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t('adminAuditLogs.emptyDesc')}
            </p>
            {(userType || action || searchQuery || userQuery || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setUserType('');
                  setAction('');
                  setSearchQuery('');
                  setUserQuery('');
                  setDateFilter('');
                  setTimeout(() => fetchLogsData(1), 0);
                }}
                className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all shadow-sm shadow-primary/10 cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>{t('adminAuditLogs.btnReset')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-bold">{t('adminAuditLogs.tableHeaderTime')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('adminAuditLogs.tableHeaderActor')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('adminAuditLogs.tableHeaderAction')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('adminAuditLogs.tableHeaderDesc')}</th>
                  <th className="py-3.5 px-4 font-bold">{t('adminAuditLogs.tableHeaderIp')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.map((log, index) => {
                  const logDate = new Date(log.created_at);
                  const timeStr = logDate.toLocaleTimeString(getIntlLocale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = logDate.toLocaleDateString(getIntlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' });
                  
                  const initials = getUserInitials(log.user_name);
                  const avatarColorClass = getUserAvatarColorClass(log.user_name);
                  const badgeStyle = getActionBadgeStyles(log.raw_action);
                  const client = parseUserAgent(log.user_agent, t);

                  return (
                    <motion.tr
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.2) }}
                      key={log.log_id}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <span className="material-symbols-outlined text-muted-foreground text-sm">schedule</span>
                          <span>{timeStr}</span>
                        </div>
                        <div className="text-muted-foreground text-[10px] mt-0.5 ml-[20px]">{dateStr}</div>
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${avatarColorClass}`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm leading-none">{log.user_name}</div>
                            {log.user_email && (
                              <div className="text-muted-foreground text-[10px] mt-1 font-medium leading-none truncate max-w-[150px]" title={log.user_email}>
                                {log.user_email}
                              </div>
                            )}
                            <span
                              className={`inline-flex items-center mt-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase ${
                                log.raw_user_type === 'admin'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  : log.raw_user_type === 'student'
                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                              }`}
                            >
                              {log.raw_user_type === 'admin' ? t('common.librarian') : log.raw_user_type === 'student' ? t('common.student') : t('adminAuditLogs.targetSystem')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${badgeStyle.bg}`}>
                          <span className="material-symbols-outlined text-[15px]">{badgeStyle.icon}</span>
                          <span>{getActionLabel(log.raw_action, log.action, t)}</span>
                        </span>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-muted-foreground text-xs leading-relaxed max-w-xs md:max-w-md break-words font-medium">
                        {log.description}
                      </td>

                      {/* IP & User Agent */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-foreground font-mono font-semibold">
                          <span className="material-symbols-outlined text-muted-foreground text-sm">lan</span>
                          <span>{log.ip_address || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span 
                            className="inline-flex items-center gap-0.5 bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-md text-[9px] font-semibold border border-border/50 cursor-help" 
                            title={log.user_agent || t('common.notAvailable')}
                          >
                            <span className="material-symbols-outlined text-[11px]">{client.osIcon}</span>
                            <span>{client.os}</span>
                          </span>
                          <span 
                            className="inline-flex items-center gap-0.5 bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-md text-[9px] font-semibold border border-border/50 cursor-help" 
                            title={log.user_agent || t('common.notAvailable')}
                          >
                            <span className="material-symbols-outlined text-[11px]">{client.browserIcon}</span>
                            <span>{client.browser}</span>
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && !error && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 px-6 py-4 bg-muted/10 text-sm">
            <div className="text-muted-foreground font-medium text-xs">
              {t('pagination.page')} <span className="font-bold text-foreground">{currentPage}</span> /{' '}
              <span className="font-bold text-foreground">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-surface-bright border border-border/80 hover:bg-muted/10 hover:border-border text-foreground rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                <span>{t('pagination.previous')}</span>
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="flex items-center gap-1 px-3.5 py-1.5 bg-surface-bright border border-border/80 hover:bg-muted/10 hover:border-border text-foreground rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm"
              >
                <span>{t('pagination.next')}</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
