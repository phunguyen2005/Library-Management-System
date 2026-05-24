import { apiRequest } from './client';
import { normalizeBook } from './bookApi';
import type { BookApiRecord, FormattedBook } from '../types/book';

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface ChatResponse {
  response: string;
}

export interface RecommendationRecord {
  book: FormattedBook;
  reason: string;
}

interface RawRecommendationRecord {
  book: BookApiRecord;
  reason: string;
}


export async function sendChatMessage(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
  // Convert FE sender format to what BE expects
  const formattedHistory = history.map((item) => ({
    sender: item.sender === 'user' ? 'user' : 'model',
    text: item.text,
  }));

  return apiRequest<ChatResponse>('/ai/chat', {
    method: 'POST',
    body: {
      message,
      history: formattedHistory,
    },
  });
}

export async function fetchAiRecommendations(): Promise<RecommendationRecord[]> {
  const raw = await apiRequest<RawRecommendationRecord[]>('/ai/recommendations');
  return raw.map((item) => ({
    book: normalizeBook(item.book),
    reason: item.reason,
  }));
}

export async function generateBookMetadata(bookId: number) {
  const response = await apiRequest<{ message: string; book: BookApiRecord }>(
    `/ai/books/${bookId}/metadata`,
    { method: 'POST' },
  );

  return {
    message: response.message,
    book: normalizeBook(response.book),
  };
}
