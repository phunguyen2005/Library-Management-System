import { apiRequest } from './client';

export type AppNotification = {
  id: string;
  type: string;
  notifiable_type: string;
  notifiable_id: number;
  data: {
    type: string;
    message: string;
    book_title?: string;
    borrowing_id?: string;
    status_type?: string;
    book_id?: string;
    due_date?: string;
  };
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export async function getNotifications(page = 1, limit = 15) {
  return apiRequest<PaginatedResponse<AppNotification>>(`/notifications?page=${page}&limit=${limit}`);
}

export async function markNotificationAsRead(id: string) {
  return apiRequest<{ message: string }>(`/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllNotificationsAsRead() {
  return apiRequest<{ message: string }>('/notifications/read-all', {
    method: 'POST',
  });
}
