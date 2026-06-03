export interface MemberApiRecord {
  member_id: number;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  join_date?: string | null;
  xp?: number;
  points?: number;
  level?: number;
  daily_streak?: number;
  badges_count?: number;
  is_disabled?: boolean;
}

export interface MemberListItem {
  id: number;
  name: string;
  dept: string;
  type: string;
  email: string;
  phoneNumber: string;
  joinDate: string;
  status: string;
  statusColor: string;
  xp: number;
  points: number;
  level: number;
  dailyStreak: number;
  badgesCount: number;
  isDisabled: boolean;
}

export type MemberPayload = {
  name: string;
  email: string;
  phone_number?: string | null;
  join_date?: string | null;
  password?: string;
  password_confirmation?: string;
  level?: number;
  xp?: number;
  points?: number;
  daily_streak?: number;
};

