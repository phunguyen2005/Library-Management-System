import { apiRequest } from './client';
import type { ReadingProgressRecord } from '../types/book';

type ReadingProgressResponse = {
  message?: string;
  progress: ReadingProgressRecord | null;
};

export async function fetchReadingProgress() {
  return apiRequest<ReadingProgressRecord[]>('/reading-progress');
}

export async function fetchBookReadingProgress(bookId: number) {
  const response = await apiRequest<ReadingProgressResponse>(`/reading-progress/${bookId}`);
  return response.progress;
}

export async function syncReadingProgress(
  bookId: number,
  payload: { current_page: number; total_pages: number },
) {
  const response = await apiRequest<ReadingProgressResponse>(`/reading-progress/${bookId}`, {
    method: 'PUT',
    body: payload,
  });

  return response.progress;
}
