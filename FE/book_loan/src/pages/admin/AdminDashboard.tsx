import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { deleteBook, fetchBooks } from '../../api/bookApi';
import { API_BASE_URL } from '../../api/client';
import {
  approveBorrow,
  getAllRequests,
  rejectBorrow,
  returnBook,
  type BorrowRequest,
} from '../../api/borrowApi';
import { getAllMembers } from '../../api/userApi';
import { fetchHealthStatus, type HealthStatus } from '../../api/healthApi';
import EmptyState from '../../components/EmptyState';
import { applyImageFallback } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { FormattedBook } from '../../types/book';

type DashboardInventoryBook = {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  location: string;
  status: string;
  statusColor: string;
  cover: string;
  isDigital: boolean;
  quantity: number;
  availableQuantity: number;
};

type DashboardStats = {
  requests: number;
  overdue: number;
  books: number;
  members: number;
};

type QuickActionForm = {
  memberId: string;
  bookId: string;
};

type QuickActionFeedback = {
  tone: 'success' | 'error' | 'neutral';
  message: string;
};

const INITIAL_STATS: DashboardStats = {
  requests: 0,
  overdue: 0,
  books: 0,
  members: 0,
};

const INVENTORY_PAGE_SIZE = 5;

function normalizeIdentifier(value: string | number | null | undefined) {
  return String(value ?? '').trim();
}

function isMatchingIdentifier(input: string, candidate: string | number | null | undefined) {
  const normalizedInput = normalizeIdentifier(input);
  const normalizedCandidate = normalizeIdentifier(candidate);

  if (!normalizedInput || !normalizedCandidate) {
    return false;
  }

  return normalizedInput === normalizedCandidate;
}

