import { apiRequest } from './client';
import { Room, RoomBooking, RoomBookingStats, RoomScheduleSlot } from '../types/roomBooking';
import { PaginatedResponse } from '../types/pagination';

// Public/Common Room endpoints
export async function fetchRooms(params?: { status?: string; is_active?: boolean; capacity?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
  if (params?.capacity) query.append('capacity', String(params.capacity));
  
  const queryString = query.toString();
  return apiRequest<Room[]>(`/rooms${queryString ? `?${queryString}` : ''}`);
}

export async function fetchRoom(roomId: number) {
  return apiRequest<Room>(`/rooms/${roomId}`);
}

export async function fetchRoomSchedule(roomId: number, dateFrom: string, dateTo?: string) {
  const query = new URLSearchParams({ date_from: dateFrom });
  if (dateTo) query.append('date_to', dateTo);
  return apiRequest<RoomScheduleSlot[]>(`/rooms/${roomId}/schedule?${query.toString()}`);
}

// Student booking endpoints
export async function createRoomBooking(payload: {
  room_id: number;
  date: string;
  start_time: string;
  end_time: string;
  purpose?: string;
  group_size: number;
  is_walkin?: boolean;
  member_id?: number;
}) {
  return apiRequest<RoomBooking>('/room-bookings', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchMyRoomBookings(params?: { status?: string; page?: number; per_page?: number }) {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  if (params?.per_page) query.append('per_page', String(params.per_page));

  const queryString = query.toString();
  return apiRequest<PaginatedResponse<RoomBooking>>(`/room-bookings/me${queryString ? `?${queryString}` : ''}`);
}

export async function cancelRoomBooking(bookingId: number) {
  return apiRequest<{ message: string; booking: RoomBooking }>(`/room-bookings/${bookingId}/cancel`, {
    method: 'DELETE',
  });
}

export async function checkInRoomBooking(bookingCode: string) {
  return apiRequest<{ message: string; booking: RoomBooking }>('/admin/room-bookings/check-in-code', {
    method: 'POST',
    body: { booking_code: bookingCode },
  });
}

export async function checkOutRoomBooking(bookingId: number) {
  return apiRequest<{ message: string; booking: RoomBooking }>(`/room-bookings/${bookingId}/check-out`, {
    method: 'POST',
  });
}

// Admin room booking endpoints
export async function fetchAllRoomBookings(params?: {
  status?: string;
  room_id?: number;
  date?: string;
  search?: string;
  page?: number;
  per_page?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.room_id) query.append('room_id', String(params.room_id));
  if (params?.date) query.append('date', params.date);
  if (params?.search) query.append('search', params.search);
  if (params?.page) query.append('page', String(params.page));
  if (params?.per_page) query.append('per_page', String(params.per_page));

  const queryString = query.toString();
  return apiRequest<PaginatedResponse<RoomBooking>>(`/admin/room-bookings${queryString ? `?${queryString}` : ''}`);
}

export async function approveRoomBooking(bookingId: number) {
  return apiRequest<RoomBooking>(`/admin/room-bookings/${bookingId}/approve`, {
    method: 'POST',
  });
}

export async function rejectRoomBooking(bookingId: number, reason: string) {
  return apiRequest<RoomBooking>(`/admin/room-bookings/${bookingId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

export async function adminCheckInRoomBooking(bookingId: number) {
  return apiRequest<{ message: string; booking: RoomBooking }>(`/admin/room-bookings/${bookingId}/check-in`, {
    method: 'POST',
  });
}

export async function adminCheckOutRoomBooking(bookingId: number) {
  return apiRequest<{ message: string; booking: RoomBooking }>(`/admin/room-bookings/${bookingId}/check-out`, {
    method: 'POST',
  });
}

export async function adminCancelCheckInRoomBooking(bookingId: number) {
  return apiRequest<{ message: string; booking: RoomBooking }>(`/admin/room-bookings/${bookingId}/cancel-check-in`, {
    method: 'POST',
  });
}

export async function fetchRoomBookingStats(startDate?: string, endDate?: string) {
  const query = new URLSearchParams();
  if (startDate) query.append('start_date', startDate);
  if (endDate) query.append('end_date', endDate);
  const queryString = query.toString();
  return apiRequest<RoomBookingStats>(`/admin/room-bookings/statistics${queryString ? `?${queryString}` : ''}`);
}

// Admin Room CRUD
export async function createRoom(payload: {
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  status?: string;
  description?: string;
}) {
  return apiRequest<Room>('/rooms', {
    method: 'POST',
    body: payload,
  });
}

export async function updateRoom(roomId: number, payload: Partial<Room>) {
  return apiRequest<Room>(`/rooms/${roomId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteRoom(roomId: number) {
  return apiRequest<{ message: string }>(`/rooms/${roomId}`, {
    method: 'DELETE',
  });
}
