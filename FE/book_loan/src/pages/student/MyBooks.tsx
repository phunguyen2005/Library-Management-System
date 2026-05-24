import React, { useEffect, useState } from 'react';
import { getMyRequests } from '../../api/borrowApi';
import EmptyState from '../../components/EmptyState';
import { applyImageFallback, formatDisplayDate, getCoverUrl, getLoanDueLabel } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { DueStatus, MemberBorrowRequest } from '../../types/request';

type BorrowedBookCard = {
  id: number;
  title: string;
  author: string;
  type: string;
  typeColor: string;
  cover?: string | null;
  borrowDate: string;
  dueDate: string;
  dueLabel: string;
  dueStatus: DueStatus;
  isWarning: boolean;
  isOverdue: boolean;
};

type HistoryBookRow = {
  id: number;
  title: string;
  author: string;
  borrowDate: string;
  returnDate: string;
};

function getRequestDueLabel(req: MemberBorrowRequest) {
  const fallback = getLoanDueLabel(req.due_date);
  const dueStatus = req.due_status || (fallback.isOverdue ? 'overdue' : 'active');

  if (dueStatus === 'overdue' || req.is_overdue) {
    const daysOverdue = Math.max(1, Number(req.days_overdue ?? 0));

    return {
      label: `Qua han ${daysOverdue} ngay`,
      dueStatus: 'overdue' as DueStatus,
      isWarning: true,
      isOverdue: true,
    };
  }

  if (dueStatus === 'due_today') {
    return {
      label: 'Den han hom nay',
      dueStatus,
      isWarning: true,
      isOverdue: false,
    };
  }

  if (dueStatus === 'due_soon') {
    return {
      label: fallback.label,
      dueStatus,
      isWarning: true,
      isOverdue: false,
    };
  }

  if (dueStatus === 'none') {
    return {
      label: 'Chua co han tra',
      dueStatus,
      isWarning: false,
      isOverdue: false,
    };
  }

  if (dueStatus === 'returned') {
    return {
      label: 'Da tra',
      dueStatus,
      isWarning: false,
      isOverdue: false,
    };
  }

  return {
    label: fallback.label,
    dueStatus,
    isWarning: fallback.isWarning,
    isOverdue: fallback.isOverdue,
  };
}

