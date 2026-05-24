import { apiRequest } from './client';

export type ReportFilterType = 'day' | 'range' | 'month' | 'year';

export type ReportFilter = {
  filter_type: ReportFilterType;
  /** 'YYYY-MM-DD' for day, 'YYYY-MM-DD,YYYY-MM-DD' for range, 'YYYY-MM' for month, 'YYYY' for year */
  filter_value: string;
} | null;

export type ReportData = {
  monthly_trends: {
    month: string;
    count: number;
  }[];
  return_rates: {
    name: string;
    value: number;
  }[];
  financials: {
    collected: number;
    unpaid: number;
    waived: number;
    by_method: {
      cash: number;
      momo: number;
      vnpay: number;
    };
  };
  revenue_trends: {
    date: string;
    total: number;
  }[];
  recent_transactions: {
    payment_id: number;
    member_name: string;
    member_email: string;
    amount: number;
    method: string;
    transaction_ref: string;
    date: string;
    collected_by: string;
  }[];
  top_books: {
    title: string;
    author: string;
    genre: string;
    borrow_count: number;
  }[];
  top_members: {
    name: string;
    email: string;
    borrow_count: number;
  }[];
  total_books: number;
  total_members: number;
  total_borrowings: number;
};

export async function getReportsData(filter: ReportFilter = null) {
  let url = '/reports';
  if (filter) {
    const params = new URLSearchParams({
      filter_type: filter.filter_type,
      filter_value: filter.filter_value,
    });
    url += '?' + params.toString();
  }
  return apiRequest<ReportData>(url, { method: 'GET' });
}
