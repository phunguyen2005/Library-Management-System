import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  approveBorrow,
  cancelBorrow,
  extendLoan,
  getAllRequests,
  rejectBorrow,
  returnBook,
  type BookCondition,
  type BorrowRequest,
} from '../../api/borrowApi';
import EmptyState from '../../components/EmptyState';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

type RequestTab = 'ALL' | 'APPROVED' | 'BORROWED' | 'HISTORY' | 'REJECTED' | 'CANCELLED';

const TAB_LABELS: Record<RequestTab, string> = {
  ALL: 'Yêu cầu chờ duyệt',
  APPROVED: 'Chờ nhận sách',
  BORROWED: 'Đang mượn',
  HISTORY: 'Lịch sử trả sách',
  REJECTED: 'Yêu cầu từ chối',
  CANCELLED: 'Đã hủy',
};

const TAB_STATUS: Record<RequestTab, BorrowRequest['raw_status'] | null> = {
  ALL: 'pending',
  APPROVED: 'approved',
  BORROWED: 'borrowed',
  HISTORY: 'returned',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

function getOptimisticStatusLabel(status: BorrowRequest['raw_status']) {
  if (status === 'approved') return 'Chờ nhận sách';
  if (status === 'borrowed') return 'Đang mượn';
  if (status === 'returned') return 'Đã trả';
  if (status === 'pending') return 'Chờ duyệt';
  if (status === 'cancelled') return 'Đã hủy';
  return 'Từ chối';
}

function getTodayLabel() {
  return new Date().toISOString().slice(0, 10);
}

function getDueBadge(request: BorrowRequest) {
  if (request.raw_status !== 'borrowed' || !request.due_date) return null;
  const { due_status, days_overdue } = request;

  if (due_status === 'overdue') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
        <span className="material-symbols-outlined text-[11px]">warning</span>
        Quá hạn {days_overdue} ngày
      </span>
    );
  }
  if (due_status === 'due_today') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        Đến hạn hôm nay
      </span>
    );
  }
  if (due_status === 'due_soon') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700">
        Sắp đến hạn
      </span>
    );
  }
  return null;
}

