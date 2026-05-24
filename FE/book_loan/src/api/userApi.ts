import type { AuthUser, UserRole } from '../auth/storage';
import { apiRequest } from './client';
import type { MemberApiRecord, MemberPayload } from '../types/member';
import type { PaginatedResponse } from '../types/pagination';

type UpdateProfilePayload = {
  name: string;
  phone_number?: string | null;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
  notify_due_soon?: boolean;
  notify_new_books?: boolean;
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

export async function getAllMembers(page = 1, query = '') {
  return apiRequest<PaginatedResponse<MemberApiRecord>>(
    `/members?limit=10&page=${page}&query=${encodeURIComponent(query)}`
  );
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

export async function importMembers(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest<{ message: string; success_count: number; errors: string[] }>('/members/import', {
    method: 'POST',
    body: formData,
  });
}

