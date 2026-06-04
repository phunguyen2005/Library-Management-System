import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { echoClient } from '../../lib/echo';
import { cancelBorrow, getMyRequests } from '../../api/borrowApi';
import { getFineSummary } from '../../api/fineApi';
import { fetchMyReservations, cancelReservation, type ReservationRecord } from '../../api/reservationApi';
import EmptyState from '../../components/EmptyState';
import { applyImageFallback, formatDisplayDate, getCoverUrl } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { MemberBorrowRequest } from '../../types/request';
import { getIntlLocale } from '../../i18n';

const STATUS_MAP: Record<
  MemberBorrowRequest['status'],
  { color: string }
> = {
  pending: { color: 'text-blue-600 bg-blue-50 border-blue-200' },
  approved: { color: 'text-amber-600 bg-amber-50 border-amber-200' },
  borrowed: { color: 'text-green-600 bg-green-50 border-green-200' },
  returned: { color: 'text-slate-500 bg-slate-100 border-slate-200' },
  rejected: { color: 'text-red-600 bg-red-50 border-red-200' },
  cancelled: { color: 'text-slate-400 bg-slate-100 border-slate-200' },
};

type RequestRow = {
  id: number;
  book: string;
  author: string;
  cover?: string | null;
  date: string;
  dateLabel: string;
  rawStatus: MemberBorrowRequest['status'];
  statusLabel: string;
  statusColor: string;
  rejectionReason?: string | null;
  dueDate?: string | null;
  isOverdue?: boolean;
  daysOverdue?: number;
  dueStatus?: string;
};

type LocalizedBroadcastEvent = {
  message?: string;
  message_key?: string;
  message_params?: Record<string, unknown>;
  book_title?: string;
  position?: number;
};