export default function MyBooks() {
  const [activeTab, setActiveTab] = useState<'borrowed' | 'history'>('borrowed');
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBookCard[]>([]);
  const [historyBooks, setHistoryBooks] = useState<HistoryBookRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getMyRequests()
      .then((data: MemberBorrowRequest[]) => {
        const borrowed = data.filter((req) => req.status === 'borrowed');
        const mappedBorrowed = borrowed.map((req) => {
          const dueStatus = getRequestDueLabel(req);

          return {
            id: req.id,
            title: req.bookTitle,
            author: req.author,
            type: req.category || 'Tài liệu',
            typeColor: dueStatus.isWarning ? 'text-tertiary' : 'text-primary',
            cover: getCoverUrl(req.cover),
            borrowDate: formatDisplayDate(req.borrow_date),
            dueDate: formatDisplayDate(req.due_date),
            dueLabel: dueStatus.label,
            dueStatus: dueStatus.dueStatus,
            isWarning: dueStatus.isWarning,
            isOverdue: dueStatus.isOverdue,
          };
        });
        setBorrowedBooks(mappedBorrowed);

        const history = data
          .filter((req) => req.status === 'returned')
          .map((req) => ({
            id: req.id,
            title: req.bookTitle,
            author: req.author,
            borrowDate: formatDisplayDate(req.borrow_date),
            returnDate: formatDisplayDate(req.return_date),
          }));

        setHistoryBooks(history);
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, 'Không thể tải danh sách mượn sách.');
        setError(message);
        emitToast({ tone: 'error', title: 'Không thể tải sách của tôi', message });
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Sách của tôi</h2>
          <p className="mt-1 text-on-surface-variant">
            Quản lý và theo dõi quá trình mượn trả tài liệu của bạn.
          </p>
        </div>
        <div className="flex w-fit gap-2 rounded-xl bg-surface-container-low p-1">
          <button
            onClick={() => setActiveTab('borrowed')}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'borrowed'
                ? 'bg-surface-bright text-primary scholar-shadow'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">auto_stories</span>
            Sách đang mượn
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-surface-bright text-primary scholar-shadow'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-sm">history_edu</span>
            Lịch sử mượn
          </button>
        </div>
      </div>

      {error ? (
        <EmptyState icon="error" title="Không thể tải dữ liệu" message={error} />
      ) : isLoading ? (
        <EmptyState icon="hourglass_empty" title="Đang tải dữ liệu..." />
      ) : activeTab === 'borrowed' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {borrowedBooks.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="auto_stories"
                title="Chưa có sách đang mượn"
                message="Các phiếu đã được thủ thư duyệt sẽ xuất hiện ở đây."
              />
            </div>
          ) : (
            borrowedBooks.map((book) => (
            <div
              key={book.id}
              className={`flex flex-col gap-4 rounded-xl border-2 bg-surface-bright p-5 scholar-shadow transition-all ${
                book.isWarning ? 'border-tertiary/20' : 'border-transparent hover:-translate-y-1'
              }`}
            >
              <div className="flex gap-4">
                <div className="aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                  <img
                    src={book.cover}
                    alt={book.title}
                    onError={(event) => applyImageFallback(event.currentTarget)}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${book.typeColor}`}>
                      {book.type}
                    </span>
                    <h3 className="mt-1 line-clamp-2 text-sm font-bold text-on-surface">
                      {book.title}
                    </h3>
                    <p className="mt-1 text-xs text-on-surface-variant">{book.author}</p>
                  </div>
                  <div className="mt-4">
                    <div
                      aria-label={`Loan due status ${book.dueStatus}`}
                      className={`flex items-center gap-1 font-bold ${
                        book.isWarning ? 'text-tertiary' : 'text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">timer</span>
                      <span className="text-xs">{book.dueLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                <div className="text-[10px] text-on-surface-variant">
                  <p>Mượn: {book.borrowDate}</p>
                  <p>Hạn: {book.dueDate}</p>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Mobile History Card List */}
          <div className="block md:hidden space-y-4">
            {historyBooks.length === 0 ? (
              <EmptyState
                icon="history_edu"
                title="Chưa có lịch sử mượn"
                message="Các sách đã trả sẽ được lưu lại tại đây."
              />
            ) : (
              historyBooks.map((book) => (
                <div key={book.id} className="rounded-xl border border-surface-container bg-surface-bright p-4 scholar-shadow">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-on-surface line-clamp-2">{book.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-0.5">{book.author}</p>
                    </div>
                    <span className="shrink-0 rounded bg-surface-container px-2 py-0.5 text-[9px] font-bold uppercase text-on-surface-variant">
                      Đã trả
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] text-on-surface-variant border-t border-outline-variant pt-2">
                    <div>
                      <span className="text-outline uppercase text-[9px] font-bold block">Ngày mượn</span>
                      <span className="font-semibold text-on-surface">{book.borrowDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-outline uppercase text-[9px] font-bold block">Ngày trả</span>
                      <span className="font-semibold text-on-surface">{book.returnDate}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop History Table */}
          <div className="hidden md:block overflow-hidden rounded-xl bg-surface-bright scholar-shadow">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-xs uppercase tracking-widest text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">Tên sách</th>
                  <th className="px-6 py-4">Ngày mượn</th>
                  <th className="px-6 py-4">Ngày trả</th>
                  <th className="px-6 py-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {historyBooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8">
                      <EmptyState
                        icon="history_edu"
                        title="Chưa có lịch sử mượn"
                        message="Các sách đã trả sẽ được lưu lại tại đây."
                      />
                    </td>
                  </tr>
                ) : (
                  historyBooks.map((book) => (
                  <tr key={book.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{book.title}</p>
                      <p className="text-xs text-on-surface-variant">{book.author}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{book.borrowDate}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{book.returnDate}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-surface-container px-2 py-1 text-[10px] font-bold uppercase">
                        Đã trả
                      </span>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
