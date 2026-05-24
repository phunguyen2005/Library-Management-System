import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { simulateVnpayPayment } from '../../api/fineApi';
import { emitToast } from '../../notifications/events';
import { getErrorMessage } from '../../lib/errors';

export default function VnpayMockCheckout() {
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
      const response = await simulateVnpayPayment(paymentId, 'completed');
      setStatus('success');
      emitToast({
        tone: 'success',
        title: 'Thanh toán thành công',
        message: response.message || 'Hệ thống đã nhận được tiền giả lập!',
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
      await simulateVnpayPayment(paymentId, 'failed');
      setStatus('failed');
      emitToast({
        tone: 'info',
        title: 'Đã hủy thanh toán',
        message: 'Giao dịch VNPay giả lập đã bị hủy bỏ.',
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Không thể gửi yêu cầu giả lập.');
      emitToast({ tone: 'error', title: 'Thao tác thất bại', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased flex flex-col justify-between">
      <div>
        {/* VNPay Header Banner */}
        <header className="bg-gradient-to-r from-[#005baa] via-[#0070c0] to-[#005baa] py-6 text-center text-white shadow-md">
          <div className="mx-auto max-w-lg px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-12 rounded-lg bg-white p-1.5 flex items-center justify-center shadow-sm">
                <span className="font-black text-[#005baa] text-xs uppercase tracking-tight">vnpay</span>
              </div>
              <div className="text-left">
                <h1 className="text-sm font-bold tracking-wide">VNPAY GATEWAY SIMULATION</h1>
                <p className="text-[10px] text-blue-100 opacity-90">Môi trường giả lập tích hợp (Offline Testing)</p>
              </div>
            </div>
            <span className="rounded-full bg-blue-900/30 px-3 py-1 text-[10px] font-bold tracking-wider text-blue-200 uppercase border border-blue-400/20">
              Mockup
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-lg p-4 mt-4">
          {status === 'pending' && (
            <div className="space-y-4">
              {/* Order Info Card */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin đơn hàng</h2>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Đơn vị thụ hưởng</span>
                    <span className="text-sm font-bold text-slate-800 text-right">HCMUE Library (Book Loan)</span>
                  </div>
                  <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Nội dung nợ phạt</span>
                    <span className="text-sm font-semibold text-slate-700 max-w-[240px] text-right truncate">
                      Phạt trễ hạn sách: {bookTitle}
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
                    <span className="text-sm font-medium text-slate-700">Số tiền cần đóng</span>
                    <span className="text-xl font-extrabold text-[#005baa]">{formatCurrency(amount)}</span>
                  </div>
                </div>
              </div>

              {/* Developer Simulator Box */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm space-y-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 mt-0.5">terminal</span>
                  <div>
                    <h4 className="text-sm font-bold text-blue-800">Bộ Giả Lập VNPay</h4>
                    <p className="mt-0.5 text-xs text-blue-700 leading-relaxed">
                      Bạn đang tích hợp VNPay ở chế độ giả lập offline. Hãy bấm nút dưới đây để mô phỏng phản hồi IPN trực tiếp về máy chủ Laravel của bạn mà không cần kết nối internet hay mở ngrok.
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
                    Từ chối / Hủy bỏ
                  </button>
                </div>
              </div>

              {/* Sandbox Card test Guidelines */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">info</span>
                  Thông tin thẻ kiểm thử VNPay Sandbox thật
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Khi bạn chuyển cấu hình sang chế độ Sandbox thật (`VNPAY_SIMULATION=false` trong file `.env`), bạn sẽ được chuyển hướng sang cổng thật của VNPay. Hãy sử dụng thông tin thẻ dưới đây để thanh toán test:
                </p>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ngân hàng kiểm thử:</span>
                    <span className="font-bold text-slate-700">NCB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số thẻ test:</span>
                    <span className="font-mono font-bold text-[#005baa]">9704198526532563</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tên chủ thẻ:</span>
                    <span className="font-bold text-slate-700 uppercase">NGUYEN VAN A</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ngày phát hành:</span>
                    <span className="font-bold text-slate-700">07/15</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mã xác thực OTP:</span>
                    <span className="font-bold text-slate-700">123456</span>
                  </div>
                </div>
              </div>

              {/* Go Back button */}
              <button
                type="button"
                onClick={() => navigate('/fines')}
                className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 text-sm transition-colors cursor-pointer text-center block"
              >
                Quay lại thư viện phạt
              </button>
            </div>
          )}

          {status === 'success' && (
            <div className="my-10 text-center space-y-6 animate-fade-in">
              <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <span className="material-symbols-outlined text-5xl font-bold">check</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800">Thanh toán thành công!</h2>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Bộ giả lập VNPay đã gửi kết quả IPN thành công về Laravel API. Khoản phạt trễ hạn của bạn đã được xóa nợ tự động trên hệ thống dữ liệu.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-sm mx-auto space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Cổng thanh toán</span>
                  <span className="font-bold text-[#005baa]">VNPay Giả Lập</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Mã tham chiếu GD</span>
                  <span className="font-mono font-semibold text-slate-700">{ref}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Số tiền thanh toán</span>
                  <span className="font-extrabold text-emerald-600">{formatCurrency(amount)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/fines')}
                className="w-full max-w-xs mx-auto rounded-xl bg-[#005baa] hover:opacity-90 text-white font-bold py-3 text-sm shadow-sm transition-opacity cursor-pointer block"
              >
                Quay lại quản lý nợ phạt
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div className="my-10 text-center space-y-6 animate-fade-in">
              <div className="mx-auto h-20 w-20 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-md">
                <span className="material-symbols-outlined text-5xl font-bold">close</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800">Giao dịch thất bại</h2>
                <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                  Bạn đã mô phỏng giao dịch ở trạng thái THẤT BẠI. Tiền không bị trừ và hệ thống giữ nguyên khoản nợ phạt trễ hạn của bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStatus('pending')}
                className="w-full max-w-xs mx-auto rounded-xl bg-blue-50 hover:bg-blue-100 text-[#005baa] font-bold py-3 text-sm shadow-sm transition-colors cursor-pointer block"
              >
                Thử thanh toán lại
              </button>
            </div>
          )}
        </main>
      </div>

      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 mt-20">
        <p>© 2026 VNPay Sandbox Mockup. Dự án Quản lý Thư viện HCMUE.</p>
      </footer>
    </div>
  );
}
