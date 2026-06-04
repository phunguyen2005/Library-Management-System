import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { getMyFines, applyFineWaiver, initiateMomoPayment, initiateVnpayPayment, getMomoPaymentStatus, simulateMomoPayment, simulateVnpayPayment, type FineEntry, type FineStatus } from '../../api/fineApi';
import { fetchGamifyProfile, type MemberRewardRecord } from '../../api/gamifyApi';
import { apiRequest } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { formatDisplayDate, formatDisplayCurrency } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';


function statusConfig(status: FineStatus, t: any) {
  if (status === 'paid') {
    return { label: t('studentFines.statusPaid'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }

  if (status === 'waived') {
    return { label: t('studentFines.statusWaived'), className: 'border-sky-200 bg-sky-50 text-sky-700' };
  }

  if (status === 'cancelled') {
    return { label: t('studentFines.statusCancelled'), className: 'border-slate-200 bg-slate-100 text-slate-600' };
  }

  return { label: t('studentFines.statusUnpaid'), className: 'border-red-200 bg-red-50 text-red-700' };
}

export default function StudentFines() {
  const { t } = useTranslation();
  const [fines, setFines] = useState<FineEntry[]>([]);
  const [activeTickets, setActiveTickets] = useState<MemberRewardRecord[]>([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideFine, setGuideFine] = useState<FineEntry | null>(null);

  const [isMomoLoading, setIsMomoLoading] = useState(false);
  const [isVnpayLoading, setIsVnpayLoading] = useState(false);
  const [isWaiverLoading, setIsWaiverLoading] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  const fetchFines = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([getMyFines(), fetchGamifyProfile()])
      .then(([finesResponse, profileResponse]) => {
        setFines(finesResponse.fines);
        setTotalUnpaid(finesResponse.total_unpaid);
        setActiveTickets(profileResponse.active_tickets);
      })
      .catch((loadError: unknown) => {
        const message = getErrorMessage(loadError, t('studentFines.loadError'));
        setError(message);
        emitToast({ tone: 'error', title: t('studentFines.toastErrorLoad'), message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [t]);

  useEffect(() => {
    fetchFines();
  }, [fetchFines]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 1. Kiểm tra tham số VNPay
    const vnpResponseCode = params.get('vnp_ResponseCode');
    const vnpSecureHash = params.get('vnp_SecureHash');
    const vnpTxnRef = params.get('vnp_TxnRef');

    if (vnpResponseCode && vnpSecureHash && vnpTxnRef) {
      const queryString = window.location.search;
      
      // Xóa các tham số query trên URL ngay lập tức để tránh lặp lại hành động khi reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      emitToast({
        tone: 'info',
        title: t('studentFines.toastVerifyingVnpay'),
        message: t('studentFines.toastVerifyingVnpayMsg'),
      });

      apiRequest<{ RspCode: string; Message: string }>(`/vnpay/ipn${queryString}`, {
        method: 'GET',
        auth: true,
      })
        .then((res) => {
          if (res.RspCode === '00' || res.RspCode === '02') {
            emitToast({
              tone: 'success',
              title: t('studentFines.toastPaySuccess'),
              message: t('studentFines.toastPaySuccessMsg'),
            });
            fetchFines();
          } else {
            emitToast({
              tone: 'error',
              title: t('studentFines.toastPayFailed'),
              message: t('studentFines.toastPayFailedMsg'),
            });
          }
        })
        .catch((err: unknown) => {
          console.error('Lỗi xác minh VNPay:', err);
          emitToast({
            tone: 'error',
            title: t('studentFines.toastVerifyError'),
            message: t('studentFines.toastVerifyErrorMsg'),
          });
        });
    }

    // 2. Kiểm tra tham số MoMo
    const momoOrderId = params.get('orderId');
    const momoSignature = params.get('signature');
    const momoResultCode = params.get('resultCode');

    if (momoOrderId && momoSignature && momoResultCode) {
      // Xóa các tham số query trên URL ngay lập tức
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      emitToast({
        tone: 'info',
        title: t('studentFines.toastVerifyingMomo'),
        message: t('studentFines.toastVerifyingMomoMsg'),
      });

      const payload: Record<string, string | number | null> = {};
      params.forEach((value, key) => {
        if (key === 'amount' || key === 'resultCode') {
          payload[key] = Number(value);
        } else {
          payload[key] = value;
        }
      });

      apiRequest<{ partnerCode: string; orderId: string }>(`/momo/ipn`, {
        method: 'POST',
        body: payload,
        auth: true,
      })
        .then(() => {
          if (Number(momoResultCode) === 0) {
            emitToast({
              tone: 'success',
              title: t('studentFines.toastPaySuccess'),
              message: t('studentFines.toastPaySuccessMsg'),
            });
            fetchFines();
          } else {
            emitToast({
              tone: 'error',
              title: t('studentFines.toastPayFailed'),
              message: t('studentFines.toastPayFailedMsg'),
            });
          }
        })
        .catch((err: unknown) => {
          console.error('Lỗi xác minh MoMo:', err);
          emitToast({
            tone: 'error',
            title: t('studentFines.toastVerifyError'),
            message: t('studentFines.toastVerifyErrorMsg'),
          });
        });
    }
  }, [fetchFines, t]);

  useEffect(() => {
    if (!currentPaymentId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const response = await getMomoPaymentStatus(currentPaymentId);
        if (!isMounted) return;

        if (response.status === 'completed') {
          clearInterval(interval);
          emitToast({
            tone: 'success',
            title: t('studentFines.toastPaySuccess'),
            message: t('studentFines.toastPaySuccessAuto'),
          });
          setCurrentPaymentId(null);
          setGuideFine(null);
          fetchFines();
        } else if (response.status === 'failed') {
          clearInterval(interval);
          emitToast({
            tone: 'error',
            title: t('studentFines.toastPayFailed'),
            message: t('studentFines.toastPayFailedMsg'),
          });
          setCurrentPaymentId(null);
        }
      } catch (err) {
        console.error('Lỗi khi kiểm tra trạng thái thanh toán:', err);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentPaymentId, fetchFines, t]);

  async function handleMomoPay(fine: FineEntry | null) {
    if (!fine) return;
    setIsMomoLoading(true);
    try {
      const response = await initiateMomoPayment(fine.fine_id);
      setCurrentPaymentId(response.payment_id);
      
      // Mở trực tiếp payUrl (có thể là trang giả lập hoặc cổng MoMo Sandbox thật!)
      window.open(response.payUrl, '_blank');
      
      emitToast({
        tone: 'info',
        title: t('studentFines.toastMomoOpening'),
        message: t('studentFines.toastMomoOpeningMsg'),
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t('studentFines.toastVerifyErrorMsg'));
      emitToast({ tone: 'error', title: t('studentFines.toastVerifyError'), message: msg });
    } finally {
      setIsMomoLoading(false);
    }
  }

  async function handleVnpayPay(fine: FineEntry | null) {
    if (!fine) return;
    setIsVnpayLoading(true);
    try {
      const response = await initiateVnpayPayment(fine.fine_id);
      setCurrentPaymentId(response.payment_id);
      
      // Mở trực tiếp payUrl (có thể là trang giả lập hoặc cổng VNPay Sandbox thật!)
      window.open(response.payUrl, '_blank');
      
      emitToast({
        tone: 'info',
        title: t('studentFines.toastVnpayOpening'),
        message: t('studentFines.toastVnpayOpeningMsg'),
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t('studentFines.toastVerifyErrorMsg'));
      emitToast({ tone: 'error', title: t('studentFines.toastVerifyError'), message: msg });
    } finally {
      setIsVnpayLoading(false);
    }
  }

  const handleCloseGuide = () => {
    setGuideFine(null);
    setCurrentPaymentId(null);
    setIsQrZoomed(false);
  };

  const getEligibleWaiverTicket = (fineAmount: number | string) => {
    return activeTickets.find(
      (t) =>
        t.status === 'active' &&
        t.reward?.benefit_type === 'fine_waiver' &&
        Number(fineAmount) <= Number(t.reward.benefit_value) &&
        (t.expires_at === null || new Date(t.expires_at) > new Date())
    );
  };

  const handleApplyWaiver = async (fineId: number, ticket: MemberRewardRecord) => {
    if (!window.confirm(t('studentFines.confirmApplyTicket', { name: ticket.reward?.name }))) {
      return;
    }
    setIsWaiverLoading(true);
    try {
      const response = await applyFineWaiver(fineId);
      emitToast({
        tone: 'success',
        title: t('studentFines.toastWaiverSuccess'),
        message: response.message,
      });
      setGuideFine(null);
      fetchFines();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, t('studentFines.toastWaiverError'));
      emitToast({ tone: 'error', title: t('studentFines.toastWaiverError'), message: msg });
    } finally {
      setIsWaiverLoading(false);
    }
  };


  const summary = useMemo(() => {
    const unpaidCount = fines.filter((fine) => fine.status === 'unpaid').length;
    const paidTotal = fines
      .filter((fine) => fine.status === 'paid')
      .reduce((total, fine) => total + Number(fine.amount), 0);

    return { unpaidCount, paidTotal };
  }, [fines]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{t('studentFines.title')}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('studentFines.subtitle')}
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-100 bg-red-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-red-600">{t('studentFines.unpaidCard')}</p>
          <p className="mt-2 text-2xl font-extrabold text-red-800">{formatDisplayCurrency(totalUnpaid)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">{t('studentFines.unpaidCountCard')}</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-800">{summary.unpaidCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{t('studentFines.paidCard')}</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-800">{formatDisplayCurrency(summary.paidTotal)}</p>
        </div>
      </section>

      {/* Mobile Fines Card List */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">{t('studentFines.loading')}</div>
        ) : fines.length === 0 ? (
          <EmptyState
            icon="verified"
            title={t('studentFines.emptyTitle')}
            message={t('studentFines.emptyDesc')}
          />
        ) : (
          fines.map((fine) => {
            const status = statusConfig(fine.status, t);

            return (
              <div key={fine.fine_id} className="rounded-xl border border-surface-container bg-surface-bright p-4 scholar-shadow space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-on-surface line-clamp-2">{fine.book_title || t('studentFines.bookTitle')}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t('studentFines.loanCode', { id: fine.loan_id })}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-b border-outline-variant py-2 text-[11px] text-on-surface-variant">
                  <div>
                    <span className="text-outline uppercase text-[9px] font-bold block">{t('studentFines.dueDate')}</span>
                    <span className="font-semibold text-on-surface">{formatDisplayDate(fine.due_date)}</span>
                  </div>
                  <div>
                    <span className="text-outline uppercase text-[9px] font-bold block">{t('studentFines.tableHeaderOverdue')}</span>
                    <span className="font-semibold text-on-surface">{t('studentFines.daysOverdue', { count: fine.days_overdue })}</span>
                  </div>
                  <div>
                    <span className="text-outline uppercase text-[9px] font-bold block">{t('studentFines.amount')}</span>
                    <span className="font-bold text-red-700">{formatDisplayCurrency(fine.amount)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center gap-2 pt-1 w-full">
                  {fine.status === 'unpaid' ? (
                    <>
                      {getEligibleWaiverTicket(fine.amount) ? (
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            type="button"
                            disabled={isWaiverLoading}
                            onClick={() => handleApplyWaiver(fine.fine_id, getEligibleWaiverTicket(fine.amount)!)}
                            className="rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">local_activity</span>
                            {t('studentFines.btnUseTicket')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setGuideFine(fine)}
                            className="rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 cursor-pointer"
                          >
                            {t('studentFines.btnPay')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGuideFine(fine)}
                          className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 cursor-pointer"
                        >
                          {t('studentFines.btnGuide')}
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">{t('studentFines.noAction')}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Fines Table */}
      <section className="hidden md:block overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="border-b border-surface-container bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">{t('studentFines.tableHeaderBook')}</th>
                <th className="px-6 py-4">{t('studentFines.tableHeaderDueDate')}</th>
                <th className="px-6 py-4">{t('studentFines.tableHeaderOverdue')}</th>
                <th className="px-6 py-4">{t('studentFines.tableHeaderAmount')}</th>
                <th className="px-6 py-4">{t('studentFines.tableHeaderStatus')}</th>
                <th className="px-6 py-4 text-right">{t('studentFines.tableHeaderAction')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    {t('studentFines.loading')}
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <EmptyState icon="error" title={t('studentFines.loadError', 'Không thể tải danh sách khoản phạt.')} message={error} />
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <EmptyState
                      icon="verified"
                      title={t('studentFines.emptyTitle')}
                      message={t('studentFines.emptyDesc')}
                    />
                  </td>
                </tr>
              ) : (
                fines.map((fine) => {
                  const status = statusConfig(fine.status, t);

                  return (
                    <tr key={fine.fine_id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {fine.book_title || t('studentFines.bookTitle')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{t('studentFines.loanCode', { id: fine.loan_id })}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatDisplayDate(fine.due_date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {t('studentFines.daysOverdue', { count: fine.days_overdue })}
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-red-700">
                        {formatDisplayCurrency(fine.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {fine.status === 'unpaid' ? (
                          <div className="flex flex-col md:flex-row gap-2 justify-end items-center">
                            {getEligibleWaiverTicket(fine.amount) && (
                              <button
                                type="button"
                                disabled={isWaiverLoading}
                                onClick={() => handleApplyWaiver(fine.fine_id, getEligibleWaiverTicket(fine.amount)!)}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <span className="material-symbols-outlined text-sm">local_activity</span>
                                {t('studentFines.btnUseTicket')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setGuideFine(fine)}
                              className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:opacity-90 cursor-pointer shrink-0"
                            >
                              {t('studentFines.btnGuide')}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">{t('studentFines.noAction')}</span>
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

      {guideFine ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fine-payment-guide-title"
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-0 md:p-4"
        >
          <div className="w-full max-w-lg max-h-[85vh] md:max-h-[90vh] overflow-y-auto rounded-t-3xl rounded-b-none md:rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-xl relative animate-in slide-in-from-bottom duration-300 md:animate-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="fine-payment-guide-title" className="text-lg font-bold text-slate-900">
                  {t('studentFines.modalTitle')}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t('studentFines.modalSubtitle', { id: guideFine.fine_id, amount: formatDisplayCurrency(guideFine.amount) })}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseGuide}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[140px_1fr]">
              <div className="flex flex-col items-center justify-start gap-2 select-none">
                <div
                  onClick={() => setIsQrZoomed(true)}
                  className="group relative flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-inner cursor-zoom-in hover:border-primary/50 transition-all hover:scale-105"
                  title={t('studentFines.modalQrZoom')}
                >
                  <QRCodeSVG
                    value={`fine:${guideFine.fine_id};loan:${guideFine.loan_id};amount:${Number(guideFine.amount)}`}
                    size={112}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="material-symbols-outlined text-white text-xl">zoom_in</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{t('studentFines.modalQrLabel')}</span>
                <button 
                  type="button" 
                  onClick={() => setIsQrZoomed(true)}
                  className="text-[10px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[12px]">zoom_in</span> {t('studentFines.modalQrZoom')}
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                {getEligibleWaiverTicket(guideFine.amount) && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-3 border-dashed">
                    <p className="font-bold text-amber-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">local_activity</span>
                      {t('studentFines.ticketTitle')}
                    </p>
                    <p className="mt-1 text-xs text-amber-700 leading-relaxed" dangerouslySetInnerHTML={{
                      __html: t('studentFines.ticketDesc', { name: getEligibleWaiverTicket(guideFine.amount)?.reward?.name })
                    }} />
                    <button
                      type="button"
                      disabled={isWaiverLoading}
                      onClick={() => handleApplyWaiver(guideFine.fine_id, getEligibleWaiverTicket(guideFine.amount)!)}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold py-2.5 text-xs shadow-md shadow-amber-600/10 transition-all cursor-pointer"
                    >
                      {isWaiverLoading ? (
                        <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">confirmation_number</span>
                      )}
                      {t('studentFines.btnApplyTicket')}
                    </button>
                  </div>
                )}

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">payments</span>
                    {t('studentFines.cashTitle')}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                    {t('studentFines.cashDesc', { id: guideFine.fine_id })}
                  </p>
                </div>
                
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 border-dashed">
                  <p className="font-bold text-[#005baa] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#005baa] animate-pulse"></span>
                    {t('studentFines.vnpayTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {t('studentFines.vnpayDesc')}
                  </p>
                  <button
                    type="button"
                    disabled={isVnpayLoading}
                    onClick={() => handleVnpayPay(guideFine)}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#005baa] to-[#0070c0] hover:opacity-95 disabled:opacity-50 text-white font-bold py-2.5 text-xs shadow-md shadow-blue-600/10 transition-all cursor-pointer"
                  >
                    {isVnpayLoading ? (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">credit_card</span>
                    )}
                    {isVnpayLoading ? t('common.processing') : t('studentFines.btnVnpay')}
                  </button>
                </div>

                <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-3 border-dashed opacity-80 hover:opacity-100 transition-opacity">
                  <p className="font-bold text-[#a50064] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#a50064] animate-pulse"></span>
                    {t('studentFines.momoTitle')}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {t('studentFines.momoDesc')}
                  </p>
                  <button
                    type="button"
                    disabled={isMomoLoading}
                    onClick={() => handleMomoPay(guideFine)}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a50064] to-[#d82d8b] hover:opacity-95 disabled:opacity-50 text-white font-bold py-2.5 text-xs shadow-md shadow-pink-600/10 transition-all cursor-pointer"
                  >
                    {isMomoLoading ? (
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                    )}
                    {isMomoLoading ? t('common.processing') : t('studentFines.btnMomo')}
                  </button>
                </div>

                {currentPaymentId && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-700 flex items-center gap-2 animate-pulse shadow-sm">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-blue-700 border-t-transparent rounded-full"></span>
                    <span>{t('studentFines.verifyingMomo')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Zoomed QR Overlay Modal */}
      {isQrZoomed && guideFine && (
        <div
          onClick={() => setIsQrZoomed(false)}
          className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-950/80 p-0 md:p-4 backdrop-blur-md cursor-zoom-out select-none"
        >
          <div 
            className="relative flex flex-col items-center justify-center rounded-t-3xl rounded-b-none md:rounded-3xl border border-slate-700/50 bg-slate-900/90 p-5 md:p-8 shadow-2xl text-center space-y-4 max-w-sm w-full mx-auto animate-in slide-in-from-bottom duration-300 md:animate-none" 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>

            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-white">{t('studentFines.zoomedTitle', { id: guideFine.fine_id })}</h4>
              <p className="text-[11px] text-slate-400">{t('studentFines.zoomedSubtitle')}</p>
            </div>
            
            <div className="flex items-center justify-center rounded-2xl bg-white p-5 shadow-2xl hover:scale-[1.02] transition-transform duration-200">
              <QRCodeSVG
                value={`fine:${guideFine.fine_id};loan:${guideFine.loan_id};amount:${Number(guideFine.amount)}`}
                size={240}
              />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">{t('studentFines.zoomedAmount')}</p>
              <div className="text-red-400 font-black text-xl">
                {formatDisplayCurrency(guideFine.amount)}
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-normal max-w-[240px]">
              {t('studentFines.zoomedNote')}
            </p>

            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              className="w-full mt-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 text-xs transition-colors cursor-pointer"
            >
              {t('studentFines.zoomedClose')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
