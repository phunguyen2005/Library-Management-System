import { apiRequest } from './client';

export type LibrarySettings = {
  loan_period_days: number;
  max_active_loans: number;
  fine_per_day: number;
  max_fine_per_loan: number;
  grace_period_days: number;
  room_max_hours_per_booking: number;
  room_max_hours_per_week: number;
  room_max_bookings_per_day: number;
  room_advance_booking_days: number;
  room_min_group_size: number;
  room_checkin_window_minutes: number;
  room_booking_requires_approval: boolean;
  room_open_time: string;
  room_close_time: string;
  room_cancel_deadline_hours: number;
  updated_at?: string | null;
};

export type LibrarySettingsPayload = {
  loan_period_days: number;
  max_active_loans: number;
  fine_per_day: number;
  max_fine_per_loan: number;
  grace_period_days: number;
  room_max_hours_per_booking: number;
  room_max_hours_per_week: number;
  room_max_bookings_per_day: number;
  room_advance_booking_days: number;
  room_min_group_size: number;
  room_checkin_window_minutes: number;
  room_booking_requires_approval: boolean;
  room_open_time: string;
  room_close_time: string;
  room_cancel_deadline_hours: number;
};

export async function fetchLibrarySettings() {
  return apiRequest<LibrarySettings>('/library-settings');
}

export async function updateLibrarySettings(payload: LibrarySettingsPayload) {
  return apiRequest<LibrarySettings>('/library-settings', {
    method: 'PUT',
    body: payload,
  });
}
