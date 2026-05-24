import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { confirmMomoTransfer } from '../../api/fineApi';
import { emitToast } from '../../notifications/events';
import { getErrorMessage } from '../../lib/errors';

export default function MomoTransferCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentIdStr = searchParams.get('payment_id');
  const amountStr = searchParams.get('amount') || '0';
  const phone = searchParams.get('phone') || '0901234567';
  const name = searchParams.get('name') || 'NGUYEN VAN A';
  const ref = searchParams.get('ref') || 'N/A';
  const fineIdStr = searchParams.get('fine_id') || 'N/A';
  const bookTitle = decodeURIComponent(searchParams.get('book') || 'Tài liệu');

  const paymentId = Number(paymentIdStr);
  const amount = Number(amountStr);

  const [status, setStatus] = useState<'pending' | 'submitted'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function formatCurrency(value: number) {
    return value.toLocaleString('vi-VN') + ' VND';
  }

  // Tạo đường dẫn nhantien MoMo thật
  // Khi quét bằng app MoMo thật, nó sẽ tự động điền: Số điện thoại nhận, Số tiền và Lời nhắn
  const qrUrl = `https://nhantien.momo.vn/${phone}/${amount}?comment=${encodeURIComponent(`FINE ${fineIdStr}`)}`;

  async function handleConfirmTransfer() {
    if (!paymentId) {
      emitToast({ tone: 'error', title: 'Lỗi giao dịch', message: 'Mã giao dịch không hợp lệ.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmMomoTransfer(paymentId);
      setStatus('submitted');
      emitToast({
        tone: 'success',
        title: 'Đã báo cáo chuyển khoản',
        message: 'Yêu cầu thanh toán đang được chuyển tới thủ thư để đối soát!',
      });
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Không thể xác nhận yêu cầu.');
      emitToast({ tone: 'error', title: 'Xác nhận thất bại', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased pb-12">
      {/* MoMo Header Banner */}
      <header className="bg-gradient-to-r from-[#a50064] via-[#d82d8b] to-[#a50064] py-6 text-center text-white shadow-md">
        <div className="mx-auto max-w-lg px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-sm">
              <span className="font-extrabold text-[#a50064] text-lg">momo</span>
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold tracking-wide">CỔNG THANH TOÁN MOMO CÁ NHÂN</h1>
              <p className="text-xs text-pink-100 opacity-90">Kênh nhận tiền trực tuyến Thư viện</p>
            </div>
          </div>
          <span className="rounded-full bg-pink-900/30 px-3 py-1 text-xs font-semibold tracking-wider text-pink-200 uppercase border border-pink-500/20">
            Real Money
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4 mt-2">
        {status === 'pending' ? (
          <div className="space-y-4">
            {/* Warning info */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 mt-0.5">info</span>
              <div className="text-xs text-amber-800 leading-relaxed">
                <p className="font-bold text-sm">Hướng dẫn chuyển tiền thật:</p>
                <p className="mt-1">
                  1. Mở ứng dụng MoMo thật trên điện thoại và tiến hành quét mã QR bên dưới.
                </p>
                <p>
                  2. Xác nhận đúng người nhận là <strong>{name}</strong> và số tiền đúng <strong>{formatCurrency(amount)}</strong>.
                </p>
                <p>
                  3. <strong className="text-red-700">Lưu ý quan trọng:</strong> Giữ nguyên lời nhắn chuyển khoản mặc định là <strong className="bg-amber-100 px-1 py-0.5 rounded">FINE {fineIdStr}</strong> để phục vụ đối soát tự động.
                </p>
              </div>
            </div>

            {/* Transaction Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Thông tin chuyển tiền</h2>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Tài khoản nhận</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{name}</p>
                    <p className="text-xs text-slate-500 font-mono">{phone}</p>
                  </div>
                </div>
                <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Nội dung đóng phạt</span>
                  <span className="text-sm font-semibold text-slate-700 max-w-[240px] text-right truncate">
                    {bookTitle}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-dashed border-slate-100 pb-3">
                  <span className="text-sm text-slate-500">Lời nhắn chuyển khoản</span>
                  <span className="text-sm font-mono text-xs font-bold text-red-600 bg-red-50 px-2.. py-1 rounded border border-red-100">
                    FINE {fineIdStr}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium text-slate-700">Số tiền chuyển khoản</span>
                  <span className="text-xl font-extrabold text-[#a50064]">{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>

            {/* QR Scan Container */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm flex flex-col items-center justify-center">
              <div className="relative rounded-2xl border-4 border-pink-100 p-4 bg-white shadow-inner">
                <QRCodeSVG
                  value={qrUrl}
                  size={190}
                  level="Q"
                  includeMargin={false}
                />
                <div className="absolute inset-0 m-auto h-10 w-10 rounded-lg bg-white p-1 shadow-md flex items-center justify-center border border-pink-50">
                  <span className="font-black text-[#a50064] text-[10px]">momo</span>
                </div>
              </div>

              <div className="mt-6 max-w-sm">
                <h3 className="text-sm font-bold text-slate-800">Quét mã QR để chuyển tiền</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Quét bằng camera điện thoại hoặc nút quét QR trên ứng dụng MoMo thật để tự động nhập thông tin tài khoản và lời nhắn.
                </p>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmTransfer}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 disabled:opacity-50 text-white font-bold py-3.5 text-sm shadow-md shadow-emerald-600/10 transition-opacity cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                ) : (
                  <span className="material-symbols-outlined text-base">check_circle</span>
                )}
                Tôi đã chuyển khoản thành công
              </button>

              <button
                type="button"
                onClick={() => navigate('/fines')}
                className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-3 text-sm transition-colors cursor-pointer text-center block"
              >
                Hủy giao dịch
              </button>
            </div>
          </div>
        ) : (
          <div className="my-10 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-md animate-pulse">
              <span className="material-symbols-outlined text-5xl font-bold">hourglass_empty</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-800">Đã gửi yêu cầu đối soát!</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Yêu cầu chuyển tiền đóng phạt của bạn đã được gửi thành công lên hệ thống. Khoản phạt hiện đang ở trạng thái <strong>Chờ đối soát</strong>.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 max-w-sm mx-auto space-y-3 text-left text-xs text-slate-600">
              <p className="font-bold text-slate-800">Tiến trình tiếp theo:</p>
              <p>1. Thủ thư kiểm tra số dư MoMo chính chủ điện thoại.</p>
              <p>2. Khi nhận đúng <strong>{formatCurrency(amount)}</strong> với lời nhắn <strong>FINE {fineIdStr}</strong>, Thủ thư sẽ bấm duyệt thành công.</p>
              <p>3. Khoản nợ trễ hạn của bạn sẽ tự động xóa bỏ hoàn toàn ngay sau khi được duyệt.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/fines')}
              className="w-full max-w-xs mx-auto rounded-xl bg-primary hover:opacity-90 text-white font-bold py-3 text-sm shadow-sm transition-opacity cursor-pointer block"
            >
              Quay lại quản lý phạt
            </button>
          </div>
        )}
      </main>

      <footer className="mt-20 py-6 text-center text-xs text-slate-400 border-t border-slate-200">
        <p>© 2026 Cổng chuyển khoản MoMo chính chủ Thư viện.</p>
      </footer>
    </div>
  );
}
