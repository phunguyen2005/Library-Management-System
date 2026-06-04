import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

function getRequestDueLabel(req: MemberBorrowRequest, t: any) {
  const fallback = getLoanDueLabel(req.due_date);
  const dueStatus = req.due_status || (fallback.isOverdue ? 'overdue' : 'active');

  if (dueStatus === 'overdue' || req.is_overdue) {
    const daysOverdue = Math.max(1, Number(req.days_overdue ?? 0));

    return {
      label: t('due.overdue', { count: daysOverdue }),
      dueStatus: 'overdue' as DueStatus,
      isWarning: true,
      isOverdue: true,
    };
  }

  if (dueStatus === 'due_today') {
    return {
      label: t('due.today'),
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
      label: t('due.none'),
      dueStatus,
      isWarning: false,
      isOverdue: false,
    };
  }

  if (dueStatus === 'returned') {
    return {
      label: t('studentHistory.statusReturned'),
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
  const { t } = useTranslation();
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
          const dueStatus = getRequestDueLabel(req, t);

          return {
            id: req.id,
            title: req.bookTitle,
            author: req.author,
            type: req.category || t('studentFines.bookTitle'),
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
        const message = getErrorMessage(error, t('studentMyBooks.loadError'));
        setError(message);
        emitToast({ tone: 'error', title: t('studentMyBooks.loadError'), message });
      })
      .finally(() => setIsLoading(false));
  }, [t]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{t('studentMyBooks.title')}</h2>
          <p className="mt-1 text-on-surface-variant">
            {t('studentMyBooks.subtitle')}
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
            {t('studentMyBooks.tabActive')}
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
            {t('studentHistory.title')}
          </button>
        </div>
      </div>

      {error ? (
        <EmptyState icon="error" title={t('common.error')} message={error} />
      ) : isLoading ? (
        <EmptyState icon="hourglass_empty" title={t('common.loading')} />
      ) : activeTab === 'borrowed' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {borrowedBooks.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="auto_stories"
                title={t('studentMyBooks.emptyTitle')}
                message={t('studentMyBooks.emptyDesc')}
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
                  <p>{t('studentHistory.tableHeaderBorrowDate')}: {book.borrowDate}</p>
                  <p>{t('studentFines.dueDate')}: {book.dueDate}</p>
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
                title={t('studentHistory.emptyTitle')}
                message={t('studentHistory.emptyDesc')}
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
                      {t('studentHistory.statusReturned')}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-between text-[11px] text-on-surface-variant border-t border-outline-variant pt-2">
                    <div>
                      <span className="text-outline uppercase text-[9px] font-bold block">{t('studentHistory.tableHeaderBorrowDate')}</span>
                      <span className="font-semibold text-on-surface">{book.borrowDate}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-outline uppercase text-[9px] font-bold block">{t('studentHistory.tableHeaderReturnDate')}</span>
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
                  <th className="px-6 py-4">{t('studentHistory.tableHeaderBook')}</th>
                  <th className="px-6 py-4">{t('studentHistory.tableHeaderBorrowDate')}</th>
                  <th className="px-6 py-4">{t('studentHistory.tableHeaderReturnDate')}</th>
                  <th className="px-6 py-4">{t('studentHistory.tableHeaderStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-low">
                {historyBooks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8">
                      <EmptyState
                        icon="history_edu"
                        title={t('studentHistory.emptyTitle')}
                        message={t('studentHistory.emptyDesc')}
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
                        {t('studentHistory.statusReturned')}
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
