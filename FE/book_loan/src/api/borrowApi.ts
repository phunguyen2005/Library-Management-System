import { apiRequest } from './client';
import type { BorrowRequestListItem, DueStatus, MemberBorrowRequest } from '../types/request';
import i18n from '../i18n';

export type { BorrowRequestListItem as BorrowRequest, MemberBorrowRequest as MemberRequest } from '../types/request';

type PaginatedResponse<T> = {
  data: T[];
};

type BorrowingResource = {
  loan_id: number;
  book_id: number;
  member_id: number;
  librarian_id?: number | null;
  status: string;
  rejection_reason?: string | null;
  rejected_at?: string | null;
  borrow_date?: string | null;
  due_date?: string | null;
  return_date?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
  due_status?: DueStatus;
  is_reviewed?: boolean;
  book?: {
    book_id: number;
    title: string;
    author: string;
    genre?: string | null;
    cover?: string | null;
  } | null;
  member?: {
    member_id: number;
    name: string;
    email?: string | null;
  } | null;
  fine?: {
    fine_id: number;
    amount: number;
    reason?: string;
    status: 'unpaid' | 'paid' | 'waived' | 'cancelled';
    paid_at?: string | null;
    waived_by?: number | null;
    waived_reason?: string | null;
  } | null;
};

export type AdminRequestFilters = {
  query?: string;
  status?: string;
  member_id?: number;
};

export type BookCondition = 'good' | 'damaged' | 'lost';

function unwrapCollection<T>(payload: T[] | PaginatedResponse<T>) {
  return Array.isArray(payload) ? payload : payload.data;
}

function toStatusLabel(status: string) {
  if (status === 'pending') return i18n.t('status.pending');
  if (status === 'approved') return i18n.t('status.approved');
  if (status === 'borrowed') return i18n.t('status.borrowed');
  if (status === 'returned') return i18n.t('status.returned');
  if (status === 'rejected') return i18n.t('status.rejected');
  if (status === 'cancelled') return i18n.t('status.cancelled');
  return status;
}

function toRoleColor() {
  return 'bg-primary-container text-primary';
}

function toDateLabel(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function mapBorrowingToAdminItem(item: BorrowingResource): BorrowRequestListItem {
  return {
    id: item.loan_id,
    name: item.member?.name || 'Không rõ',
    role: 'SV',
    roleColor: toRoleColor(),
    code: String(item.member?.member_id ?? item.member_id),
    book: item.book?.title || 'Không rõ',
    bookCode: String(item.book?.book_id ?? item.book_id),
    status: toStatusLabel(item.status),
    date: toDateLabel(item.rejected_at || item.return_date || item.due_date || item.borrow_date),
    requested_at: item.borrow_date || undefined,
    due_date: item.due_date || null,
    return_date: item.return_date || null,
    rejected_at: item.rejected_at || null,
    rejection_reason: item.rejection_reason || null,
    is_overdue: Boolean(item.is_overdue),
    days_overdue: Number(item.days_overdue ?? 0),
    due_status: item.due_status,
    raw_status: item.status as BorrowRequestListItem['raw_status'],
    fine: item.fine || null,
  };
}

function mapBorrowingToMemberItem(item: BorrowingResource): MemberBorrowRequest {
  return {
    id: item.loan_id,
    book_id: item.book_id,
    bookTitle: item.book?.title || 'Không rõ',
    author: item.book?.author || 'Không rõ',
    cover: item.book?.cover || null,
    category: item.book?.genre || null,
    status: item.status as MemberBorrowRequest['status'],
    borrow_date: item.borrow_date || undefined,
    due_date: item.due_date || null,
    return_date: item.return_date || null,
    rejected_at: item.rejected_at || null,
    rejection_reason: item.rejection_reason || null,
    is_overdue: Boolean(item.is_overdue),
    days_overdue: Number(item.days_overdue ?? 0),
    due_status: item.due_status,
    is_reviewed: Boolean(item.is_reviewed),
    fine: item.fine || null,
  };
}

export async function requestBorrow(bookId: number) {
  return apiRequest<{ message: string; loan: BorrowingResource }>('/requests', {
    method: 'POST',
    body: { book_id: bookId },
  });
}

export async function getMyRequests() {
  const data = await apiRequest<PaginatedResponse<BorrowingResource> | BorrowingResource[]>(
    '/requests/me?limit=1000',
  );

  return unwrapCollection(data).map(mapBorrowingToMemberItem);
}

export async function getAllRequests(filters?: AdminRequestFilters) {
  const params = new URLSearchParams({ limit: '1000' });
  if (filters?.query) params.set('query', filters.query);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.member_id) params.set('member_id', String(filters.member_id));

  const data = await apiRequest<PaginatedResponse<BorrowingResource> | BorrowingResource[]>(
    `/requests?${params.toString()}`,
  );

  return unwrapCollection(data).map(mapBorrowingToAdminItem);
}

export async function approveBorrow(loanId: number) {
  return apiRequest<{ message: string; loan: BorrowingResource }>(
    `/requests/${loanId}/approve`,
    {
      method: 'POST',
    },
  );
}

export async function confirmPickup(loanId: number) {
  return apiRequest<{ message: string; loan: BorrowingResource }>(
    `/requests/${loanId}/confirm-pickup`,
    {
      method: 'POST',
    },
  );
}

export async function rejectBorrow(loanId: number, reason: string) {
  return apiRequest<{ message: string; loan: BorrowingResource }>(
    `/requests/${loanId}/reject`,
    {
      method: 'POST',
      body: { reason },
    },
  );
}

export async function cancelBorrow(loanId: number) {
  return apiRequest<{ message: string; loan: BorrowingResource }>(
    `/requests/${loanId}/cancel`,
    {
      method: 'DELETE',
    },
  );
}

export async function returnBook(loanId: number, condition: BookCondition = 'good', conditionNote?: string) {
  return apiRequest<{ message: string; loan: BorrowingResource }>(
    `/requests/${loanId}/return`,
    {
      method: 'POST',
      body: { condition, condition_note: conditionNote ?? null },
    },
  );
}

export async function extendLoan(loanId: number, extraDays: number) {
  return apiRequest<{ message: string; loan: BorrowingResource; new_due_date: string }>(
    `/requests/${loanId}/extend`,
    {
      method: 'PATCH',
      body: { extra_days: extraDays },
    },
  );
}

export async function completeBookRepair(bookId: number) {
  return apiRequest<{ message: string; book: any }>(
    `/books/${bookId}/complete-repair`,
    {
      method: 'POST',
    },
  );
}
