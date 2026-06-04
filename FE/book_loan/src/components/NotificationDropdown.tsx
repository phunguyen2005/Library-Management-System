import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead, type AppNotification } from '../api/notificationApi';
import { useAuth } from '../auth/AuthContext';
import { emitToast } from '../notifications/events';
import { echoClient } from '../lib/echo';
import { getIntlLocale } from '../i18n';

const TRANSLATIONS = {
  vi: {
    newNotification: 'Thông báo mới',
    errorTitle: 'Lỗi',
    markAsReadError: 'Không thể đánh dấu đã đọc.',
    markAllAsReadError: 'Không thể đánh dấu tất cả đã đọc.',
    title: 'Thông báo',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    emptyState: 'Không có thông báo nào.'
  },
  en: {
    newNotification: 'New notification',
    errorTitle: 'Error',
    markAsReadError: 'Could not mark notification as read.',
    markAllAsReadError: 'Could not mark all notifications as read.',
    title: 'Notifications',
    markAllRead: 'Mark all as read',
    emptyState: 'No notifications.'
  },
  zh: {
    newNotification: '新通知',
    errorTitle: '错误',
    markAsReadError: '无法标记通知为已读。',
    markAllAsReadError: '无法将所有通知标记为已读。',
    title: '通知',
    markAllRead: '全部标记为已读',
    emptyState: '没有新通知。'
  },
  ja: {
    newNotification: '新しい通知',
    errorTitle: 'エラー',
    markAsReadError: '通知を既読にできませんでした。',
    markAllAsReadError: 'すべての通知を既読にできませんでした。',
    title: '通知',
    markAllRead: 'すべて既読にする',
    emptyState: '通知はありません。'
  },
  ko: {
    newNotification: '새 알림',
    errorTitle: '오류',
    markAsReadError: '알림을 읽음으로 표시할 수 없습니다.',
    markAllAsReadError: '모든 알림을 읽음으로 표시할 수 없습니다.',
    title: '알림',
    markAllRead: '모두 읽음으로 표시',
    emptyState: '알림이 없습니다.'
  }
};

export default function NotificationDropdown() {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'vi').startsWith('en') ? 'en' :
                      (i18n.language || 'vi').startsWith('zh') ? 'zh' :
                      (i18n.language || 'vi').startsWith('ja') ? 'ja' :
                      (i18n.language || 'vi').startsWith('ko') ? 'ko' : 'vi';
  const localT = TRANSLATIONS[currentLang];

  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.data);
      setUnreadCount(data.data.filter((n) => !n.read_at).length);
    } catch {
      // Ignore errors
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Resolve channel name dynamically for student or staff
    const channelName = user.member_id
      ? `App.Models.Member.${user.member_id}`
      : `App.Models.Librarian.${user.librarian_id}`;

    const channel = echoClient.private(channelName);

    channel.notification((notification: any) => {
      const newNotification: AppNotification = {
        id: notification.id || Math.random().toString(),
        read_at: null,
        created_at: new Date().toISOString(),
        data: {
          message: notification.message || notification.data?.message || localT.newNotification,
          ...notification
        }
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((count) => count + 1);

      // Sound chime for premium UX
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});

      // Screen Toast notification
      emitToast({
        tone: 'info',
        title: localT.newNotification,
        message: newNotification.data.message
      });
    });

    return () => {
      echoClient.leave(channelName);
    };
  }, [user, localT.newNotification]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications(); // Refresh on open
    }
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      emitToast({ tone: 'error', title: localT.errorTitle, message: localT.markAsReadError });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      emitToast({ tone: 'error', title: localT.errorTitle, message: localT.markAllAsReadError });
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read_at) {
      handleMarkAsRead(notification.id);
    }
  };

  return (
    <div className="md:relative" ref={wrapperRef}>
      <button
        onClick={handleToggle}
        className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error border-2 border-surface-bright flex items-center justify-center">
            {/* Can add tiny number if wanted, but standard dot is cleaner */}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-4 right-4 top-14 md:absolute md:left-auto md:right-0 md:top-full z-50 mt-2 w-auto md:w-80 overflow-hidden rounded-xl border border-surface-container-low bg-surface-bright shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 md:animate-none">
          <div className="flex items-center justify-between border-b border-surface-container-low px-4 py-3">
            <h3 className="text-sm font-bold text-on-surface">{localT.title}</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {localT.markAllRead}
              </button>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const isUnread = !notification.read_at;
                const content = (
                  <>
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className={`text-sm ${isUnread ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>
                        {notification.data.message}
                      </p>
                      {isUnread && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-[10px] text-outline">
                      {new Date(notification.created_at).toLocaleString(getIntlLocale())}
                    </span>
                  </>
                );

                if (isUnread) {
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="flex w-full flex-col items-start gap-1 border-b border-surface-container-low p-4 text-left transition-colors hover:bg-surface-container-low bg-primary/5 cursor-pointer"
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div
                    key={notification.id}
                    className="flex w-full flex-col items-start gap-1 border-b border-surface-container-low p-4 text-left text-on-surface-variant bg-surface-bright"
                  >
                    {content}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-on-surface-variant">
                {localT.emptyState}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
