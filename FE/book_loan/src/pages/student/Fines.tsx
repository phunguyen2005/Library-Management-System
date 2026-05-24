import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getMyFines, initiateMomoPayment, initiateVnpayPayment, getMomoPaymentStatus, simulateMomoPayment, simulateVnpayPayment, type FineEntry, type FineStatus } from '../../api/fineApi';
import { apiRequest } from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

function formatCurrency(value: string | number) {
  return Number(value || 0).toLocaleString('vi-VN') + ' VND';
}

function statusConfig(status: FineStatus) {
  if (status === 'paid') {
    return { label: 'Đã trả', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
  }

  if (status === 'waived') {
    return { label: 'Đã miễn', className: 'border-sky-200 bg-sky-50 text-sky-700' };
  }

  if (status === 'cancelled') {
    return { label: 'Đã hủy', className: 'border-slate-200 bg-slate-100 text-slate-600' };
  }

  return { label: 'Chưa trả', className: 'border-red-200 bg-red-50 text-red-700' };
}

export default function StudentFines() {
  const [fines, setFines] = useState<FineEntry[]>([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guideFine, setGuideFine] = useState<FineEntry | null>(null);

  const [isMomoLoading, setIsMomoLoading] = useState(false);
  const [isVnpayLoading, setIsVnpayLoading] = useState(false);
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);
  const [isQrZoomed, setIsQrZoomed] = useState(false);

  const fetchFines = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    getMyFines()
      .then((response) => {
        setFines(response.fines);
        setTotalUnpaid(response.total_unpaid);
      })
      .catch((loadError: unknown) => {
        const message = getErrorMessage(loadError, 'Không thể tải danh sách khoản phạt.');
        setError(message);
        emitToast({ tone: 'error', title: 'Không thể tải khoản phạt', message });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

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
        title: 'Đang xác minh thanh toán VNPay',
        message: 'Hệ thống đang xác minh giao dịch của bạn với VNPay...',
      });

      apiRequest<{ RspCode: string; Message: string }>(`/vnpay/ipn${queryString}`, {
        method: 'GET',
        auth: true,
      })
        .then((res) => {
          if (res.RspCode === '00' || res.RspCode === '02') {
            emitToast({
              tone: 'success',
              title: 'Thanh toán thành công',
              message: 'Hệ thống đã nhận và xác nhận thanh toán VNPay của bạn.',
            });
            fetchFines();
          } else {
            emitToast({
              tone: 'error',
              title: 'Xác minh thất bại',
              message: `Giao dịch thất bại hoặc chữ ký không hợp lệ (Mã: ${res.RspCode}).`,
            });
          }
        })
        .catch((err: unknown) => {
          console.error('Lỗi xác minh VNPay:', err);
          emitToast({
            tone: 'error',
            title: 'Lỗi xác minh',
            message: 'Đã xảy ra lỗi khi kết nối xác minh giao dịch VNPay.',
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
        title: 'Đang xác minh thanh toán MoMo',
        message: 'Hệ thống đang xác minh giao dịch của bạn với ví MoMo...',
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
              title: 'Thanh toán thành công',
              message: 'Hệ thống đã nhận và xác nhận thanh toán MoMo của bạn.',
            });
            fetchFines();
          } else {
            emitToast({
              tone: 'error',
              title: 'Xác minh thất bại',
              message: `Giao dịch thất bại hoặc bị hủy (Mã kết quả: ${momoResultCode}).`,
            });
          }
        })
        .catch((err: unknown) => {
          console.error('Lỗi xác minh MoMo:', err);
          emitToast({
            tone: 'error',
            title: 'Lỗi xác minh',
            message: 'Đã xảy ra lỗi khi kết nối xác minh giao dịch MoMo.',
          });
        });
    }
  }, [fetchFines]);

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
            title: 'Thanh toán thành công',
            message: 'Hệ thống đã nhận được thanh toán MoMo của bạn và tự động xóa nợ phạt.',
          });
          setCurrentPaymentId(null);
          setGuideFine(null);
          fetchFines();
        } else if (response.status === 'failed') {
          clearInterval(interval);
          emitToast({
            tone: 'error',
            title: 'Thanh toán thất bại',
            message: 'Giao dịch MoMo đã bị hủy hoặc thất bại.',
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
  }, [currentPaymentId, fetchFines]);

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
        title: 'Đang mở trang MoMo',
        message: 'Vui lòng hoàn tất giao dịch trên tab mới của MoMo vừa mở.',
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Không thể tạo yêu cầu thanh toán MoMo.');
      emitToast({ tone: 'error', title: 'Khởi tạo thất bại', message: msg });
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
        title: 'Đang mở trang VNPay',
        message: 'Vui lòng hoàn tất giao dịch trên tab mới của VNPay vừa mở.',
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Không thể tạo yêu cầu thanh toán VNPay.');
      emitToast({ tone: 'error', title: 'Khởi tạo thất bại', message: msg });
    } finally {
      setIsVnpayLoading(false);
    }
  }

  const handleCloseGuide = () => {
    setGuideFine(null);
    setCurrentPaymentId(null);
    setIsQrZoomed(false);
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
          <h2 className="text-3xl font-bold text-on-surface">Khoản phạt của tôi</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Theo dõi các khoản phạt trễ hạn và hướng dẫn thanh toán tại quầy.
          </p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-red-100 bg-red-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-red-600">Tổng nợ phạt</p>
          <p className="mt-2 text-2xl font-extrabold text-red-800">{formatCurrency(totalUnpaid)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Khoản chưa trả</p>
          <p className="mt-2 text-2xl font-extrabold text-amber-800">{summary.unpaidCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Đã thanh toán</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-800">{formatCurrency(summary.paidTotal)}</p>
        </div>
      </section>

      {/* Mobile Fines Card List */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400">Đang tải khoản phạt...</div>
        ) : fines.length === 0 ? (
          <EmptyState
            icon="verified"
            title="Bạn không có khoản phạt nào"
            message="Các khoản phạt trễ hạn, mất sách hoặc hư hỏng sẽ xuất hiện tại đây."
          />
        ) : (
          fines.map((fine) => {
            const status = statusConfig(fine.status);

            return (
              <div key={fine.fine_id} className="rounded-xl border border-surface-container bg-surface-bright p-4 scholar-shadow space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-on-surface line-clamp-2">{fine.book_title || 'Tài liệu không rõ'}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">Mã phiếu #{fine.loan_id}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-b border-outline-variant py-2 text-[11px] text-on-surface-variant">
                  <div>
                    <span className="text-outline uppercase text-[9px] font-bold block">Hạn trả</span>
                    <span className="font-semibold text-on-surface">{formatDisplayDate(fine.due_date)}</span>
                  </div>
                  <div>
                    <span className="text-outline uppercase text-[9px] font-bold block">Trễ hạn</span>
                    <span className="font-semibold text-on-surface">{fine.days_overdue} ngày</span>
                  </div>
                  <div>
                    <span className="text-outline uppercase text-[9px] font-bold block">Số tiền</span>
                    <span className="font-bold text-red-700">{formatCurrency(fine.amount)}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  {fine.status === 'unpaid' ? (
                    <button
                      type="button"
                      onClick={() => setGuideFine(fine)}
                      className="w-full rounded-lg bg-primary py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 cursor-pointer"
                    >
                      Hướng dẫn thanh toán
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">Không cần xử lý</span>
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
                <th className="px-6 py-4">Tên sách</th>
                <th className="px-6 py-4">Hạn trả</th>
                <th className="px-6 py-4">Số ngày trễ</th>
                <th className="px-6 py-4">Tiền phạt</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    Đang tải khoản phạt...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <EmptyState icon="error" title="Không thể tải dữ liệu" message={error} />
                  </td>
                </tr>
              ) : fines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <EmptyState
                      icon="verified"
                      title="Bạn không có khoản phạt nào"
                      message="Các khoản phạt trễ hạn, mất sách hoặc hư hỏng sẽ xuất hiện tại đây."
                    />
                  </td>
                </tr>
              ) : (
                fines.map((fine) => {
                  const status = statusConfig(fine.status);

                  return (
                    <tr key={fine.fine_id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {fine.book_title || 'Tài liệu không rõ'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">Mã phiếu #{fine.loan_id}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {formatDisplayDate(fine.due_date)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {fine.days_overdue} ngày
                      </td>
                      <td className="px-6 py-4 text-sm font-extrabold text-red-700">
                        {formatCurrency(fine.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {fine.status === 'unpaid' ? (
                          <button
                            type="button"
                            onClick={() => setGuideFine(fine)}
                            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/20 hover:opacity-90 cursor-pointer"
                          >
                            Xem hướng dẫn thanh toán
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Không cần xử lý</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
        >
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="fine-payment-guide-title" className="text-lg font-bold text-slate-900">
                  Hướng dẫn thanh toán
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Mã phiếu phạt #{guideFine.fine_id} | {formatCurrency(guideFine.amount)}
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
                  title="Nhấp để phóng to mã QR"
                >
                  <QRCodeSVG
                    value={`fine:${guideFine.fine_id};loan:${guideFine.loan_id};amount:${Number(guideFine.amount)}`}
                    size={112}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="material-symbols-outlined text-white text-xl">zoom_in</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Mã phiếu phạt</span>
                <button 
                  type="button" 
                  onClick={() => setIsQrZoomed(true)}
                  className="text-[10px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[12px]">zoom_in</span> Phóng to
                </button>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">payments</span>
                    Tiền mặt tại quầy
                  </p>
                  <p className="mt-1 text-xs text-emerald-700 leading-relaxed">
                    Đưa mã QR hoặc mã phiếu phạt #{guideFine.fine_id} cho thủ thư để xác nhận thu phí bằng tiền mặt hoặc chuyển khoản trực tiếp.
                  </p>
                </div>
                
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 border-dashed">
                  <p className="font-bold text-[#005baa] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#005baa] animate-pulse"></span>
                    Cổng thanh toán VNPay (Online - Khuyên dùng ⭐)
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Hỗ trợ thanh toán nhanh bằng ứng dụng ngân hàng quét mã QR hoặc thẻ ATM/Quốc tế. Tự động xóa nợ phạt tức thì.
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
                    {isVnpayLoading ? 'Đang kết nối...' : 'Thanh toán trực tuyến VNPay'}
                  </button>
                </div>

                <div className="rounded-xl border border-pink-200 bg-pink-50/40 p-3 border-dashed opacity-80 hover:opacity-100 transition-opacity">
                  <p className="font-bold text-[#a50064] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#a50064] animate-pulse"></span>
                    Ví Điện Tử MoMo (Online)
                  </p>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    Đóng phạt nhanh chóng bằng ví điện tử MoMo.
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
                    {isMomoLoading ? 'Đang kết nối...' : 'Thanh toán trực tuyến MoMo'}
                  </button>
                </div>

                {currentPaymentId && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-700 flex items-center gap-2 animate-pulse shadow-sm">
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-blue-700 border-t-transparent rounded-full"></span>
                    <span>Hệ thống đang chờ xác nhận từ cổng thanh toán...</span>
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md cursor-zoom-out select-none"
        >
          <div 
            className="relative flex flex-col items-center justify-center rounded-3xl border border-slate-700/50 bg-slate-900/90 p-8 shadow-2xl text-center space-y-4 max-w-sm w-full mx-auto" 
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
              <h4 className="text-base font-extrabold text-white">Mã QR phiếu phạt #{guideFine.fine_id}</h4>
              <p className="text-[11px] text-slate-400">Đưa cho thủ thư quét để thu tiền nhanh tại quầy</p>
            </div>
            
            <div className="flex items-center justify-center rounded-2xl bg-white p-5 shadow-2xl hover:scale-[1.02] transition-transform duration-200">
              <QRCodeSVG
                value={`fine:${guideFine.fine_id};loan:${guideFine.loan_id};amount:${Number(guideFine.amount)}`}
                size={240}
              />
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">Số tiền đóng phạt</p>
              <div className="text-red-400 font-black text-xl">
                {formatCurrency(guideFine.amount)}
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-normal max-w-[240px]">
              * Hỗ trợ thanh toán nhanh bằng tiền mặt hoặc chuyển khoản tại quầy thông tin thư viện.
            </p>

            <button
              type="button"
              onClick={() => setIsQrZoomed(false)}
              className="w-full mt-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 text-xs transition-colors cursor-pointer"
            >
              Đóng phóng to
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
