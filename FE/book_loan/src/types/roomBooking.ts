export type RoomStatus = 'active' | 'maintenance' | 'closed';
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'no_show';

export type Room = {
  room_id: number;
  name: string;
  capacity: number;
  location: string;
  amenities: string[];
  status: RoomStatus;
  is_active: boolean;
  description: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RoomBooking = {
  booking_id: number;
  room_id: number;
  member_id: number;
  date: string; // Y-m-d
  start_time: string; // H:i:s
  end_time: string; // H:i:s
  purpose: string | null;
  group_size: number;
  status: BookingStatus;
  rejection_reason: string | null;
  approved_by: number | null;
  check_in_at: string | null;
  check_out_at: string | null;
  booking_code: string;
  created_at: string;
  updated_at?: string;
  room?: Room;
  member?: {
    member_id: number;
    name: string;
    email: string;
  };
};

export type RoomScheduleSlot = {
  booking_id: number;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  date: string;
};

export type RoomBookingStats = {
  total_bookings: number;
  pending_count: number;
  approved_count: number;
  completed_count: number;
  no_show_count: number;
  cancelled_count: number;
  most_popular_room: {
    room_id: number;
    name: string;
    count: number;
  } | null;
  usage_rate: number;
};
