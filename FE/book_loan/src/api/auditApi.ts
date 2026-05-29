import { apiRequest } from './client';

export type AuditLogEntry = {
  log_id: number;
  user_id: number | null;
  user_type: string; // 'Sinh viên' | 'Thủ thư' | 'Hệ thống'
  raw_user_type: string; // 'student' | 'admin' | 'unknown'
  user_name: string;
  user_email: string | null;
  action: string;
  raw_action: string;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type PaginatedAuditLogs = {
  data: AuditLogEntry[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

export async function getAuditLogs(params?: {
  page?: number;
  limit?: number;
  user_type?: string;
  action?: string;
  query?: string;
  user_query?: string;
  date?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.user_type) queryParams.append('user_type', params.user_type);
  if (params?.action) queryParams.append('action', params.action);
  if (params?.query) queryParams.append('query', params.query);
  if (params?.user_query) queryParams.append('user_query', params.user_query);
  if (params?.date) queryParams.append('date', params.date);

  const queryStr = queryParams.toString();
  return apiRequest<PaginatedAuditLogs>(`/audit-logs${queryStr ? '?' + queryStr : ''}`, {
    method: 'GET',
  });
}
