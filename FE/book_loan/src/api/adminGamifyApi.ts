import { apiRequest } from './client';
import type { RewardRecord, MemberRewardRecord, BadgeRecord } from './gamifyApi';

export type MemberGamifyDetails = {
  xp: number;
  points: number;
  level: number;
  daily_streak: number;
  last_check_in_at: string | null;
  badges: BadgeRecord[];
  tickets: MemberRewardRecord[];
};

export async function getAdminRewards() {
  return apiRequest<RewardRecord[]>('/admin/rewards', {
    method: 'GET',
  });
}

export async function createAdminReward(data: {
  code: string;
  name: string;
  description: string;
  points_cost: number;
  benefit_type: 'loan_limit' | 'loan_duration' | 'fine_waiver';
  benefit_value: number;
  is_active: boolean;
}) {
  return apiRequest<{ message: string; reward: RewardRecord }>('/admin/rewards', {
    method: 'POST',
    body: data,
  });
}

export async function updateAdminReward(
  rewardId: number,
  data: {
    code: string;
    name: string;
    description: string;
    points_cost: number;
    benefit_type: 'loan_limit' | 'loan_duration' | 'fine_waiver';
    benefit_value: number;
    is_active: boolean;
  }
) {
  return apiRequest<{ message: string; reward: RewardRecord }>(`/admin/rewards/${rewardId}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deleteAdminReward(rewardId: number) {
  return apiRequest<{ message: string }>(`/admin/rewards/${rewardId}`, {
    method: 'DELETE',
  });
}

export async function getMemberGamifyInfo(memberId: number) {
  return apiRequest<MemberGamifyDetails>(`/admin/members/${memberId}/gamification`, {
    method: 'GET',
  });
}

export async function syncMemberBadges(memberId: number, badgeIds: number[]) {
  return apiRequest<{ message: string; badges_count: number }>(`/admin/members/${memberId}/badges`, {
    method: 'POST',
    body: { badge_ids: badgeIds },
  });
}

export async function grantMemberReward(memberId: number, data: { reward_id: number; expires_at?: string | null }) {
  return apiRequest<{ message: string; ticket: MemberRewardRecord }>(`/admin/members/${memberId}/rewards`, {
    method: 'POST',
    body: data,
  });
}

export async function updateMemberReward(ticketId: number, data: { status: 'active' | 'used' | 'expired'; expires_at?: string | null }) {
  return apiRequest<{ message: string; ticket: MemberRewardRecord }>(`/admin/members/rewards/${ticketId}`, {
    method: 'PUT',
    body: data,
  });
}

export async function deleteMemberReward(ticketId: number) {
  return apiRequest<{ message: string }>(`/admin/members/rewards/${ticketId}`, {
    method: 'DELETE',
  });
}
