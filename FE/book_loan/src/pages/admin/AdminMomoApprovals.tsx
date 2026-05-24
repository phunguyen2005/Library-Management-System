import React, { useEffect, useState } from 'react';
import { getAdminPendingMomo, approveMomoPayment, rejectMomoPayment, type AdminPendingMomoEntry } from '../../api/fineApi';
import EmptyState from '../../components/EmptyState';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

export default function AdminMomoApprovals() {
  const [transfers, setTransfers] = useState<AdminPendingMomoEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<number | null>(null);

  const fetchPendingTransfers = React.useCallback(() => {
    setIsLoading(true);
    getAdminPendingMomo()
      .then((response) => {
        setTransfers(response.data);
      })
      .catch((err: unknown) => {
        const msg = getErrorMessage(err, 'Không thể tải danh sách chuyển khoản chờ duyệt.');
        emitToast({ tone: 'error', title: 'Lỗi tải dữ liệu', message: msg });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchPendingTransfers();
  }, [fetchPendingTransfers]);

  async function handleApprove(paymentId: number) {
    if (window.confirm('Bạn đã nhận được tiền chính xác trong app MoMo thật và xác nhận phê duyệt đóng phạt?')) {
      setIsProcessingId(paymentId);
      try {
        await approveMomoPayment(paymentId);
        emitToast({
          tone: 'success',
          title: 'Phê duyệt thành công',
          message: 'Khoản phí phạt đã được tự động chuyển thành Đã thanh toán!',
        });
        fetchPendingTransfers();
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'Phê duyệt giao dịch thất bại.');
        emitToast({ tone: 'error', title: 'Thao tác lỗi', message: msg });
      } finally {
        setIsProcessingId(null);
      }
    }
  }

  async function handleReject(paymentId: number) {
    if (window.confirm('Bạn chưa nhận được tiền hoặc thông tin chuyển khoản sai lệch, muốn từ chối giao dịch này?')) {
      setIsProcessingId(paymentId);
      try {
        await rejectMomoPayment(paymentId);
        emitToast({
          tone: 'warning',
          title: 'Đã từ chối giao dịch',
          message: 'Trạng thái giao dịch chuyển thành Thất bại.',
        });
        fetchPendingTransfers();
      } catch (err: unknown) {
        const msg = getErrorMessage(err, 'Từ chối giao dịch thất bại.');
        emitToast({ tone: 'error', title: 'Thao tác lỗi', message: msg });
      } finally {
        setIsProcessingId(null);
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-8">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">Duyệt Chuyển Khoản MoMo</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Đối soát thủ công các giao dịch sinh viên báo cáo đã chuyển khoản qua tài khoản MoMo cá nhân.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="border-b border-surface-container bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Sinh viên</th>
                <th className="px-6 py-4">Sách trễ hạn</th>
                <th className="px-6 py-4">Số tiền chuyển</th>
                <th className="px-6 py-4">Nội dung đối soát</th>
                <th className="px-6 py-4">Ngày báo cáo</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Đang tải danh sách chờ đối soát...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <EmptyState
                      icon="verified"
                      title="Không có giao dịch chờ duyệt"
                      message="Tất cả các giao dịch chuyển khoản MoMo đã được đối soát hoặc chưa có báo cáo mới."
                    />
                  </td>
                </tr>
              ) : (
                transfers.map((item) => (
                  <tr key={item.payment_id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{item.student_name}</p>
                      <p className="text-xs text-slate-500">{item.student_email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                      {item.book_title}
                      <p className="text-[10px] text-slate-400 font-normal">Mã phiếu phạt #{item.fine_id}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-extrabold text-[#a50064]">
                      {item.amount_paid.toLocaleString('vi-VN')} VND
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded font-bold">
                        FINE {item.fine_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDisplayDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isProcessingId !== null}
                          onClick={() => handleApprove(item.payment_id)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                          Duyệt thành công
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingId !== null}
                          onClick={() => handleReject(item.payment_id)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-1.5 px-3 text-xs border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
