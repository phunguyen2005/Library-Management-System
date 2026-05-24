import React, { useEffect, useState } from 'react';
import { getMyRequests } from '../../api/borrowApi';
import EmptyState from '../../components/EmptyState';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { MemberBorrowRequest } from '../../types/request';

type HistoryItem = {
  id: string;
  book: string;
  author: string;
  borrowDate: string;
  returnDate: string;
  status: string;
  color: string;
};

function getCompletionStatus(returnDate?: string | null, dueDate?: string | null) {
  if (!returnDate || !dueDate) {
    return { status: 'Đã trả', color: 'text-slate-600 bg-slate-100' };
  }

  return new Date(returnDate) > new Date(dueDate)
    ? { status: 'Trả quá hạn', color: 'text-red-600 bg-red-50' }
    : { status: 'Đúng hạn', color: 'text-green-600 bg-green-50' };
}

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getMyRequests()
      .then((data: MemberBorrowRequest[]) => {
        const returned = data.filter((r) => r.status === 'returned');
        setHistory(
          returned.map((r) => {
            const completion = getCompletionStatus(r.return_date, r.due_date);

            return {
              id: `H-${r.id}`,
              book: r.bookTitle,
              author: r.author,
              borrowDate: formatDisplayDate(r.borrow_date),
              returnDate: formatDisplayDate(r.return_date),
              status: completion.status,
              color: completion.color,
            };
          }),
        );
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, 'Không thể tải lịch sử mượn trả.');
        setError(message);
        emitToast({ tone: 'error', title: 'Không thể tải lịch sử', message });
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Lịch sử mượn trả</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Danh sách chi tiết các tài liệu bạn đã từng mượn tại thư viện
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <table className="w-full min-w-[700px] text-left">
          <thead>
            <tr className="border-b border-surface-container bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              <th className="px-6 py-4">Mã giao dịch</th>
              <th className="px-6 py-4">Tài liệu</th>
              <th className="px-6 py-4 text-center">Ngày mượn</th>
              <th className="px-6 py-4 text-center">Ngày trả</th>
              <th className="px-6 py-4 text-right">Trạng thái hoàn tất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  Đang tải lịch sử...
                </td>
              </tr>
            ) : (
              error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <EmptyState icon="error" title="Không thể tải dữ liệu" message={error} />
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8">
                    <EmptyState
                      icon="history_edu"
                      title="Chưa có lịch sử mượn trả"
                      message="Các giao dịch đã hoàn tất sẽ xuất hiện tại đây."
                    />
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-500">{item.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-800">{item.book}</p>
                    <p className="text-xs text-slate-500">{item.author}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-slate-700">{item.borrowDate}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-slate-700">{item.returnDate}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-block rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${item.color}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