export default function StudentRequests() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | MemberBorrowRequest['status'] | 'reservations'>('all');
  const [allRequests, setAllRequests] = useState<RequestRow[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationRecord[]>([]);
  const [fineSummary, setFineSummary] = useState({ has_unpaid: false, total_unpaid: 0, count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomQrCode, setZoomQrCode] = useState<{ id: string; title: string } | null>(null);

  const localizedEventMessage = useCallback((
    event: LocalizedBroadcastEvent,
    fallbackKey: string,
    fallbackParams: Record<string, unknown> = {},
  ) => {
    const key = event.message_key?.replace(/^messages\./, '');
    if (key) {
      return t(key, event.message_params ?? fallbackParams);
    }

    return event.message || t(fallbackKey, fallbackParams);
  }, [t]);

  const loadRequestsData = () => {
    setIsLoading(true);
    setError(null);

    Promise.all([getMyRequests(), fetchMyReservations(), getFineSummary()])
      .then(([borrowData, resData, summaryData]) => {
        const mapped = borrowData.map((r) => {
          const cfg = STATUS_MAP[r.status] || {
            color: 'text-slate-500 bg-slate-100 border-slate-200',
          };

          return {
            id: r.id,
            book: r.bookTitle,
            author: r.author,
            cover: getCoverUrl(r.cover),
            date: formatDisplayDate(r.status === 'rejected' || r.status === 'cancelled' ? r.rejected_at || r.borrow_date : r.borrow_date),
            dateLabel: r.status === 'rejected' || r.status === 'cancelled' ? t('adminRequests.tabCancelled') : t('studentRequests.dateBorrowed', 'Ngày mượn'),
            rawStatus: r.status,
            statusLabel: t('status.' + r.status),
            statusColor: cfg.color,
            rejectionReason: r.rejection_reason || null,
            dueDate: r.due_date || null,
            isOverdue: r.is_overdue,
            daysOverdue: r.days_overdue,
            dueStatus: r.due_status,
          };
        });
        setAllRequests(mapped);
        setMyReservations(resData);
        setFineSummary(summaryData);
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, t('studentRequests.loadError', 'Không thể tải dữ liệu.'));
        setError(message);
        emitToast({ tone: 'error', title: t('studentRequests.syncError', 'Lỗi đồng bộ'), message });
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRequestsData();
  }, []);

  // Real-time WebSocket listener for approved borrow requests and reservation queue shifts
  useEffect(() => {
    if (!user || !user.member_id) return;

    const channelName = `member.${user.member_id}`;
    const channel = echoClient.private(channelName);

    channel.listen('.borrow.request.approved', (event: LocalizedBroadcastEvent) => {
      // Live-update all request and reservation data
      loadRequestsData();

      // Chime sound for premium UX
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});

      // Screen Toast notification
      emitToast({
        tone: 'success',
        title: t('events.borrowApprovedTitle'),
        message: localizedEventMessage(event, 'events.borrow_request_approved', {
          book_title: event.book_title,
        }),
      });
    });

    channel.listen('.reservation.queue.shifted', (event: LocalizedBroadcastEvent) => {
      // Live-update all request and reservation data
      loadRequestsData();

      // Chime sound for premium UX
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});

      // Screen Toast notification
      emitToast({
        tone: 'info',
        title: t('events.reservationShiftedTitle'),
        message: localizedEventMessage(event, 'events.reservation_queue_shifted', {
          book_title: event.book_title,
          position: event.position,
        }),
      });
    });

    channel.listen('.borrow.request.updated', (event: LocalizedBroadcastEvent) => {
      // Background reload of the requests list to get the latest status (return, reject, etc)
      loadRequestsData();

      // Screen Toast notification
      emitToast({
        tone: 'info',
        title: t('events.borrowUpdatedTitle'),
        message: localizedEventMessage(event, 'events.borrow_request_updated'),
      });
    });

    return () => {
      echoClient.leave(channelName);
    };
  }, [localizedEventMessage, user, t]);

  const handleCancelReservation = async (reservationId: number) => {
    try {
      await cancelReservation(reservationId);
      setMyReservations((prev) => prev.filter((r) => r.reservation_id !== reservationId));
      emitToast({ tone: 'success', title: t('studentRequests.success', 'Thành công'), message: t('studentRequests.cancelReservationSuccess', 'Hủy đặt chỗ thành công') });
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('studentRequests.cancelReservationError', 'Không thể hủy đặt chỗ.'));
      emitToast({ tone: 'error', title: t('studentRequests.cancelReservationFailed', 'Hủy đặt chỗ thất bại'), message });
    }
  };

  const handleCancelBorrow = async (loanId: number, bookTitle: string) => {
    if (!window.confirm(t('studentRequests.cancelConfirm', { title: bookTitle }))) return;
    try {
      await cancelBorrow(loanId);
      setAllRequests((prev) =>
        prev.map((r) =>
          r.id === loanId
            ? { ...r, rawStatus: 'cancelled', statusLabel: t('status.cancelled'), statusColor: 'text-slate-400 bg-slate-100 border-slate-200' }
            : r,
        ),
      );
      emitToast({ tone: 'success', title: t('status.cancelled'), message: t('studentRequests.cancelSuccess') });
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('studentRequests.cancelBorrowError', 'Không thể hủy yêu cầu.'));
      emitToast({ tone: 'error', title: t('common.error'), message });
    }
  };

  const countOf = (status: MemberBorrowRequest['status']) =>
    allRequests.filter((r) => r.rawStatus === status).length;
  const filtered =
    activeTab === 'all' ? allRequests : allRequests.filter((r) => r.rawStatus === activeTab);

  const tabs = [
    { key: 'all', label: `${t('adminDashboard.inventoryManage.filterAll')} (${allRequests.length})` },
    { key: 'pending', label: `${t('status.pending')} (${countOf('pending')})` },
    { key: 'approved', label: `${t('status.approved')} (${countOf('approved')})` },
    { key: 'borrowed', label: `${t('status.borrowed')} (${countOf('borrowed')})` },
    { key: 'returned', label: `${t('status.returned')} (${countOf('returned')})` },
    { key: 'rejected', label: `${t('status.rejected')} (${countOf('rejected')})` },
    { key: 'cancelled', label: `${t('status.cancelled')} (${countOf('cancelled')})` },
    { key: 'reservations', label: `${t('studentRequests.reservationsTab', 'Đặt chỗ')} (${myReservations.length})` },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{t('studentRequests.title')}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('studentRequests.subtitle')}
          </p>
        </div>
      </div>

      {fineSummary.has_unpaid && (
        <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm md:flex-row md:items-center">
          <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
          <div className="flex-1">
            <h4 className="font-bold text-sm">
              {t('studentHome.fineWarning', { count: fineSummary.count })}
            </h4>
            <p className="text-xs text-red-700 mt-0.5">
              {t('studentHome.totalUnpaid', { amount: fineSummary.total_unpaid.toLocaleString(getIntlLocale()) })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/fines')}
            className="w-fit rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            {t('studentHome.viewDetails')}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="custom-scrollbar flex max-w-full items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-surface-container bg-slate-50 p-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all shrink-0 ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow'
                  : 'text-slate-500 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="divide-y divide-surface-container">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400">
              <span className="material-symbols-outlined mb-3 text-4xl">hourglass_empty</span>
              <p>{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="p-5">
              <EmptyState icon="error" title={t('studentHome.loadError')} message={error} />
            </div>
          ) : activeTab === 'reservations' ? (
            myReservations.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon="bookmark"
                  title={t('studentRequests.noReservations')}
                  message={t('studentRequests.noReservationsDesc')}
                />
              </div>
            ) : (
              myReservations.map((res) => (
                <div
                  key={res.reservation_id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/50 md:flex-row md:items-center justify-between"
                >
                  <div className="flex gap-4 items-center min-w-0 flex-1">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                      <img
                        src={getCoverUrl(res.book?.cover)}
                        alt={res.book?.title || 'Book Cover'}
                        onError={(event) => applyImageFallback(event.currentTarget)}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                          #{res.reservation_id}
                        </span>
                        <span
                          className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-600"
                        >
                          {t('studentRequests.queueWaiting')}
                        </span>
                        <span
                          className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary"
                        >
                          {t('studentRequests.queuePosition', { position: res.position })}
                        </span>
                      </div>
                      <h4 className="truncate text-sm md:text-base font-bold text-on-surface">{res.book?.title || t('common.notAvailable')}</h4>
                      <p className="text-xs text-on-surface-variant">{res.book?.author || t('common.notAvailable')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 border-t border-outline-variant pt-3 md:border-t-0 md:pt-0">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-outline">
                        {t('studentRequests.dateBorrowed', 'Ngày đăng ký')}
                      </p>
                      <p className="text-xs md:text-sm font-medium text-slate-700">{formatDisplayDate(res.created_at)}</p>
                    </div>
                    <button
                      onClick={() => handleCancelReservation(res.reservation_id)}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">cancel</span>
                      {t('studentRequests.cancelReservation')}
                    </button>
                  </div>
                </div>
              ))
            )
          ) : filtered.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon="pending_actions"
                title={t('studentRequests.noMatchingRequests')}
                message={t('studentRequests.noMatchingRequestsDesc')}
              />
            </div>
          ) : (
            filtered.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-slate-50/50 md:flex-row md:items-center justify-between"
              >
                <div className="flex gap-4 items-center min-w-0 flex-1">
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                    <img
                      src={request.cover}
                      alt={request.book}
                      onError={(event) => applyImageFallback(event.currentTarget)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-400">
                        #{request.id}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${request.statusColor}`}
                      >
                        {request.statusLabel}
                      </span>
                    </div>
                    <h4 className="truncate text-sm md:text-base font-bold text-on-surface">{request.book}</h4>
                    <p className="text-xs text-on-surface-variant">{request.author}</p>
                    {(request.rawStatus === 'rejected' || request.rawStatus === 'cancelled') && request.rejectionReason ? (
                      <p className="mt-1 text-xs text-red-600">
                        {t('adminRequests.rejectionReasonLabel', { reason: request.rejectionReason })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between md:flex-row md:items-center gap-4 border-t border-outline-variant pt-3 md:border-t-0 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-outline">
                      {request.dateLabel}
                    </p>
                    <p className="text-xs md:text-sm font-medium text-slate-700">{request.date}</p>
                  </div>
                  {request.rawStatus === 'pending' ? (
                    <div className="shrink-0 flex items-center gap-3">
                      <div 
                        onClick={() => setZoomQrCode({ id: request.id.toString(), title: request.book })}
                        className="rounded bg-white p-1 shadow-sm border border-slate-200 cursor-zoom-in hover:border-primary/50 transition-colors"
                        title={t('studentRequests.zoomQrCodeAria', 'Phóng to mã QR')}
                      >
                        <QRCodeSVG value={request.id.toString()} size={36} />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelBorrow(request.id, request.book)}
                        className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-100 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">cancel</span>
                        {t('common.cancel')}
                      </button>
                    </div>
                  ) : request.rawStatus !== 'cancelled' ? (
                    <div className="shrink-0">
                      <div 
                        onClick={() => setZoomQrCode({ id: request.id.toString(), title: request.book })}
                        className="rounded bg-white p-1 shadow-sm border border-slate-200 cursor-zoom-in hover:border-primary/50 transition-colors"
                        title={t('studentRequests.zoomQrCodeAria', 'Phóng to mã QR')}
                      >
                        <QRCodeSVG value={request.id.toString()} size={36} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {zoomQrCode && (
        <div 
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4 backdrop-blur-sm"
          onClick={() => setZoomQrCode(null)}
        >
          <div 
            className="w-full max-w-sm overflow-hidden rounded-t-3xl rounded-b-none md:rounded-2xl bg-white p-6 shadow-2xl text-center space-y-4 transition-all duration-300 transform scale-100 animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">{t('studentRequests.qrModalTitle')}</h3>
              <button 
                type="button" 
                onClick={() => setZoomQrCode(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex justify-center py-4 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
              <QRCodeSVG value={zoomQrCode.id} size={220} />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 line-clamp-1">{zoomQrCode.title}</p>
              <p className="text-xs text-slate-500 font-mono">{t('studentRequests.transactionCode')}: #{zoomQrCode.id}</p>
            </div>

            <button
              type="button"
              onClick={() => setZoomQrCode(null)}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-hover transition-colors shadow-md shadow-primary/10"
            >
              {t('studentRequests.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
