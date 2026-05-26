import { apiRequest } from './client';

export type RewardRecord = {
  id: number;
  code: string;
  name: string;
  description: string;
  points_cost: number;
  benefit_type: string;
  benefit_value: number;
  is_active: boolean;
};

export type MemberRewardRecord = {
  id: number;
  member_id: number;
  reward_id: number;
  status: 'active' | 'used' | 'expired';
  redeemed_at: string;
  expires_at: string | null;
  used_at: string | null;
  reward?: RewardRecord;
};

export type GamifyLogRecord = {
  id: number;
  member_id: number;
  event_type: string;
  xp_gained: number;
  points_changed: number;
  description: string;
  created_at: string;
};

export type GamifyProfile = {
  xp: number;
  points: number;
  level: number;
  daily_streak: number;
  last_check_in_at: string | null;
  active_tickets: MemberRewardRecord[];
  history: GamifyLogRecord[];
};

export type BadgeRecord = {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  requirements: string | null;
  is_earned: boolean;
  earned_at: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  member_id: number;
  name: string;
  level: number;
  xp: number;
  badges_count: number;
};

export type CheckInResponse = {
  message: string;
  xp_gained: number;
  points_gained: number;
  xp: number;
  points: number;
  level: number;
  daily_streak: number;
  last_check_in_at: string | null;
};

export type RedeemResponse = {
  message: string;
  points: number;
  ticket: MemberRewardRecord;
};

export async function fetchGamifyProfile() {
  return apiRequest<GamifyProfile>('/gamify/profile', {
    method: 'GET',
  });
}

export async function submitDailyCheckIn() {
  return apiRequest<CheckInResponse>('/gamify/check-in', {
    method: 'POST',
  });
}

export async function fetchAllBadges() {
  return apiRequest<BadgeRecord[]>('/gamify/badges', {
    method: 'GET',
  });
}

export async function fetchRedeemableRewards() {
  return apiRequest<RewardRecord[]>('/gamify/rewards', {
    method: 'GET',
  });
}

export async function redeemReward(rewardId: number) {
  return apiRequest<RedeemResponse>(`/gamify/rewards/${rewardId}/redeem`, {
    method: 'POST',
  });
}

export async function fetchLeaderboard() {
  return apiRequest<LeaderboardEntry[]>('/gamify/leaderboard', {
    method: 'GET',
  });
}
