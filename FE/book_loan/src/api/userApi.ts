import type { AuthUser, UserRole } from '../auth/storage';
import { apiRequest } from './client';
import type { MemberApiRecord, MemberPayload } from '../types/member';

type PaginatedResponse<T> = {
  data: T[];
};

type UpdateProfilePayload = {
  name: string;
  phone_number?: string | null;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
};

type MeResponse = {
  user: AuthUser;
  role: UserRole;
};

type UpdateProfileResponse = {
  message: string;
  user: AuthUser;
  role: UserRole;
};

function unwrapCollection<T>(payload: T[] | PaginatedResponse<T>) {
  return Array.isArray(payload) ? payload : payload.data;
}

export async function getAllMembers() {
  const data = await apiRequest<MemberApiRecord[] | PaginatedResponse<MemberApiRecord>>(
    '/members?limit=1000'
  );

  return unwrapCollection(data);
}

export async function createMember(payload: MemberPayload) {
  return apiRequest<MemberApiRecord>('/members', {
    method: 'POST',
    body: payload,
  });
}

export async function updateMember(memberId: number, payload: MemberPayload) {
  return apiRequest<MemberApiRecord>(`/members/${memberId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteMember(memberId: number) {
  return apiRequest<{ message: string }>(`/members/${memberId}`, {
    method: 'DELETE',
  });
}

export async function getMyProfile() {
  return apiRequest<MeResponse>('/me');
}

export async function updateMyProfile(payload: UpdateProfilePayload) {
  return apiRequest<UpdateProfileResponse>('/me', {
    method: 'PUT',
    body: payload,
  });
}
