import { apiRequest } from './client';
import type { FormattedBook } from '../types/book';

export interface ReservationRecord {
  reservation_id: number;
  member_id: number;
  book_id: number;
  position: number;
  status: 'waiting' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  book?: FormattedBook;
}

export async function fetchMyReservations(): Promise<ReservationRecord[]> {
  return apiRequest<ReservationRecord[]>('/reservations/me');
}

export async function reserveBook(bookId: number): Promise<{
  message: string;
  reservation: ReservationRecord;
}> {
  return apiRequest<{ message: string; reservation: ReservationRecord }>(
    `/reservations/${bookId}`,
    {
      method: 'POST',
    }
  );
}

export async function cancelReservation(reservationId: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/reservations/${reservationId}`, {
    method: 'DELETE',
  });
}
