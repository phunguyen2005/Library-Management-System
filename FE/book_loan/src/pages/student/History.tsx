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
    <div className="mx-auto w-full max-w-5xl space-y-6 md:space-y-8 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Lịch sử mượn trả</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Danh sách chi tiết các tài liệu bạn đã từng mượn tại thư viện
          </p>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant">Đang tải lịch sử...</div>
        ) : error ? (
          <div className="p-8">
            <EmptyState icon="error" title="Không thể tải dữ liệu" message={error} />
          </div>
        ) : history.length === 0 ? (
          <EmptyState
            icon="history_edu"
            title="Chưa có lịch sử mượn trả"
            message="Các giao dịch đã hoàn tất sẽ xuất hiện tại đây."
          />
        ) : (
          history.map((item) => (
            <div key={item.id} className="rounded-xl border border-surface-container bg-surface-bright p-4 scholar-shadow space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-on-surface line-clamp-2">{item.book}</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">{item.author}</p>
                </div>
                <span className={`shrink-0 rounded px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${item.color}`}>
                  {item.status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 border-t border-outline-variant pt-2.5 text-[10px] text-on-surface-variant">
                <div>
                  <span className="text-outline uppercase text-[8px] font-bold block mb-0.5">Mã GD</span>
                  <span className="font-mono font-bold text-on-surface text-[10px]">{item.id}</span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[8px] font-bold block mb-0.5">Ngày mượn</span>
                  <span className="font-semibold text-on-surface">{item.borrowDate}</span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[8px] font-bold block mb-0.5">Ngày trả</span>
                  <span className="font-semibold text-on-surface">{item.returnDate}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="overflow-x-auto">
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
    </div>
  );
}
