import { apiRequest } from './client';

export type FineStatus = 'unpaid' | 'paid' | 'waived' | 'cancelled';
export type FineReason = 'overdue' | 'damaged' | 'lost';
export type FinePaymentMethod = 'cash' | 'momo' | 'vnpay' | 'transfer';

export type FinePaymentEntry = {
  payment_id: number;
  amount_paid: number;
  method: FinePaymentMethod;
  transaction_ref?: string | null;
  status: 'pending' | 'pending_verification' | 'completed' | 'failed' | 'refunded';
  collected_by?: number | null;
  created_at?: string | null;
};

export type FineEntry = {
  fine_id: number;
  loan_id: number;
  member_id: number;
  book_title?: string | null;
  due_date?: string | null;
  return_date?: string | null;
  days_overdue: number;
  amount: string | number;
  reason: FineReason;
  status: FineStatus;
  paid_at?: string | null;
  waived_by?: number | null;
  waived_reason?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  payments?: FinePaymentEntry[];
  member?: {
    member_id: number;
    name: string;
    email?: string | null;
  } | null;
};

export type MyFinesResponse = {
  total_unpaid: number;
  fines: FineEntry[];
};

export type FineSummary = {
  has_unpaid: boolean;
  total_unpaid: number;
  count: number;
};

export type AdminFineFilters = {
  status?: FineStatus | '';
  member_id?: string;
  date_from?: string;
  date_to?: string;
  query?: string;
  page?: number;
  per_page?: number;
};

export type AdminFinesResponse = {
  data: FineEntry[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type FineStatistics = {
  total_collected: number;
  total_unpaid: number;
  total_waived: number;
  this_month_collected: number;
  by_month: {
    month: string;
    collected: number;
    unpaid: number;
    waived: number;
  }[];
};

function buildQuery(filters: AdminFineFilters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getMyFines() {
  return apiRequest<MyFinesResponse>('/fines/me', {
    method: 'GET',
  });
}

export async function getFineSummary() {
  return apiRequest<FineSummary>('/fines/me/summary', {
    method: 'GET',
  });
}

export async function getAdminFines(filters: AdminFineFilters = {}) {
  return apiRequest<AdminFinesResponse>(`/admin/fines${buildQuery(filters)}`, {
    method: 'GET',
  });
}

export async function getFineStatistics() {
  return apiRequest<FineStatistics>('/admin/fines/statistics', {
    method: 'GET',
  });
}

export async function payFine(
  fineId: number,
  payload: { method?: FinePaymentMethod; note?: string; transaction_ref?: string } = {},
) {
  return apiRequest<{ message: string; fine: FineEntry }>(`/fines/${fineId}/pay`, {
    method: 'POST',
    body: {
      method: payload.method ?? 'cash',
      note: payload.note,
      transaction_ref: payload.transaction_ref,
    },
  });
}

export async function waiveFine(fineId: number, reason: string) {
  return apiRequest<{ message: string; fine: FineEntry }>(`/fines/${fineId}/waive`, {
    method: 'POST',
    body: { reason },
  });
}

export async function applyFineWaiver(fineId: number, ticketId?: number) {
  return apiRequest<{ message: string; fine: FineEntry }>(`/fines/${fineId}/apply-waiver`, {
    method: 'POST',
    body: ticketId ? { ticket_id: ticketId } : undefined,
  });
}

export type InitiateMomoResponse = {
  message: string;
  simulation: boolean;
  payment_id: number;
  payUrl: string;
};

export type MomoPaymentStatusResponse = {
  payment_id: number;
  fine_id: number;
  status: 'pending' | 'pending_verification' | 'completed' | 'failed' | 'refunded';
  amount: number;
  method: string;
};


export async function initiateMomoPayment(fineId: number) {
  return apiRequest<InitiateMomoResponse>(`/fines/${fineId}/momo/pay`, {
    method: 'POST',
  });
}

export async function initiateVnpayPayment(fineId: number) {
  return apiRequest<{
    message: string;
    simulation: boolean;
    payment_id: number;
    payUrl: string;
  }>(`/fines/${fineId}/vnpay/pay`, {
    method: 'POST',
  });
}

export async function getMomoPaymentStatus(paymentId: number) {
  return apiRequest<MomoPaymentStatusResponse>(`/fines/payments/${paymentId}/status`, {
    method: 'GET',
  });
}

export async function simulateMomoPayment(paymentId: number, status: 'completed' | 'failed') {
  return apiRequest<{ message: string }>('/momo/simulate-ipn', {
    method: 'POST',
    body: { payment_id: paymentId, status },
  });
}

export async function simulateVnpayPayment(paymentId: number, status: 'completed' | 'failed') {
  return apiRequest<{ message: string }>('/vnpay/simulate-ipn', {
    method: 'POST',
    body: { payment_id: paymentId, status },
  });
}

export type CreateFinePayload = {
  member_id: number;
  loan_id?: number | null;
  amount: number;
  reason: FineReason;
  notes?: string | null;
};

export async function createFine(payload: CreateFinePayload) {
  return apiRequest<{ message: string; fine: FineEntry }>('/admin/fines', {
    method: 'POST',
    body: payload,
  });
}


