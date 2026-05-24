import { apiRequest } from './client';
import type { PaginatedResponse } from '../types/pagination';

export type LibrarianApiRecord = {
  librarian_id: number;
  name: string;
  email: string;
  phone_number?: string | null;
  hire_date?: string | null;
  role?: string;
  permissions?: string[];
};

export type LibrarianPayload = {
  name: string;
  email: string;
  phone_number?: string | null;
  hire_date?: string | null;
  password?: string;
  password_confirmation?: string;
  role?: string;
  permissions?: string[];
};

export async function getAllLibrarians(page = 1, query = '') {
  return apiRequest<PaginatedResponse<LibrarianApiRecord>>(
    `/librarians?limit=10&page=${page}&query=${encodeURIComponent(query)}`
  );
}

export async function createLibrarian(payload: LibrarianPayload) {
  return apiRequest<LibrarianApiRecord>('/librarians', {
    method: 'POST',
    body: payload,
  });
}

export async function updateLibrarian(librarianId: number, payload: LibrarianPayload) {
  return apiRequest<LibrarianApiRecord>(`/librarians/${librarianId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteLibrarian(librarianId: number) {
  return apiRequest<{ message: string }>(`/librarians/${librarianId}`, {
    method: 'DELETE',
  });
}
