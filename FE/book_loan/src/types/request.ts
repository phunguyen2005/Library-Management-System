export type BorrowStatus = 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected' | 'cancelled';
export type DueStatus = 'none' | 'due_today' | 'due_soon' | 'overdue' | 'active' | 'returned';

export interface BorrowRequestListItem {
  id: number;
  name: string;
  role: string;
  roleColor: string;
  code: string;
  book: string;
  bookCode: string;
  status: string;
  date: string;
  requested_at?: string;
  due_date?: string | null;
  return_date?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
  due_status?: DueStatus;
  raw_status: BorrowStatus;
  fine?: {
    fine_id: number;
    amount: number;
    reason?: string;
    status: 'unpaid' | 'paid' | 'waived' | 'cancelled';
    paid_at?: string | null;
    waived_by?: number | null;
    waived_reason?: string | null;
  } | null;
}

export interface MemberBorrowRequest {
  id: number;
  book_id?: number;
  bookTitle: string;
  author: string;
  cover?: string | null;
  category?: string | null;
  status: BorrowStatus;
  borrow_date?: string;
  due_date?: string | null;
  return_date?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
  due_status?: DueStatus;
  is_reviewed?: boolean;
  fine?: {
    fine_id: number;
    amount: number;
    reason?: string;
    status: 'unpaid' | 'paid' | 'waived' | 'cancelled';
    paid_at?: string | null;
    waived_by?: number | null;
    waived_reason?: string | null;
  } | null;
}
