import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { simulateMomoPayment } from '../../api/fineApi';
import { emitToast } from '../../notifications/events';
import { getErrorMessage } from '../../lib/errors';

export default function MomoMockCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const paymentIdStr = searchParams.get('payment_id');
  const amountStr = searchParams.get('amount') || '0';
  const ref = searchParams.get('ref') || 'N/A';
  const fineIdStr = searchParams.get('fine_id') || 'N/A';
  const bookTitle = decodeURIComponent(searchParams.get('book') || 'Tài liệu');

  const paymentId = Number(paymentIdStr);
  const amount = Number(amountStr);

  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function formatCurrency(value: number) {
    return value.toLocaleString('vi-VN') + ' VND';
  }

  async function handleSimulateSuccess() {
    if (!paymentId) {
      emitToast({ tone: 'error', title: 'Lỗi giao dịch', message: 'Mã thanh toán không hợp lệ.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await simulateMomoPayment(paymentId, 'completed');
      setStatus('success');
      emitToast({
        tone: 'success',
        title: 'Giả lập thành công',
        message: response.message || 'Hệ thống đã ghi nhận khoản thanh toán!',
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Không thể gửi yêu cầu giả lập.');
      emitToast({ tone: 'error', title: 'Thao tác thất bại', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSimulateFailed() {
    if (!paymentId) return;

    setIsSubmitting(true);
    try {
      await simulateMomoPayment(paymentId, 'failed');
      setStatus('failed');
      emitToast({
        tone: 'info',
        title: 'Giả lập thất bại',
        message: 'Giao dịch MoMo giả lập đã bị từ chối/hủy bỏ.',
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Không thể gửi yêu cầu giả lập.');
      emitToast({ tone: 'error', title: 'Thao tác thất bại', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {/* MoMo Header Banner */}
      <header className="bg-gradient-to-r from-[#a50064] via-[#d82d8b] to-[#a50064] py-6 text-center text-white shadow-md">
        <div className="mx-auto max-w-lg px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm">
              <span className="font-extrabold text-[#a50064] text-lg">momo</span>
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold tracking-wide">MOMO PAYMENT GATEWAY</h1>
              <p className="text-xs text-pink-100 opacity-90">Môi trường thử nghiệm (Simulation Mode)</p>
            </div>
          </div>
          <span className="rounded-full bg-pink-900/30 px-3 py-1 text-xs font-semibold tracking-wider text-pink-200 uppercase border border-pink-500/20">
            Sandbox
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {status === 'pending' && (
          <div className="space-y-4">
            {/* Transaction Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin đơn hàng</h2>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Đơn vị chấp nhận</span>
                  <span className="text-sm font-bold text-slate-800 text-right">Thư viện trường (Book Loan)</span>
                </div>
                <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Tài liệu trễ hạn</span>
                  <span className="text-sm font-semibold text-slate-700 max-w-[240px] text-right truncate">
                    {bookTitle}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Mã phiếu phạt</span>
                  <span className="text-sm font-semibold text-slate-800">#{fineIdStr}</span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Mã tham chiếu GD</span>
                  <span className="text-sm font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {ref}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium text-slate-700">Số tiền thanh toán</span>
                  <span className="text-xl font-extrabold text-[#a50064]">{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>

            {/* QR Scan Container */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="relative rounded-2xl border-4 border-pink-100 p-4 bg-white shadow-inner">
                <QRCodeSVG
                  value={`momo://payment?ref=${ref}&amount=${amount}&fine=${fineIdStr}`}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
                <div className="absolute inset-0 m-auto h-10 w-10 rounded-lg bg-white p-1 shadow-md flex items-center justify-center border border-pink-50">
                  <span className="font-black text-[#a50064] text-[10px]">momo</span>
                </div>
              </div>

              <div className="mt-6 max-w-sm">
                <h3 className="text-sm font-bold text-slate-800">Quét mã để thanh toán</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Sử dụng Camera điện thoại hoặc Trình quét mã QR trên ứng dụng MoMo để quét mã thanh toán phía trên.
                </p>
              </div>
            </div>

            {/* Simulator Controls */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 mt-0.5">terminal</span>
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Bộ giả lập nhà phát triển</h4>
                  <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                    Bạn đang chạy ở chế độ giả lập. Vui lòng bấm một trong hai nút bên dưới để phản hồi kết quả giao dịch giả lập về máy chủ.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSimulateSuccess}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 text-sm shadow-sm transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Xác nhận thành công
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSimulateFailed}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 text-sm shadow-sm transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  Hủy / Lỗi giao dịch
                </button>
              </div>
            </div>

            {/* Go Back button */}
            <button
              type="button"
              onClick={() => navigate('/fines')}
              className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 text-sm transition-colors cursor-pointer text-center block"
            >
              Quay lại thư viện
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="my-10 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
              <span className="material-symbols-outlined text-5xl font-bold">check</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800">Thanh toán thành công!</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Hệ thống giả lập MoMo đã gửi kết quả IPN thành công về máy chủ Laravel. Khoản nợ phạt trễ hạn đã được xóa bỏ hoàn toàn.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-sm mx-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mã giao dịch MoMo</span>
                <span className="font-mono font-semibold text-slate-800">MM_{ref}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Số tiền đóng phạt</span>
                <span className="font-bold text-emerald-600">{formatCurrency(amount)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/fines')}
              className="w-full max-w-xs mx-auto rounded-xl bg-[#a50064] hover:opacity-90 text-white font-bold py-3 text-sm shadow-sm transition-opacity cursor-pointer block"
            >
              Quay lại thư viện quản lý phạt
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="my-10 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-md">
              <span className="material-symbols-outlined text-5xl font-bold">close</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800">Giao dịch bị từ chối</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Giao dịch đã được giả lập ở trạng thái THẤT BẠI. Tiền chưa được trừ và nợ phạt trễ hạn vẫn được giữ nguyên.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatus('pending')}
              className="w-full max-w-xs mx-auto rounded-xl bg-pink-100 hover:bg-pink-200 text-[#a50064] font-bold py-3 text-sm shadow-sm transition-colors cursor-pointer block"
            >
              Thử thanh toán lại
            </button>
          </div>
        )}
      </main>

      <footer className="mt-20 py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        <p>© 2026 MoMo Sandbox Simulator. Tích hợp cho Library Management System.</p>
      </footer>
    </div>
  );
}
