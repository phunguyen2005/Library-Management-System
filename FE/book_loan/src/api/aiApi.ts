import { apiRequest, API_BASE_URL } from './client';
import { getStoredToken } from '../auth/storage';
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

export async function streamChatMessage(
  message: string,
  history: ChatMessage[] = [],
  onChunk: (text: string) => void
): Promise<void> {
  const formattedHistory = history.map((item) => ({
    sender: item.sender === 'user' ? 'user' : 'model',
    text: item.text,
  }));

  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/ai/chat-stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      history: formattedHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Readable stream not supported');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const lines = event.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.substring(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textChunk) {
                onChunk(textChunk);
              }
            } catch (e) {
              // Might be incomplete JSON or comment
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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

export async function generateAllBooksMetadata() {
  return apiRequest<{ message: string }>('/ai/books/metadata-all', {
    method: 'POST',
  });
}