export default function AdminRequests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<RequestTab>('ALL');
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BorrowRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<BorrowRequest | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Feature 5 – Search bar state
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Feature 6 – Return condition dialog state
  const [returnTarget, setReturnTarget] = useState<BorrowRequest | null>(null);
  const [returnCondition, setReturnCondition] = useState<BookCondition>('good');
  const [returnNote, setReturnNote] = useState('');

  // Feature 7 – Extend dialog state
  const [extendTarget, setExtendTarget] = useState<BorrowRequest | null>(null);
  const [extendDays, setExtendDays] = useState(7);

  const bookFilter = searchParams.get('book');

  const fetchRequests = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      setLoadError(null);
      const data = await getAllRequests(searchQuery ? { query: searchQuery } : undefined);
      setRequests(data);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      const message = getErrorMessage(error, 'Không thể tải danh sách yêu cầu.');
      setLoadError(message);
      emitToast({ tone: 'error', title: 'Không thể tải yêu cầu', message });
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      void fetchRequests(false);
    }, 350);
  };

  const filteredRequests = useMemo(() => {
    const statusFilter = TAB_STATUS[tab];
    const scopedRequests = statusFilter
      ? requests.filter((r) => r.raw_status === statusFilter)
      : requests;

    if (!bookFilter) return scopedRequests;
    return scopedRequests.filter((r) => r.bookCode === bookFilter);
  }, [bookFilter, requests, tab]);

  const applyOptimisticUpdate = (
    loanId: number,
    nextStatus: BorrowRequest['raw_status'],
    patch: Partial<BorrowRequest> = {},
  ) => {
    setRequests((current) =>
      current.map((request) =>
        request.id === loanId
          ? { ...request, raw_status: nextStatus, status: getOptimisticStatusLabel(nextStatus), date: getTodayLabel(), ...patch }
          : request,
      ),
    );
  };

  const handleApprove = async (loanId: number) => {
    setActiveRequestId(loanId);
    try {
      await approveBorrow(loanId);
      startTransition(() => applyOptimisticUpdate(loanId, 'approved'));
      void fetchRequests(false);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      emitToast({ tone: 'error', title: 'Không thể duyệt yêu cầu', message: getErrorMessage(error, 'Lỗi khi duyệt') });
    } finally {
      setActiveRequestId(null);
    }
  };

  const handleConfirmPickup = async (loanId: number) => {
    setActiveRequestId(loanId);
    try {
      await import('../../api/borrowApi').then((m) => m.confirmPickup(loanId));
      startTransition(() => applyOptimisticUpdate(loanId, 'borrowed'));
      void fetchRequests(false);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      emitToast({ tone: 'error', title: 'Không thể xác nhận giao sách', message: getErrorMessage(error, 'Lỗi khi giao sách') });
    } finally {
      setActiveRequestId(null);
    }
  };

  const openRejectDialog = (request: BorrowRequest) => {
    setRejectTarget(request);
    setRejectReason('');
    setRejectError(null);
  };

  const closeRejectDialog = () => {
    setRejectTarget(null);
    setRejectReason('');
    setRejectError(null);
  };

  const handleRejectSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (reason.length < 3) { setRejectError('Vui lòng nhập lý do từ chối từ 3 ký tự trở lên.'); return; }
    setActiveRequestId(rejectTarget.id);
    try {
      await rejectBorrow(rejectTarget.id, reason);
      startTransition(() => {
        applyOptimisticUpdate(rejectTarget.id, 'rejected', { rejection_reason: reason, rejected_at: new Date().toISOString() });
        setTab('REJECTED');
      });
      closeRejectDialog();
      void fetchRequests(false);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      emitToast({ tone: 'error', title: 'Không thể từ chối yêu cầu', message: getErrorMessage(error, 'Lỗi khi từ chối yêu cầu') });
    } finally {
      setActiveRequestId(null);
    }
  };

  // Feature 6 – Return with condition
  const openReturnDialog = (request: BorrowRequest) => {
    setReturnTarget(request);
    setReturnCondition('good');
    setReturnNote('');
    setDetailTarget(null);
  };

  const handleReturnSubmit = async () => {
    if (!returnTarget) return;
    setActiveRequestId(returnTarget.id);
    try {
      await returnBook(returnTarget.id, returnCondition, returnNote || undefined);
      startTransition(() => applyOptimisticUpdate(returnTarget.id, 'returned'));
      setReturnTarget(null);
      void fetchRequests(false);
      emitToast({ tone: 'success', title: 'Thành công', message: 'Đã xử lý trả sách.' });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      emitToast({ tone: 'error', title: 'Không thể nhận trả sách', message: getErrorMessage(error, 'Lỗi khi trả sách') });
    } finally {
      setActiveRequestId(null);
    }
  };

  // Feature 7 – Extend loan
  const openExtendDialog = (request: BorrowRequest) => {
    setExtendTarget(request);
    setExtendDays(7);
    setDetailTarget(null);
  };

  const handleExtendSubmit = async () => {
    if (!extendTarget) return;
    setActiveRequestId(extendTarget.id);
    try {
      const result = await extendLoan(extendTarget.id, extendDays);
      startTransition(() =>
        setRequests((current) =>
          current.map((r) =>
            r.id === extendTarget.id
              ? { ...r, due_date: result.new_due_date, due_status: undefined, is_overdue: false, days_overdue: 0 }
              : r,
          ),
        ),
      );
      setExtendTarget(null);
      void fetchRequests(false);
      emitToast({ tone: 'success', title: 'Gia hạn thành công', message: `Hạn trả mới: ${result.new_due_date}` });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      emitToast({ tone: 'error', title: 'Không thể gia hạn', message: getErrorMessage(error, 'Lỗi khi gia hạn') });
    } finally {
      setActiveRequestId(null);
    }
  };

  const handlePayFine = async (fineId: number) => {
    if (!detailTarget) return;
    setActiveRequestId(detailTarget.id);
    try {
      await import('../../api/fineApi').then((m) => m.payFine(fineId));
      emitToast({ tone: 'success', title: 'Thành công', message: 'Đã xác nhận đóng phí phạt thành công.' });
      setDetailTarget({ ...detailTarget, fine: detailTarget.fine ? { ...detailTarget.fine, status: 'paid', paid_at: new Date().toISOString() } : null });
      void fetchRequests(false);
    } catch (error: unknown) {
      emitToast({ tone: 'error', title: 'Không thể thu phí phạt', message: getErrorMessage(error, 'Lỗi khi thu phí phạt') });
    } finally {
      setActiveRequestId(null);
    }
  };

  const handleExportRequests = () => {
    if (filteredRequests.length === 0) {
      emitToast({ tone: 'info', title: 'Không có dữ liệu xuất', message: 'Bộ lọc hiện tại không có bản ghi.' });
      return;
    }
    const rows = [
      ['Mã phiếu', 'Mã độc giả', 'Tên độc giả', 'Mã sách', 'Tên sách', 'Trạng thái', 'Ngày yêu cầu', 'Hạn trả', 'Ngày trả', 'Quá hạn', 'Lý do từ chối'],
      ...filteredRequests.map((r) => [
        String(r.id), r.code, r.name, r.bookCode, r.book, r.status,
        r.requested_at || '', r.due_date || '', r.return_date || '',
        r.is_overdue ? 'Có' : 'Không', r.rejection_reason || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `requests-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAdminCancel = async (loanId: number) => {
    setActiveRequestId(loanId);
    try {
      await cancelBorrow(loanId);
      startTransition(() => applyOptimisticUpdate(loanId, 'cancelled'));
      void fetchRequests(false);
      emitToast({ tone: 'success', title: 'Đã hủy', message: 'Đã hủy yêu cầu mượn sách.' });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      emitToast({ tone: 'error', title: 'Không thể hủy', message: getErrorMessage(error, 'Lỗi khi hủy yêu cầu') });
    } finally {
      setActiveRequestId(null);
    }
  };

  const tabKeys = Object.keys(TAB_LABELS) as RequestTab[];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Duyệt mượn trả</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Xử lý các yêu cầu mượn mới và theo dõi sách đang luân chuyển.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bookFilter ? (
            <button
              type="button"
              onClick={() => { const p = new URLSearchParams(searchParams); p.delete('book'); setSearchParams(p, { replace: true }); }}
              className="rounded-full bg-primary-container px-4 py-2 text-xs font-semibold text-primary hover:bg-primary-container/80"
            >
              Mã sách {bookFilter} ×
            </button>
          ) : null}
          <div className="rounded-full bg-surface-container px-4 py-2 text-xs font-semibold text-outline">
            {filteredRequests.length} mục
          </div>
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
            Quét mã QR
          </button>
          <button
            type="button"
            onClick={handleExportRequests}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Feature 5 – Search bar */}
      <div className="flex items-center gap-3 rounded-xl border border-surface-container bg-surface-bright px-4 py-2.5 shadow-sm">
        <span className="material-symbols-outlined text-[20px] text-outline">search</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Tìm theo tên sinh viên, email, tên sách, tác giả..."
          className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-outline"
          id="admin-requests-search"
        />
        {searchQuery && (
          <button type="button" onClick={() => handleSearchChange('')} className="text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Tabs + Table */}
      <section className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="flex flex-wrap border-b border-surface-container bg-slate-50/50">
          {tabKeys.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`flex-1 min-w-[100px] py-3.5 text-xs font-bold transition-all ${
                tab === tabKey
                  ? 'border-b-2 border-primary bg-white text-primary'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {TAB_LABELS[tabKey]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-surface-container bg-white text-xs font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Mã phiếu</th>
                <th className="px-6 py-4">Thông tin độc giả</th>
                <th className="px-6 py-4">Tài liệu</th>
                <th className="px-6 py-4">Thời gian</th>
                {/* Feature 1 – Due date column, only visible on BORROWED tab */}
                {tab === 'BORROWED' && <th className="px-6 py-4">Hạn trả</th>}
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr><td colSpan={tab === 'BORROWED' ? 7 : 6} className="px-6 py-8 text-center text-slate-500">Đang tải dữ liệu...</td></tr>
              ) : loadError ? (
                <tr><td colSpan={tab === 'BORROWED' ? 7 : 6} className="px-6 py-8"><EmptyState icon="error" title="Không thể tải yêu cầu" message={loadError} /></td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={tab === 'BORROWED' ? 7 : 6} className="px-6 py-8"><EmptyState icon="assignment" title="Không có bản ghi phù hợp" message="Các phiếu mượn sẽ xuất hiện khi sinh viên gửi yêu cầu hoặc thủ thư xử lý phiếu." /></td></tr>
              ) : (
                filteredRequests.map((request) => {
                  const isBusy = activeRequestId === request.id;
                  const dueBadge = getDueBadge(request);

                  return (
                    <tr key={request.id} className={`transition-colors hover:bg-slate-50 ${request.is_overdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-sm font-bold text-slate-700">#{request.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${request.roleColor}`}>{request.role}</div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{request.name}</p>
                            <p className="text-[10px] text-slate-500">ID: {request.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-700">{request.book}</p>
                        <p className="text-[10px] text-slate-500">Mã kho: {request.bookCode}</p>
                        {request.raw_status === 'rejected' && request.rejection_reason ? (
                          <p className="mt-1 max-w-xs text-xs text-red-600">Lý do: {request.rejection_reason}</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-slate-600">
                          <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                          <span className="text-xs font-medium">{request.date}</span>
                        </div>
                      </td>
                      {/* Feature 1 – Due date + overdue badge */}
                      {tab === 'BORROWED' && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-slate-700">{request.due_date || '—'}</span>
                            {dueBadge}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {request.raw_status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleApprove(request.id)} disabled={isBusy}
                              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-primary/30 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                              {isBusy ? 'Đang xử lý...' : 'Duyệt'}
                            </button>
                            <button onClick={() => openRejectDialog(request)} disabled={isBusy}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">
                              Từ chối
                            </button>
                          </div>
                        ) : request.raw_status === 'approved' ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleConfirmPickup(request.id)} disabled={isBusy}
                              className="whitespace-nowrap rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                              {isBusy ? 'Đang xử lý...' : 'Xác nhận giao sách'}
                            </button>
                            <button onClick={() => handleAdminCancel(request.id)} disabled={isBusy}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
                              Hủy
                            </button>
                          </div>
                        ) : request.raw_status === 'borrowed' ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openReturnDialog(request)} disabled={isBusy}
                              className="whitespace-nowrap rounded-lg bg-tertiary px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-tertiary/30 transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60">
                              {isBusy ? 'Đang xử lý...' : 'Nhận trả sách'}
                            </button>
                            <button onClick={() => openExtendDialog(request)} disabled={isBusy}
                              className="whitespace-nowrap rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-60">
                              Gia hạn
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setDetailTarget(request)}
                            className="px-3 py-1.5 text-xs font-semibold text-primary hover:underline">
                            Chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Reject dialog */}
      {rejectTarget ? (
        <div role="dialog" aria-modal="true" aria-labelledby="reject-request-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleRejectSubmit}
            className="w-full max-w-md rounded-lg border border-surface-container bg-white p-6 shadow-xl">
            <h3 id="reject-request-title" className="text-lg font-bold text-slate-900">Từ chối yêu cầu #{rejectTarget.id}</h3>
            <p className="mt-1 text-sm text-slate-600">Nhập lý do để sinh viên có thể xem lại trong lịch sử yêu cầu.</p>
            <label className="mt-5 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Lý do từ chối</span>
              <textarea value={rejectReason} onChange={(e) => { setRejectReason(e.target.value); setRejectError(null); }} rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Ví dụ: Sách đang được kiểm kê hoặc thông tin yêu cầu chưa hợp lệ." />
            </label>
            {rejectError ? <p role="alert" className="mt-2 text-sm text-red-600">{rejectError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeRejectDialog} disabled={activeRequestId === rejectTarget.id}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
                Hủy
              </button>
              <button type="submit" disabled={activeRequestId === rejectTarget.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
                {activeRequestId === rejectTarget.id ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Feature 6 – Return condition dialog */}
      {returnTarget ? (
        <div role="dialog" aria-modal="true" aria-labelledby="return-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-surface-container bg-white p-6 shadow-xl">
            <h3 id="return-dialog-title" className="text-lg font-bold text-slate-900">Nhận trả sách #{returnTarget.id}</h3>
            <p className="mt-1 text-sm text-slate-600">{returnTarget.book} — {returnTarget.name}</p>

            <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">Tình trạng sách khi trả</p>
            <div className="mt-3 flex flex-col gap-2">
              {(['good', 'damaged', 'lost'] as BookCondition[]).map((cond) => {
                const labels = { good: '✅ Bình thường', damaged: '⚠️ Hư hỏng', lost: '❌ Mất sách' };
                const subtext = { good: 'Không phát sinh phí phạt bổ sung', damaged: 'Phát sinh phí bồi thường hư hỏng', lost: 'Phát sinh phí bồi thường mất sách — không hoàn lại tồn kho' };
                return (
                  <label key={cond} className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${returnCondition === cond ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="condition" value={cond} checked={returnCondition === cond}
                      onChange={() => setReturnCondition(cond)} className="mt-0.5 accent-primary" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{labels[cond]}</p>
                      <p className="text-xs text-slate-500">{subtext[cond]}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {returnCondition !== 'good' && (
              <div className="mt-4">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Ghi chú (tuỳ chọn)</label>
                <textarea value={returnNote} onChange={(e) => setReturnNote(e.target.value)} rows={2}
                  placeholder="Mô tả tình trạng cụ thể..."
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setReturnTarget(null)} disabled={activeRequestId === returnTarget.id}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Hủy
              </button>
              <button type="button" onClick={handleReturnSubmit} disabled={activeRequestId === returnTarget.id}
                className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${returnCondition === 'lost' ? 'bg-red-600 hover:bg-red-700' : returnCondition === 'damaged' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-tertiary hover:bg-tertiary/90'}`}>
                {activeRequestId === returnTarget.id ? 'Đang xử lý...' : 'Xác nhận trả sách'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Feature 7 – Extend loan dialog */}
      {extendTarget ? (
        <div role="dialog" aria-modal="true" aria-labelledby="extend-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-surface-container bg-white p-6 shadow-xl">
            <h3 id="extend-dialog-title" className="text-lg font-bold text-slate-900">Gia hạn phiếu #{extendTarget.id}</h3>
            <p className="mt-1 text-sm text-slate-600">{extendTarget.book} — {extendTarget.name}</p>
            {extendTarget.due_date && (
              <p className="mt-2 text-xs text-slate-500">Hạn hiện tại: <span className="font-bold text-slate-700">{extendTarget.due_date}</span></p>
            )}
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Số ngày gia hạn thêm (tối đa 30)</label>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" onClick={() => setExtendDays((d) => Math.max(1, d - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">−</button>
                <input type="number" min={1} max={30} value={extendDays}
                  onChange={(e) => setExtendDays(Math.min(30, Math.max(1, Number(e.target.value))))}
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-bold outline-none focus:border-primary" />
                <button type="button" onClick={() => setExtendDays((d) => Math.min(30, d + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">+</button>
                <span className="text-sm text-slate-500">ngày</span>
              </div>
              {extendTarget.due_date && (
                <p className="mt-2 text-xs text-primary font-medium">
                  Hạn mới: {new Date(new Date(extendTarget.due_date).getTime() + extendDays * 86400000).toISOString().slice(0, 10)}
                </p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setExtendTarget(null)} disabled={activeRequestId === extendTarget.id}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                Hủy
              </button>
              <button type="button" onClick={handleExtendSubmit} disabled={activeRequestId === extendTarget.id}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
                {activeRequestId === extendTarget.id ? 'Đang xử lý...' : 'Xác nhận gia hạn'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Detail modal */}
      {detailTarget ? (
        <div role="dialog" aria-modal="true" aria-labelledby="request-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-surface-container bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="request-detail-title" className="text-lg font-bold text-slate-900">Chi tiết phiếu #{detailTarget.id}</h3>
                <p className="mt-1 text-sm text-slate-600">{detailTarget.status} | Cập nhật: {detailTarget.date || 'N/A'}</p>
              </div>
              <button type="button" onClick={() => setDetailTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Độc giả</dt><dd className="mt-1 font-semibold text-slate-800">{detailTarget.name} ({detailTarget.code})</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Tài liệu</dt><dd className="mt-1 font-semibold text-slate-800">{detailTarget.book} ({detailTarget.bookCode})</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Ngày yêu cầu</dt><dd className="mt-1 text-slate-700">{detailTarget.requested_at || 'N/A'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Hạn trả</dt><dd className="mt-1 text-slate-700">{detailTarget.due_date || 'N/A'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Ngày trả</dt><dd className="mt-1 text-slate-700">{detailTarget.return_date || 'N/A'}</dd></div>
              <div><dt className="text-xs font-bold uppercase tracking-widest text-slate-500">Ngày từ chối</dt><dd className="mt-1 text-slate-700">{detailTarget.rejected_at || 'N/A'}</dd></div>
            </dl>

            {detailTarget.rejection_reason ? (
              <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <span className="font-bold">Lý do từ chối: </span>{detailTarget.rejection_reason}
              </div>
            ) : null}

            {detailTarget.fine ? (
              <div className={`mt-5 rounded-lg border p-4 text-sm ${detailTarget.fine.status === 'paid' ? 'border-green-200 bg-green-50 text-green-800' : detailTarget.fine.status === 'waived' ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold">Khoản phạt:</span>
                    <span className="ml-2 text-base font-extrabold">{detailTarget.fine.amount.toLocaleString('vi-VN')} VND</span>
                    {detailTarget.fine.reason && <span className="ml-2 text-xs opacity-70">({detailTarget.fine.reason})</span>}
                  </div>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${detailTarget.fine.status === 'paid' ? 'bg-green-200 text-green-800' : detailTarget.fine.status === 'waived' ? 'bg-sky-200 text-sky-800' : 'bg-red-200 text-red-800'}`}>
                    {detailTarget.fine.status === 'paid' ? 'Đã đóng' : detailTarget.fine.status === 'waived' ? 'Đã miễn' : 'Chưa đóng'}
                  </span>
                </div>
                {detailTarget.fine.status === 'paid' && detailTarget.fine.paid_at && (
                  <p className="mt-2 text-xs text-green-600">Đã thanh toán vào lúc: {new Date(detailTarget.fine.paid_at).toLocaleString('vi-VN')}</p>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {detailTarget.fine && detailTarget.fine.status === 'unpaid' && (
                <button type="button" onClick={() => handlePayFine(detailTarget.fine!.fine_id)} disabled={activeRequestId === detailTarget.id}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60">
                  {activeRequestId === detailTarget.id ? 'Đang xử lý...' : 'Thu phí phạt'}
                </button>
              )}
              {detailTarget.raw_status === 'pending' ? (
                <>
                  <button onClick={() => { setDetailTarget(null); openRejectDialog(detailTarget); }}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Từ chối</button>
                  <button onClick={() => { setDetailTarget(null); handleApprove(detailTarget.id); }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90">Duyệt</button>
                </>
              ) : detailTarget.raw_status === 'approved' ? (
                <button onClick={() => { setDetailTarget(null); handleConfirmPickup(detailTarget.id); }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:opacity-90">Xác nhận giao sách</button>
              ) : detailTarget.raw_status === 'borrowed' ? (
                <>
                  <button onClick={() => openExtendDialog(detailTarget)}
                    className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50">Gia hạn</button>
                  <button onClick={() => openReturnDialog(detailTarget)}
                    className="rounded-lg bg-tertiary px-4 py-2 text-sm font-bold text-white hover:opacity-90">Nhận trả sách</button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* QR Scanner */}
      {showScanner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Quét mã QR Phiếu mượn</h3>
              <button onClick={() => setShowScanner(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="relative aspect-square w-full bg-black">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const scannedValue = result[0].rawValue.trim();
                    
                    // Case 1: Scanned value is a Book Barcode (e.g., SACH-00045)
                    if (scannedValue.toUpperCase().startsWith('SACH-')) {
                      const bookId = scannedValue.replace(/SACH-/i, '').replace(/^0+/, '');
                      
                      // Find active requests (approved or borrowed) for this book
                      const activeRequests = requests.filter(
                        (r) => r.bookCode === bookId && (r.raw_status === 'approved' || r.raw_status === 'borrowed')
                      );
                      
                      if (activeRequests.length === 1) {
                        const target = activeRequests[0];
                        setShowScanner(false);
                        if (target.raw_status === 'approved') {
                          setDetailTarget(target); // Opens detail modal with pickup button
                        } else if (target.raw_status === 'borrowed') {
                          openReturnDialog(target); // Opens return dialog directly
                        }
                        emitToast({
                          tone: 'success',
                          title: 'Đã nhận diện sách',
                          message: `Mã sách ${scannedValue}: "${target.book}"`,
                        });
                      } else if (activeRequests.length > 1) {
                        setShowScanner(false);
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('book', bookId);
                        setSearchParams(nextParams, { replace: true });
                        emitToast({
                          tone: 'info',
                          title: 'Nhiều yêu cầu hoạt động',
                          message: `Tìm thấy ${activeRequests.length} phiếu mượn/trả hoạt động cho sách này.`,
                        });
                      } else {
                        // Look for any history for this book
                        const anyRequests = requests.filter((r) => r.bookCode === bookId);
                        if (anyRequests.length > 0) {
                          setShowScanner(false);
                          const nextParams = new URLSearchParams(searchParams);
                          nextParams.set('book', bookId);
                          setSearchParams(nextParams, { replace: true });
                        }
                        emitToast({
                          tone: 'warning',
                          title: 'Không có phiếu mượn hoạt động',
                          message: `Không có sinh viên nào đang mượn hoặc chờ nhận cuốn sách này (Mã: ${scannedValue}).`,
                        });
                      }
                      return;
                    }

                    // Case 2: Standard behavior (scanned value is Borrowing ID)
                    const parsedId = parseInt(scannedValue, 10);
                    if (!isNaN(parsedId)) {
                      const found = requests.find((r) => r.id === parsedId);
                      if (found) { setShowScanner(false); setDetailTarget(found); }
                      else emitToast({ tone: 'error', title: 'Lỗi', message: 'Không tìm thấy phiếu mượn có ID: ' + scannedValue });
                    } else {
                      emitToast({ tone: 'error', title: 'Mã không hợp lệ', message: 'Mã quét không đúng định dạng phiếu mượn hoặc mã sách.' });
                    }
                  }
                }}
                components={{ finder: true }}
              />
            </div>
            <div className="bg-slate-50 p-4 text-center text-sm text-slate-500">Đưa mã QR của sinh viên hoặc mã vạch của sách (SACH-XXXXX) vào khung camera để tự động xử lý.</div>
          </div>
        </div>
      )}
    </div>
  );
}
