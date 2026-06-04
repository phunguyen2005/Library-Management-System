import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  getAdminFines,
  getFineStatistics,
  payFine,
  waiveFine,
  createFine,
  type AdminFineFilters,
  type FineEntry,
  type FineStatistics,
  type FineStatus,
} from '../../api/fineApi';
import { getAllMembers } from '../../api/userApi';
import { getAllRequests } from '../../api/borrowApi';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../auth/AuthContext';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

function formatCurrency(value: string | number) {
  return Number(value || 0).toLocaleString('vi-VN') + ' VND';
}

function statusConfig(status: FineStatus, t: any) {
  if (status === 'paid') {
    return { label: t('status.paid', 'Paid'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }

  if (status === 'waived') {
    return { label: t('status.waived', 'Waived'), className: 'border-sky-200 bg-sky-50 text-sky-700' };
  }

  if (status === 'cancelled') {
    return { label: t('status.cancelled', 'Cancelled'), className: 'border-slate-200 bg-slate-100 text-slate-600' };
  }

  return { label: t('status.unpaid', 'Unpaid'), className: 'border-red-200 bg-red-50 text-red-700' };
}

const emptyStats: FineStatistics = {
  total_collected: 0,
  total_unpaid: 0,
  total_waived: 0,
  this_month_collected: 0,
  by_month: [],
};

export default function AdminFines() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [fines, setFines] = useState<FineEntry[]>([]);
  const [stats, setStats] = useState<FineStatistics>(emptyStats);
  const [filters, setFilters] = useState<AdminFineFilters>({ status: '', query: '', member_id: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFineId, setActiveFineId] = useState<number | null>(null);
  const [payTarget, setPayTarget] = useState<FineEntry | null>(null);
  const [payNote, setPayNote] = useState('');
  const [waiveTarget, setWaiveTarget] = useState<FineEntry | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveError, setWaiveError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // States for manual fine creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [searchedMembers, setSearchedMembers] = useState<any[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [memberLoans, setMemberLoans] = useState<any[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);
  const [isSubmittingFine, setIsSubmittingFine] = useState(false);
  const [createFineError, setCreateFineError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    member_id: 0,
    loan_id: null as number | null,
    amount: 50000,
    reason: 'damaged' as 'overdue' | 'damaged' | 'lost',
    notes: '',
  });

  const handleSearchMembers = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchedMembers([]);
      return;
    }
    setIsSearchingMembers(true);
    try {
      const response = await getAllMembers(1, trimmed);
      setSearchedMembers(response.data);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsSearchingMembers(false);
    }
  };

  const handleSelectMember = async (member: any) => {
    setSelectedMember(member);
    setCreateForm((prev) => ({ ...prev, member_id: member.member_id, loan_id: null }));
    setSearchedMembers([]);
    setMemberSearchQuery('');
    setIsLoadingLoans(true);
    try {
      const loans = await getAllRequests({ member_id: member.member_id });
      setMemberLoans(loans);
    } catch (err: unknown) {
      console.error(err);
      emitToast({ tone: 'error', title: t('adminFines.loadHistoryErrorTitle', 'Error loading history'), message: t('adminFines.loadHistoryError', 'Could not load reader loan history.') });
    } finally {
      setIsLoadingLoans(false);
    }
  };

  const handleCreateFineSubmit = async () => {
    if (!selectedMember) {
      setCreateFineError(t('adminFines.selectMemberError', 'Please select a member.'));
      return;
    }
    if (createForm.amount < 1000) {
      setCreateFineError(t('adminFines.minFineAmountError', 'Minimum fine amount is 1,000 VND.'));
      return;
    }
    setIsSubmittingFine(true);
    setCreateFineError(null);
    try {
      await createFine({
        member_id: createForm.member_id,
        loan_id: createForm.loan_id,
        amount: createForm.amount,
        reason: createForm.reason,
        notes: createForm.notes.trim() || undefined,
      });
      emitToast({ tone: 'success', title: t('adminFines.createFineSuccessTitle', 'Fine Created'), message: t('adminFines.createFineSuccess', { name: selectedMember.name }) });
      setShowCreateModal(false);
      await loadData(false);
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t('adminFines.createFineError', 'Failed to create fine.'));
      setCreateFineError(msg);
    } finally {
      setIsSubmittingFine(false);
    }
  };

  const loadData = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      setLoadError(null);
      const [fineResponse, statistics] = await Promise.all([
        getAdminFines(filters),
        getFineStatistics(),
      ]);
      setFines(fineResponse.data);
      setStats(statistics);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminFines.loadError', 'Unable to load fines list.'));
      setLoadError(message);
      emitToast({ tone: 'error', title: t('adminFines.loadFinesErrorTitle', 'Unable to load fines'), message });
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const statCards = useMemo(
    () => [
      { label: t('adminFines.statsCollected', 'Total Collected'), value: stats.total_collected, className: 'border-emerald-100 bg-emerald-50 text-emerald-800' },
      { label: t('adminFines.statsUnpaid', 'Pending'), value: stats.total_unpaid, className: 'border-red-100 bg-red-50 text-red-800' },
      { label: t('adminFines.statsWaived', 'Waived'), value: stats.total_waived, className: 'border-sky-100 bg-sky-50 text-sky-800' },
      { label: t('adminFines.statsMonthCollected', 'This Month'), value: stats.this_month_collected, className: 'border-indigo-100 bg-indigo-50 text-indigo-800' },
    ],
    [stats, t],
  );

  const handleApplyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    void loadData();
  };

  const handlePaySubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!payTarget) {
      return;
    }

    setActiveFineId(payTarget.fine_id);

    try {
      await payFine(payTarget.fine_id, {
        method: 'cash',
        note: payNote.trim() || undefined,
      });
      emitToast({ tone: 'success', title: t('adminFines.payConfirmSuccessTitle', 'Fee Collected'), message: t('adminFines.payConfirmSuccess', 'Cash payment recorded successfully.') });
      setPayTarget(null);
      setPayNote('');
      await loadData(false);
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('adminFines.payConfirmError', 'Could not collect cash payment.'));
      emitToast({ tone: 'error', title: `${t('adminFines.btnConfirmCash')} ${t('common.error', 'Error')}`, message });
    } finally {
      setActiveFineId(null);
    }
  };

  const handleWaiveSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!waiveTarget) {
      return;
    }

    const reason = waiveReason.trim();

    if (reason.length < 10) {
      setWaiveError(t('adminFines.waiveReasonMinLengthError', 'Waiver reason must be at least 10 characters.'));
      return;
    }

    setActiveFineId(waiveTarget.fine_id);

    try {
      await waiveFine(waiveTarget.fine_id, reason);
      emitToast({ tone: 'success', title: t('adminFines.toastSuccess', 'Success'), message: t('adminFines.waiveSuccessMsg', 'Fine has been waived.') });
      setWaiveTarget(null);
      setWaiveReason('');
      setWaiveError(null);
      await loadData(false);
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('adminFines.waiveErrorMsg', 'Unable to waive fine.'));
      emitToast({ tone: 'error', title: `${t('adminFines.btnWaive')} ${t('common.error', 'Error')}`, message });
    } finally {
      setActiveFineId(null);
    }
  };

  const handleQrScan = (rawValue: string) => {
    let fineId: number | null = null;
    if (rawValue.startsWith('fine:')) {
      const match = rawValue.match(/fine:(\d+)/);
      if (match) {
        fineId = parseInt(match[1], 10);
      }
    } else {
      const parsed = parseInt(rawValue, 10);
      if (!isNaN(parsed)) {
        fineId = parsed;
      }
    }

    if (fineId) {
      const found = fines.find((f) => f.fine_id === fineId);
      if (found) {
        setShowScanner(false);
        if (found.status === 'unpaid') {
          setPayTarget(found);
          setPayNote(t('adminFines.payNoteQR', 'Quick cash payment via QR code scan.'));
          emitToast({
            tone: 'success',
            title: t('adminFines.fineFoundTitle', 'Fine Found'),
            message: t('adminFines.fineFoundMsg', { id: fineId, name: found.member?.name || t('common.user', 'member') }),
          });
        } else {
          emitToast({
            tone: 'info',
            title: t('adminFines.fineProcessedTitle', 'Processed Fine'),
            message: t('adminFines.fineProcessedMsg', { id: fineId, status: found.status === 'paid' ? t('adminFines.statusPaid', 'Paid') : t('adminFines.statusWaived', 'Waived') }),
          });
        }
      } else {
        setShowScanner(false);
        setFilters((current) => ({ ...current, query: String(fineId) }));
        emitToast({
          tone: 'info',
          title: t('adminFines.filteringTitle', 'Filtering search'),
          message: t('adminFines.filteringFineMsg', { id: fineId }),
        });
        setTimeout(() => {
          void loadData(false).then(() => {
            setTimeout(() => {
              setFines((latestFines) => {
                const updatedFound = latestFines.find((f) => f.fine_id === fineId);
                if (updatedFound && updatedFound.status === 'unpaid') {
                  setPayTarget(updatedFound);
                  setPayNote(t('adminFines.payNoteQR', 'Quick cash payment via QR code scan.'));
                }
                return latestFines;
              });
            }, 300);
          });
        }, 100);
      }
    } else {
      emitToast({
        tone: 'error',
        title: t('adminFines.invalidQrTitle', 'Invalid Code'),
        message: t('adminFines.invalidQrMsg', 'The QR code does not match the library fine format.'),
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{t('adminFines.title', 'Fine Management')}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('adminFines.subtitle', 'Track debts, collect payments at the counter and process waivers.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasPermission('manage_fines') && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              {t('adminFines.btnQrScan', 'Scan QR Payment')}
            </button>
          )}
          {hasPermission('manage_fines') && (
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setCreateFineError(null);
                setSelectedMember(null);
                setMemberLoans([]);
                setCreateForm({
                  member_id: 0,
                  loan_id: null,
                  amount: 50000,
                  reason: 'damaged',
                  notes: '',
                });
                setMemberSearchQuery('');
                setSearchedMembers([]);
              }}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              {t('adminFines.btnCreateManual', 'Create Fine')}
            </button>
          )}
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-5 ${card.className}`}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">{card.label}</p>
            <p className="mt-2 text-2xl font-extrabold">{formatCurrency(card.value)}</p>
          </div>
        ))}
      </section>

      <form
        onSubmit={handleApplyFilters}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-surface-container-low bg-surface-bright p-5 scholar-shadow md:grid-cols-[180px_160px_1fr_auto]"
      >
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('adminFines.filterStatus', 'Status')}</span>
          <select
            value={filters.status || ''}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as FineStatus | '' }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t('adminFines.filterAll', 'All')}</option>
            <option value="unpaid">{t('status.unpaid', 'Unpaid')}</option>
            <option value="paid">{t('status.paid', 'Paid')}</option>
            <option value="waived">{t('status.waived', 'Waived')}</option>
            <option value="cancelled">{t('status.cancelled', 'Cancelled')}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('adminFines.filterMember', 'Member ID')}</span>
          <input
            type="number"
            min={1}
            value={filters.member_id || ''}
            onChange={(event) => setFilters((current) => ({ ...current, member_id: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t('adminFines.filterMemberPlaceholder', 'Reader ID')}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('adminFines.filterQuery', 'Search')}</span>
          <input
            type="search"
            value={filters.query || ''}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder={t('adminFines.filterQueryPlaceholder', 'Name, book...')}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-5 text-sm font-bold text-white shadow-sm shadow-primary/20"
          >
            {t('common.filter', 'Filter')}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="border-b border-surface-container bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">{t('studentFines.idColumn', 'Fine ID')}</th>
                <th className="px-6 py-4">{t('adminFines.tableHeaderMember', 'Reader')}</th>
                <th className="px-6 py-4">{t('adminFines.tableHeaderBook', 'Book & Loan ID')}</th>
                <th className="px-6 py-4">{t('adminFines.tableHeaderDays', 'Days Late')}</th>
                <th className="px-6 py-4">{t('adminFines.tableHeaderAmount', 'Fine Amount')}</th>
                <th className="px-6 py-4">{t('adminFines.tableHeaderStatus', 'Status')}</th>
                <th className="px-6 py-4 text-right">{t('adminFines.tableHeaderActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    {t('adminFines.loading', 'Loading fines...')}
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <EmptyState icon="error" title={t('adminFines.loadFinesErrorTitle', 'Unable to load fines')} message={loadError} />
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <EmptyState icon="payments" title={t('adminFines.emptyTitle', 'No fines found')} message={t('adminFines.emptyDesc', 'No pending fine entries matched your criteria.')} />
                  </td>
                </tr>
              ) : (
                fines.map((fine) => {
                  const status = statusConfig(fine.status, t);
                  const isBusy = activeFineId === fine.fine_id;

                  return (
                    <tr key={fine.fine_id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <span className="rounded bg-slate-100 px-2 py-1 text-sm font-bold text-slate-700">
                          #{fine.fine_id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{fine.member?.name || t('common.notAvailable', 'N/A')}</p>
                        <p className="text-xs text-slate-500">ID: {fine.member?.member_id ?? fine.member_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{fine.book_title || t('adminFines.noLinkLoan', 'No linked loan')}</p>
                        {fine.due_date ? (
                          <p className="text-xs text-slate-500">{t('studentFines.dueDate', 'Due Date')}: {formatDisplayDate(fine.due_date)}</p>
                        ) : (
                          <p className="text-xs text-slate-400 italic">{t('adminFines.manualNoLoan', 'Manual Fine')}</p>
                        )}
                        {fine.notes && (
                          <p className="text-[11px] text-amber-800 bg-amber-50/50 border border-amber-200/50 rounded-lg px-2 py-0.5 mt-1.5 font-medium inline-block max-w-[280px] truncate" title={fine.notes}>
                            {fine.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{fine.days_overdue} {t('studentRequests.daysOverdueSuffix', 'days')}</td>
                      <td className="px-6 py-4 text-sm font-extrabold text-red-700">{formatCurrency(fine.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {fine.status === 'unpaid' ? (
                          <div className="flex justify-end gap-2">
                            {hasPermission('manage_fines') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setPayTarget(fine);
                                  setPayNote('');
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                              >
                                {t('adminFines.btnConfirmCash', 'Collect Cash')}
                              </button>
                            )}
                            {hasPermission('waive_fines') && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setWaiveTarget(fine);
                                  setWaiveReason('');
                                  setWaiveError(null);
                                }}
                                className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-60"
                              >
                                {t('adminFines.btnWaive', 'Waive')}
                              </button>
                            )}
                            {!hasPermission('manage_fines') && !hasPermission('waive_fines') && (
                              <span className="text-xs italic text-slate-400">{t('adminFines.noPermission', 'No permission')}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">{t('adminFines.statusProcessed', 'Processed')}</span>
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

      {payTarget ? (
        <div role="dialog" aria-modal="true" aria-labelledby="collect-fine-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handlePaySubmit} className="w-full max-w-md rounded-lg border border-surface-container bg-white p-6 shadow-xl">
            <h3 id="collect-fine-title" className="text-lg font-bold text-slate-900">
              {t('adminFines.btnConfirmCash')} #{payTarget.fine_id}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t('adminFines.confirmCashPay', { amount: formatCurrency(payTarget.amount), name: payTarget.member?.name || t('common.user', 'member') })}
            </p>
            <label className="mt-5 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('adminFines.payNoteLabel', 'Payment Note')}</span>
              <textarea
                aria-label={t('adminFines.payNoteLabel', 'Payment Note')}
                value={payNote}
                onChange={(event) => setPayNote(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t('adminFines.payNotePlaceholder', 'Optional note...')}
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPayTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">
                {t('adminFines.btnSubmitPay', 'Confirm Payment')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {waiveTarget ? (
        <div role="dialog" aria-modal="true" aria-labelledby="waive-fine-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handleWaiveSubmit} className="w-full max-w-md rounded-lg border border-surface-container bg-white p-6 shadow-xl">
            <h3 id="waive-fine-title" className="text-lg font-bold text-slate-900">
              {t('adminFines.btnWaive', 'Waive')} #{waiveTarget.fine_id}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t('adminFines.waiveModalDesc', { amount: formatCurrency(waiveTarget.amount), name: waiveTarget.member?.name || t('common.user', 'member') })}
            </p>
            <label className="mt-5 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('adminFines.waiveReasonLabel', 'Waiver Reason')}</span>
              <textarea
                aria-label={t('adminFines.waiveReasonLabel', 'Waiver Reason')}
                value={waiveReason}
                onChange={(event) => {
                  setWaiveReason(event.target.value);
                  setWaiveError(null);
                }}
                rows={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t('adminFines.waiveReasonPlaceholder', 'Reason for waiver...')}
              />
            </label>
            {waiveError ? <p className="mt-2 text-sm text-red-600">{waiveError}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setWaiveTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700">
                {t('adminFines.btnSubmitWaive', 'Confirm Waiver')}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* QR Scanner */}
      {showScanner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm select-none">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">{t('adminFines.scanQrTitle')}</h3>
              <button onClick={() => setShowScanner(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="relative aspect-square w-full bg-black">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    handleQrScan(result[0].rawValue);
                  }
                }}
                components={{ finder: true }}
              />
            </div>
            <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 leading-normal">
              {t('adminFines.scanQrDesc')}
            </div>
          </div>
        </div>
      )}

      {/* Manual Fine Creation Modal */}
      {showCreateModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="create-fine-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-surface-container bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 id="create-fine-title" className="text-lg font-black text-slate-900">
                {t('adminFines.btnCreateManualTitle')}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {createFineError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
                {createFineError}
              </div>
            )}

            <div className="space-y-4">
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  {t('common.student', 'Student')}
                </label>
                {!selectedMember ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => {
                        setMemberSearchQuery(e.target.value);
                        void handleSearchMembers(e.target.value);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder={t('adminFines.searchPlaceholder')}
                    />
                    {isSearchingMembers && (
                      <div className="absolute right-3 top-3">
                        <span className="animate-spin block h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></span>
                      </div>
                    )}
                    {searchedMembers.length > 0 && (
                      <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-lg divide-y divide-slate-100">
                        {searchedMembers.map((member) => (
                          <li key={member.member_id}>
                            <button
                              type="button"
                              onClick={() => handleSelectMember(member)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs transition-colors"
                            >
                              <p className="font-bold text-slate-800">{member.name}</p>
                              <p className="text-slate-500">{t('adminFines.memberDetailsLabel', { memberId: member.member_id, email: member.email })}</p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{selectedMember.name}</p>
                      <p className="text-xs text-slate-500">{t('adminFines.memberDetailsLabel', { memberId: selectedMember.member_id, email: selectedMember.email })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMember(null);
                        setMemberLoans([]);
                        setCreateForm(prev => ({ ...prev, member_id: 0, loan_id: null }));
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
                    >
                      {t('common.change')}
                    </button>
                  </div>
                )}
              </div>

              {/* Borrowing / Book Association */}
              {selectedMember && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {t('adminFines.linkBorrowLabel')}
                  </label>
                  {isLoadingLoans ? (
                    <p className="text-xs text-slate-500 animate-pulse">{t('adminFines.loadingHistoryLabel')}</p>
                  ) : memberLoans.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">{t('adminFines.noHistoryLabel')}</p>
                  ) : (
                    <select
                      value={createForm.loan_id || ''}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, loan_id: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">{t('adminFines.noLinkLoan')}</option>
                      {memberLoans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.book} (#{loan.id} — {t('adminRoomBookings.filterStatus', 'Status')}: {t(`status.${loan.status}`, loan.status)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {t('adminFines.fineReasonLabel')}
                  </label>
                  <select
                    value={createForm.reason}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, reason: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="damaged">{t('adminFines.reasonDamaged')}</option>
                    <option value="lost">{t('adminFines.reasonLost')}</option>
                    <option value="overdue">{t('adminRequests.dueOverdue')}</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {t('adminFines.tableHeaderAmount')} (VND)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={createForm.amount}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                  {t('adminFines.noteLabel')}
                </label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder={t('adminFines.notePlaceholder')}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={isSubmittingFine || !selectedMember}
                onClick={handleCreateFineSubmit}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm shadow-md cursor-pointer"
              >
                {isSubmittingFine && (
                  <span className="animate-spin block h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                )}
                {t('adminFines.btnCreateConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