function mapInventoryBook(book: FormattedBook): DashboardInventoryBook {
  return {
    id: Number(book.id ?? book.book_id),
    title: book.title,
    author: book.author,
    isbn: book.isbn || `ISBN-${book.id ?? book.book_id}000`,
    category: book.category || book.genre || 'other',
    location: book.location || 'Khu A',
    status: book.is_available ? 'available' : 'borrowed',
    statusColor: book.is_available ? 'bg-green-500' : 'bg-tertiary',
    cover: book.cover,
    isDigital: book.is_digital,
    quantity: book.quantity,
    availableQuantity: book.available_quantity,
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState<BorrowRequest[]>([]);
  const [recentReturns, setRecentReturns] = useState<BorrowRequest[]>([]);
  const [inventoryBooks, setInventoryBooks] = useState<DashboardInventoryBook[]>([]);
  const [allRequests, setAllRequests] = useState<BorrowRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [quickForm, setQuickForm] = useState<QuickActionForm>({ memberId: '', bookId: '' });
  const [quickFeedback, setQuickFeedback] = useState<QuickActionFeedback | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'borrow' | 'return' | null>(null);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'paper' | 'digital' | 'reference'>('all');
  const [inventorySort, setInventorySort] = useState<'newest' | 'title' | 'quantity'>('newest');
  const [inventoryPage, setInventoryPage] = useState(1);

  const loadDashboard = async () => {
    try {
      setLoadError(null);
      const [books, requests, members, healthStatus] = await Promise.all([
        fetchBooks(),
        getAllRequests(),
        getAllMembers(),
        fetchHealthStatus().catch(() => null),
      ]);

      setAllRequests(requests);
      setHealth(healthStatus);
      setInventoryBooks(books.data.map(mapInventoryBook));

      const pending = requests.filter((request) => request.raw_status === 'pending');
      const returned = requests.filter((request) => request.raw_status === 'returned');
      const overdue = requests.filter((request) => {
        if (request.raw_status !== 'borrowed') {
          return false;
        }

        if (typeof request.is_overdue === 'boolean') {
          return request.is_overdue;
        }

        return Boolean(request.due_date) && new Date(request.due_date as string) < new Date();
      }).length;

      setPendingRequests(pending.slice(0, 5));
      setRecentReturns(returned.slice(0, 5));
      setStats({
        requests: pending.length,
        overdue,
        books: books.meta?.total ?? books.data.length,
        members: members.meta?.total ?? members.data.length,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminDashboard.loadError', 'Unable to load dashboard data.'));
      setLoadError(message);
      emitToast({ tone: 'error', title: t('adminDashboard.loadErrorTitle', 'Unable to load dashboard'), message });
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const filteredInventoryBooks = useMemo(() => {
    const filtered = inventoryBooks.filter((book) => {
      if (inventoryFilter === 'paper') {
        return !book.isDigital;
      }

      if (inventoryFilter === 'digital') {
        return book.isDigital;
      }

      if (inventoryFilter === 'reference') {
        return book.category.toLowerCase().includes('tham') || book.category.toLowerCase().includes('reference');
      }

      return true;
    });

    return [...filtered].sort((first, second) => {
      if (inventorySort === 'title') {
        return first.title.localeCompare(second.title, 'vi');
      }

      if (inventorySort === 'quantity') {
        return second.quantity - first.quantity;
      }

      return second.id - first.id;
    });
  }, [inventoryBooks, inventoryFilter, inventorySort]);

  const inventoryTotalPages = Math.max(
    1,
    Math.ceil(filteredInventoryBooks.length / INVENTORY_PAGE_SIZE),
  );
  const visibleInventoryBooks = filteredInventoryBooks.slice(
    (inventoryPage - 1) * INVENTORY_PAGE_SIZE,
    inventoryPage * INVENTORY_PAGE_SIZE,
  );
  const inventoryStartItem =
    filteredInventoryBooks.length === 0 ? 0 : (inventoryPage - 1) * INVENTORY_PAGE_SIZE + 1;
  const inventoryEndItem = Math.min(
    filteredInventoryBooks.length,
    inventoryPage * INVENTORY_PAGE_SIZE,
  );

  useEffect(() => {
    setInventoryPage((currentPage) => Math.min(currentPage, inventoryTotalPages));
  }, [inventoryTotalPages]);

  const quickActionHint = useMemo(() => {
    if (!quickForm.memberId && !quickForm.bookId) {
      return t('adminDashboard.quickAction.hintEmpty');
    }

    if (!quickForm.memberId || !quickForm.bookId) {
      return t('adminDashboard.quickAction.hintMissing');
    }

    return t('adminDashboard.quickAction.hintReady', { memberId: quickForm.memberId, bookId: quickForm.bookId });
  }, [quickForm.bookId, quickForm.memberId, t]);

  const findRequestByStatus = (status: BorrowRequest['raw_status']) => {
    return allRequests.find(
      (request) =>
        request.raw_status === status &&
        isMatchingIdentifier(quickForm.memberId, request.code) &&
        isMatchingIdentifier(quickForm.bookId, request.bookCode),
    );
  };

  const handleQuickBorrow = async () => {
    if (!quickForm.memberId || !quickForm.bookId) {
      setQuickFeedback({
        tone: 'error',
        message: t('adminDashboard.quickAction.errorEmpty'),
      });
      return;
    }

    const targetRequest = findRequestByStatus('pending');
    if (!targetRequest) {
      setQuickFeedback({
        tone: 'error',
        message: t('adminDashboard.quickAction.errorPendingNotFound'),
      });
      return;
    }

    setLoadingAction('borrow');
    setQuickFeedback(null);

    try {
      await approveBorrow(targetRequest.id);
      setQuickFeedback({
        tone: 'success',
        message: t('adminDashboard.quickAction.successBorrow', { memberId: quickForm.memberId, bookId: quickForm.bookId }),
      });
      emitToast({
        tone: 'success',
        title: t('adminDashboard.quickAction.borrowBtn'),
        message: t('adminDashboard.quickAction.successBorrow', { memberId: quickForm.memberId, bookId: quickForm.bookId }),
      });
      await loadDashboard();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminDashboard.quickAction.errorBorrowNow', 'Unable to loan book at this time.'));
      setQuickFeedback({
        tone: 'error',
        message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleQuickReturn = async () => {
    if (!quickForm.memberId || !quickForm.bookId) {
      setQuickFeedback({
        tone: 'error',
        message: t('adminDashboard.quickAction.errorEmpty'),
      });
      return;
    }

    const targetRequest = findRequestByStatus('borrowed');
    if (!targetRequest) {
      setQuickFeedback({
        tone: 'error',
        message: t('adminDashboard.quickAction.errorBorrowedNotFound'),
      });
      return;
    }

    setLoadingAction('return');
    setQuickFeedback(null);

    try {
      await returnBook(targetRequest.id);
      setQuickFeedback({
        tone: 'success',
        message: t('adminDashboard.quickAction.successReturn', { memberId: quickForm.memberId, bookId: quickForm.bookId }),
      });
      emitToast({
        tone: 'success',
        title: t('adminDashboard.quickAction.returnBtn'),
        message: t('adminDashboard.quickAction.successReturn', { memberId: quickForm.memberId, bookId: quickForm.bookId }),
      });
      await loadDashboard();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminDashboard.quickAction.errorReturnNow', 'Unable to return book at this time.'));
      setQuickFeedback({
        tone: 'error',
        message,
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePendingApprove = async (loanId: number) => {
    try {
      await approveBorrow(loanId);
      emitToast({ tone: 'success', title: t('adminDashboard.pendingApprovals.approveBtn'), message: t('events.borrow_request_approved', { book_title: `#${loanId}` }) });
      await loadDashboard();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminDashboard.pendingApprovals.errorApprove', 'Unable to approve request at this time.'));
      emitToast({ tone: 'error', title: t('common.error'), message });
    }
  };

  const handlePendingReject = async (loanId: number) => {
    if (!confirm(t('adminRequests.rejectModalTitle', { id: loanId }))) {
      return;
    }

    try {
      await rejectBorrow(loanId, t('adminDashboard.quickAction.quickRejectionReason', 'Quick rejection from dashboard.'));
      emitToast({
        tone: 'success',
        title: t('status.rejected'),
        message: t('adminRequests.rejectionReasonLabel', { reason: `#${loanId}` }),
      });
      await loadDashboard();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminDashboard.pendingApprovals.errorReject', 'Unable to reject request at this time.'));
      emitToast({ tone: 'error', title: t('common.error'), message });
    }
  };

  const handleInventoryDelete = async (book: DashboardInventoryBook) => {
    if (!confirm(t('adminDashboard.inventoryManage.confirmDelete', { title: book.title }))) {
      return;
    }

    try {
      await deleteBook(book.id);
      emitToast({
        tone: 'success',
        title: t('adminDashboard.inventoryManage.deleteSuccess', { title: book.title }),
        message: t('adminDashboard.inventoryManage.deleteSuccess', { title: book.title }),
      });
      await loadDashboard();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminDashboard.inventoryManage.errorDelete', 'Unable to delete book at this time.'));
      emitToast({ tone: 'error', title: t('common.error'), message });
    }
  };

  const handleExportInventory = () => {
    if (filteredInventoryBooks.length === 0) {
      emitToast({
        tone: 'info',
        title: t('adminRequests.emptyStateTitle'),
        message: t('adminDashboard.inventoryManage.noBooksFiltered'),
      });
      return;
    }

    const rows = [
      ['Book ID', 'Title', 'Author', 'Category', 'Location', 'Total', 'Available', 'Status'],
      ...filteredInventoryBooks.map((book) => [
        String(book.id),
        book.title,
        book.author,
        book.category === 'other' ? t('common.other', 'Other') : book.category,
        book.location,
        String(book.quantity),
        String(book.availableQuantity),
        book.availableQuantity > 0 ? t('status.available') : t('status.borrowed'),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'inventory-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const healthIsOk = health?.status === 'ok';
  const apiDocsUrl = `${API_BASE_URL}/docs`;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {loadError ? (
        <EmptyState icon="error" title={t('studentHome.loadError')} message={loadError} />
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
        <div className="bg-surface-bright p-6 rounded-xl scholar-shadow border border-surface-container-low">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <p className="text-outline text-xs font-bold uppercase tracking-wider">{t('adminDashboard.quickStats.newRequests')}</p>
          <h3 className="text-3xl font-bold mt-1">{stats.requests}</h3>
        </div>
        <div className="bg-surface-bright p-6 rounded-xl scholar-shadow border border-surface-container-low">
          <div className="w-12 h-12 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">event_busy</span>
          </div>
          <p className="text-outline text-xs font-bold uppercase tracking-wider">{t('adminDashboard.quickStats.overdue')}</p>
          <h3 className="text-3xl font-bold mt-1">{stats.overdue}</h3>
        </div>
        <div className="bg-surface-bright p-6 rounded-xl scholar-shadow border border-surface-container-low">
          <div className="w-12 h-12 rounded-lg bg-green-100 text-green-700 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">inventory</span>
          </div>
          <p className="text-outline text-xs font-bold uppercase tracking-wider">{t('adminDashboard.quickStats.totalBooks')}</p>
          <h3 className="text-3xl font-bold mt-1">{stats.books.toLocaleString('vi-VN')}</h3>
        </div>
        <div className="bg-surface-bright p-6 rounded-xl scholar-shadow border border-surface-container-low">
          <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined">person_search</span>
          </div>
          <p className="text-outline text-xs font-bold uppercase tracking-wider">{t('adminDashboard.quickStats.members')}</p>
          <h3 className="text-3xl font-bold mt-1">{stats.members.toLocaleString('vi-VN')}</h3>
        </div>
        <button
          type="button"
          onClick={() => window.open(apiDocsUrl, '_blank', 'noopener,noreferrer')}
          className="bg-surface-bright p-6 rounded-xl scholar-shadow border border-surface-container-low text-left transition-transform hover:-translate-y-1"
        >
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
              healthIsOk ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <span className="material-symbols-outlined">
              {healthIsOk ? 'monitor_heart' : 'warning'}
            </span>
          </div>
          <p className="text-outline text-xs font-bold uppercase tracking-wider">{t('adminDashboard.quickStats.systemHealth')}</p>
          <h3 className="text-3xl font-bold mt-1">{health ? (healthIsOk ? 'OK' : 'DEG') : '...'}</h3>
          <p className="mt-1 text-[10px] font-medium text-outline">{t('adminDashboard.quickStats.apiDocs')}</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <section className="bg-surface-bright p-8 rounded-xl scholar-shadow border border-surface-container-low relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-16 translate-x-16"></div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary filled">bolt</span>
              {t('adminDashboard.quickAction.title')}
            </h3>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div>
                <label className="block text-xs font-bold text-outline mb-1 uppercase tracking-wider">
                  {t('adminDashboard.quickAction.memberId')}
                </label>
                <input
                  type="text"
                  value={quickForm.memberId}
                  onChange={(event) =>
                    setQuickForm((current) => ({ ...current, memberId: event.target.value }))
                  }
                  placeholder={t('adminDashboard.quickAction.placeholderMemberId', { defaultValue: 'e.g. 1' })}
                  className="w-full bg-surface-container border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-outline mb-1 uppercase tracking-wider">
                  {t('adminDashboard.quickAction.bookId')}
                </label>
                <input
                  type="text"
                  value={quickForm.bookId}
                  onChange={(event) =>
                    setQuickForm((current) => ({ ...current, bookId: event.target.value }))
                  }
                  placeholder={t('adminDashboard.quickAction.placeholderBookId', { defaultValue: 'e.g. 101' })}
                  className="w-full bg-surface-container border-none rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
              <div className="rounded-lg bg-surface-container-low px-4 py-3 text-xs text-on-surface-variant">
                {quickFeedback ? (
                  <span
                    className={
                      quickFeedback.tone === 'success'
                        ? 'text-green-700 font-semibold'
                        : quickFeedback.tone === 'error'
                          ? 'text-error font-semibold'
                          : 'text-on-surface-variant'
                    }
                  >
                    {quickFeedback.message}
                  </span>
                ) : (
                  quickActionHint
                )}
              </div>
              <div className="pt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleQuickBorrow}
                  disabled={loadingAction !== null}
                  className="bg-primary text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-wait"
                >
                  <span className="material-symbols-outlined text-sm">output</span>
                  {loadingAction === 'borrow' ? t('adminDashboard.quickAction.processing') : t('adminDashboard.quickAction.borrowBtn')}
                </button>
                <button
                  type="button"
                  onClick={handleQuickReturn}
                  disabled={loadingAction !== null}
                  className="bg-primary-container text-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-200 transition-all disabled:opacity-60 disabled:cursor-wait"
                >
                  <span className="material-symbols-outlined text-sm">input</span>
                  {loadingAction === 'return' ? t('adminDashboard.quickAction.processing') : t('adminDashboard.quickAction.returnBtn')}
                </button>
              </div>
            </form>
          </section>
        </div>

        <div className="lg:col-span-2">
          <section className="bg-surface-bright rounded-xl scholar-shadow border border-surface-container-low overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-surface-container flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface">{t('adminDashboard.pendingApprovals.title')}</h3>
                <p className="text-xs text-outline mt-1">
                  {t('adminDashboard.pendingApprovals.subtitle')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/requests')}
                className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                <span className="material-symbols-outlined text-base">filter_list</span>
                {t('adminDashboard.pendingApprovals.filter')}
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold uppercase tracking-widest text-outline">
                    <th className="px-6 py-4">{t('adminDashboard.pendingApprovals.headerMember')}</th>
                    <th className="px-6 py-4">{t('adminDashboard.pendingApprovals.headerBook')}</th>
                    <th className="px-6 py-4">{t('adminDashboard.pendingApprovals.headerDate')}</th>
                    <th className="px-6 py-4 text-right">{t('adminDashboard.pendingApprovals.headerActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8">
                        <EmptyState
                          icon="assignment_turned_in"
                          title={t('adminDashboard.pendingApprovals.noPending')}
                          message={t('adminDashboard.pendingApprovals.noPendingDesc')}
                        />
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-surface-container/50 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${request.roleColor}`}>
                            {request.role === 'Student' ? t('common.student') : request.role === 'Librarian' ? t('common.librarian') : request.role}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-on-surface">{request.name}</p>
                            <p className="text-[10px] text-outline">{t('common.studentId')}: {request.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-on-surface">{request.book}</p>
                            <p className="text-[10px] text-outline">{t('common.bookCode')}: {request.bookCode}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">{request.date}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePendingApprove(request.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:opacity-90"
                          >
                            {t('adminDashboard.pendingApprovals.approveBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePendingReject(request.id)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low flex items-center justify-center border-t border-surface-container mt-auto">
              <button
                type="button"
                onClick={() => navigate('/admin/requests')}
                className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
              >
                {t('adminDashboard.pendingApprovals.viewAllBtn')}
              </button>
            </div>
          </section>
        </div>
      </div>

      <section className="bg-surface-bright rounded-2xl scholar-shadow border border-surface-container-low overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container">
          <div>
            <h3 className="text-2xl font-bold text-on-surface">{t('adminDashboard.inventoryManage.title')}</h3>
            <p className="text-on-surface-variant text-sm mt-1">
              {t('adminDashboard.inventoryManage.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/inventory')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 scholar-shadow hover:-translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined">add</span>
              {t('adminDashboard.inventoryManage.addBtn')}
            </button>
            <button
              type="button"
              onClick={handleExportInventory}
              className="p-3 bg-surface-container text-on-surface-variant rounded-xl hover:bg-surface-container-high transition-all"
              title={t('adminDashboard.inventoryManage.exportTooltip') || 'Export'}
            >
              <span className="material-symbols-outlined">file_download</span>
            </button>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { label: t('adminDashboard.inventoryManage.filterAll'), value: 'all' },
                { label: t('adminDashboard.inventoryManage.filterPaper'), value: 'paper' },
                { label: t('adminDashboard.inventoryManage.filterDigital'), value: 'digital' },
                { label: t('adminDashboard.inventoryManage.filterReference'), value: 'reference' },
              ].map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setInventoryFilter(filter.value as typeof inventoryFilter);
                    setInventoryPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                    inventoryFilter === filter.value
                      ? 'bg-primary text-white'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-outline">{t('adminDashboard.inventoryManage.sortBy')}:</span>
              <select
                aria-label={t('adminDashboard.inventoryManage.sortBy') || 'Sort'}
                value={inventorySort}
                onChange={(event) => {
                  setInventorySort(event.target.value as typeof inventorySort);
                  setInventoryPage(1);
                }}
                className="text-xs font-medium border-none bg-transparent focus:ring-0 cursor-pointer outline-none"
              >
                <option value="newest">{t('adminDashboard.inventoryManage.sortNewest')}</option>
                <option value="title">{t('adminDashboard.inventoryManage.sortTitle')}</option>
                <option value="quantity">{t('adminDashboard.inventoryManage.sortQuantity')}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-surface-container">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <th className="px-6 py-4">{t('adminDashboard.inventoryManage.tableCover')}</th>
                  <th className="px-6 py-4">{t('adminDashboard.inventoryManage.tableInfo')}</th>
                  <th className="px-6 py-4">{t('adminDashboard.inventoryManage.tableCategory')}</th>
                  <th className="px-6 py-4">{t('adminDashboard.inventoryManage.tableLocation')}</th>
                  <th className="px-6 py-4">{t('adminDashboard.inventoryManage.tableStatus')}</th>
                  <th className="px-6 py-4 text-right">{t('adminDashboard.inventoryManage.tableManage')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {visibleInventoryBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-outline">
                      {t('adminDashboard.inventoryManage.noBooksFiltered')}
                    </td>
                  </tr>
                ) : (
                  visibleInventoryBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-surface-container/30 transition-all">
                      <td className="px-6 py-4">
                        <div className="w-12 h-16 rounded-lg bg-surface-container-high overflow-hidden border border-surface-container">
                          <img
                            src={book.cover}
                            alt={book.title}
                            onError={(event) => applyImageFallback(event.currentTarget)}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm font-bold text-on-surface line-clamp-1">{book.title}</p>
                          <p className="text-xs text-outline mt-0.5">{t('studentHome.author')}: {book.author}</p>
                          <p className="text-[10px] font-mono text-primary mt-1">ISBN: {book.isbn}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase">
                          {book.category === 'other' ? t('common.other', 'Other') : book.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">{book.location}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${book.statusColor}`}></div>
                          <span className="text-xs font-medium">
                            {book.availableQuantity > 0 ? t('status.available') : t('status.borrowed')}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-outline">
                          {t('adminDashboard.inventoryManage.copiesAvailable', { available: book.availableQuantity, total: book.quantity })}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/inventory?search=${encodeURIComponent(book.title)}`)}
                            className="p-2 rounded-lg text-primary hover:bg-primary-container transition-all"
                            title={t('adminDashboard.inventoryManage.editTooltip') || 'Open'}
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/requests?book=${book.id}`)}
                            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all"
                            title={t('adminDashboard.inventoryManage.historyTooltip') || 'History'}
                          >
                            <span className="material-symbols-outlined text-lg">history</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInventoryDelete(book)}
                            className="p-2 rounded-lg text-tertiary hover:bg-tertiary-container transition-all"
                            title={t('adminDashboard.inventoryManage.deleteTooltip') || 'Delete'}
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-outline">
              {t('common.paginationRange', { start: inventoryStartItem, end: inventoryEndItem, total: filteredInventoryBooks.length })}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setInventoryPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={inventoryPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-surface-container hover:bg-surface-container transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: inventoryTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setInventoryPage(pageNumber)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    inventoryPage === pageNumber
                      ? 'bg-primary text-white'
                      : 'border border-surface-container hover:bg-surface-container transition-all'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setInventoryPage((currentPage) => Math.min(inventoryTotalPages, currentPage + 1))}
                disabled={inventoryPage === inventoryTotalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-surface-container hover:bg-surface-container transition-all disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-bright rounded-2xl scholar-shadow border border-surface-container-low overflow-hidden">
        <div className="p-6 border-b border-surface-container flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary">published_with_changes</span>
          <h3 className="text-lg font-bold text-on-surface">{t('adminDashboard.recentReturns.title')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-surface-container">
              {recentReturns.length === 0 ? (
                <tr>
                  <td className="px-8 py-6 text-sm text-on-surface-variant">
                    {t('adminDashboard.recentReturns.empty')}
                  </td>
                </tr>
              ) : (
                recentReturns.map((request) => (
                  <tr key={request.id} className="group">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-green-500 bg-green-50 p-2 rounded-full">
                          check_circle
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {t('adminDashboard.recentReturns.returnedMsg', { name: request.name, book: request.book })}
                          </p>
                          <p className="text-[10px] text-outline mt-0.5">
                            {t('adminDashboard.recentReturns.completedAt', { date: request.return_date || request.date })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate('/admin/requests')}
                        className="px-4 py-2 bg-surface-container text-on-surface text-xs font-bold rounded-lg hover:bg-surface-container-high transition-all"
                      >
                        {t('adminRequests.details')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-auto border-t border-surface-container py-6 flex flex-col md:flex-row items-center justify-between text-[10px] font-bold text-outline uppercase tracking-widest">
        <p>{t('adminDashboard.footer.copyright')}</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <button type="button" onClick={() => navigate('/admin/reports')} className="hover:text-primary transition-colors">
            {t('adminDashboard.footer.userGuide')}
          </button>
          <a href="mailto:it-support@hcmue.edu.vn?subject=Library%20system%20incident" className="hover:text-primary transition-colors">
            {t('adminDashboard.footer.reportIncident')}
          </a>
          <button type="button" onClick={() => navigate('/admin/settings')} className="hover:text-primary transition-colors">
            {t('adminDashboard.footer.privacyPolicy')}
          </button>
        </div>
      </footer>
    </div>
  );
}
