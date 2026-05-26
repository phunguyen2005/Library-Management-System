import { apiRequest } from './client';
import type {
  BookApiRecord,
  DigitalDocument as DigitalDocumentType,
  FormattedBook,
} from '../types/book';
import { getCoverUrl } from '../lib/display';
import { normalizePhysicalCategory, normalizePhysicalLocation } from '../lib/bookClassification';
import type { PaginatedResponse } from '../types/pagination';
import i18n from '../i18n';

export type { DigitalDocument } from '../types/book';

export type BookPayload = {
  title: string;
  author: string;
  category?: string;
  genre?: string;
  published_year?: number;
  location?: string;
  cover?: string;
  quantity?: number;
  is_digital?: boolean;
  resource_type?: string;
  file_format?: string;
  file_size?: string;
  file_path?: string;
  file_url?: string;
};

function toStatusColor(isAvailable: boolean) {
  return isAvailable ? 'bg-green-500' : 'bg-tertiary';
}

function toStatus(isAvailable: boolean) {
  return isAvailable ? i18n.t('status.available') : i18n.t('status.unavailable');
}

export function normalizeBook(book: BookApiRecord): FormattedBook {
  const availableQuantity = Number(book.available_quantity ?? 0);
  const totalQuantity = Number(book.total_quantity ?? 0);
  const isAvailable = Boolean(book.is_available) && availableQuantity > 0;
  const isDigital = Boolean(book.is_digital);
  const category = isDigital
    ? book.genre || 'Khac'
    : normalizePhysicalCategory(book.genre);
  const location = isDigital
    ? book.location || 'Khu A'
    : normalizePhysicalLocation(category, book.location);

  return {
    id: book.book_id,
    book_id: book.book_id,
    title: book.title,
    author: book.author,
    isbn: `ISBN-${book.book_id}000`,
    category,
    genre: category,
    location,
    status: toStatus(isAvailable),
    statusKey: isAvailable ? 'available' : 'unavailable',
    statusColor: toStatusColor(isAvailable),
    cover: getCoverUrl(book.cover),
    quantity: totalQuantity || 0,
    available_quantity: availableQuantity,
    published_year: book.published_year || undefined,
    is_available: isAvailable,
    is_digital: isDigital,
    resource_type: book.resource_type || null,
    file_format: book.file_format || null,
    file_size: book.file_size || null,
    has_digital_file: Boolean(book.has_digital_file),
    digital_file_name: book.digital_file_name || null,
    download_count: Number(book.download_count ?? 0),
    favorite_count: Number(book.favorite_count ?? 0),
    is_favorite: Boolean(book.is_favorite),
    avg_rating: Number(book.avg_rating ?? 0),
    reviews_count: Number(book.reviews_count ?? 0),
    ai_summary: book.ai_summary || null,
    ai_tags: Array.isArray(book.ai_tags) ? book.ai_tags : [],
    ai_summary_generated_at: book.ai_summary_generated_at || null,
  };
}

export function unwrapCollection<T>(payload: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && 'data' in payload && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

export async function fetchBooks(page = 1, query = '', limit = 10) {
  const data = await apiRequest<PaginatedResponse<BookApiRecord>>(
    `/books?limit=${limit}&page=${page}&query=${encodeURIComponent(query)}`
  );
  return {
    ...data,
    data: data.data.map(normalizeBook),
  };
}

export async function fetchBorrowableBooks(page = 1, query = '', limit = 10) {
  const data = await apiRequest<PaginatedResponse<BookApiRecord>>(
    `/books?is_digital=false&limit=${limit}&page=${page}&query=${encodeURIComponent(query)}`
  );
  return {
    ...data,
    data: data.data.map(normalizeBook),
  };
}

export async function fetchDigitalResourceBooks(page = 1, query = '', limit = 10) {
  const data = await apiRequest<PaginatedResponse<BookApiRecord>>(
    `/books?is_digital=true&limit=${limit}&page=${page}&query=${encodeURIComponent(query)}`
  );
  return {
    ...data,
    data: data.data.map(normalizeBook),
  };
}

export async function searchBooks(query: string, page = 1, limit = 10) {
  const data = await apiRequest<PaginatedResponse<BookApiRecord>>(
    `/books?query=${encodeURIComponent(query)}&limit=${limit}&page=${page}`
  );
  return {
    ...data,
    data: data.data.map(normalizeBook),
  };
}

export async function addBook(payload: BookPayload) {
  const book = await apiRequest<BookApiRecord>('/books', {
    method: 'POST',
    body: {
      ...payload,
      genre: payload.genre || payload.category,
    },
  });

  return normalizeBook(book);
}

export async function addBorrowableBook(payload: BookPayload) {
  return addBook({
    ...payload,
    is_digital: false,
    resource_type: undefined,
    file_format: undefined,
    file_size: undefined,
    file_path: undefined,
    file_url: undefined,
  });
}

export async function addDigitalResource(payload: BookPayload) {
  return addBook({
    ...payload,
    is_digital: true,
    quantity: 0,
    location: payload.location || undefined,
    file_url: undefined,
  });
}

export async function updateBook(bookId: number, payload: BookPayload) {
  const book = await apiRequest<BookApiRecord>(`/books/${bookId}`, {
    method: 'PUT',
    body: {
      ...payload,
      genre: payload.genre || payload.category,
    },
  });

  return normalizeBook(book);
}

export async function updateBorrowableBook(bookId: number, payload: BookPayload) {
  return updateBook(bookId, {
    ...payload,
    is_digital: false,
    resource_type: undefined,
    file_format: undefined,
    file_size: undefined,
    file_path: undefined,
    file_url: undefined,
  });
}

export async function updateDigitalResource(bookId: number, payload: BookPayload) {
  return updateBook(bookId, {
    ...payload,
    is_digital: true,
    location: payload.location || undefined,
    file_url: undefined,
  });
}

export async function uploadDigitalFile(bookId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const book = await apiRequest<BookApiRecord>(`/books/${bookId}/digital-file`, {
    method: 'POST',
    body: formData,
  });

  return normalizeBook(book);
}

export async function deleteBook(bookId: number) {
  return apiRequest<{ message: string }>(`/books/${bookId}`, {
    method: 'DELETE',
  });
}

export async function fetchDigitalDocuments() {
  const response = await apiRequest<PaginatedResponse<BookApiRecord> | BookApiRecord[]>(
    '/digital-documents'
  );

  const data = unwrapCollection(response);

  return data.map((book) => {
    const format = (book.file_format || 'PDF').toUpperCase();

    return {
      id: book.book_id,
      title: book.title,
      author: book.author,
      type: book.resource_type || book.genre || 'Tài liệu',
      format,
      size: book.file_size || 'N/A',
      color:
        format === 'PDF'
          ? 'bg-red-500'
          : format === 'EPUB'
            ? 'bg-blue-500'
            : format === 'AUDIO'
              ? 'bg-purple-500'
              : format === 'SLIDES'
                ? 'bg-orange-500'
                : 'bg-primary',
      cover: getCoverUrl(book.cover),
      downloads: Number(book.download_count ?? 0),
      openUrl: book.open_url || null,
      downloadUrl: book.download_url || book.open_url || null,
      hasAttachedFile: Boolean(book.has_attached_file),
      aiSummary: book.ai_summary || null,
      aiTags: Array.isArray(book.ai_tags) ? book.ai_tags : [],
      aiSummaryGeneratedAt: book.ai_summary_generated_at || null,
      readingProgress: null,
    } satisfies DigitalDocumentType;
  });
}

export async function autocompleteBooks(q: string) {
  return apiRequest<BookApiRecord[]>(`/books/autocomplete?q=${encodeURIComponent(q)}`, {
    auth: false,
    method: 'GET',
  }).then(books => books.map(normalizeBook));
}

export async function importBooks(file: File, options?: { dry_run?: boolean; allow_partial?: boolean; column_mapping?: string }) {
  const formData = new FormData();
  formData.append('file', file);
  if (options) {
    if (options.dry_run !== undefined) formData.append('dry_run', options.dry_run ? '1' : '0');
    if (options.allow_partial !== undefined) formData.append('allow_partial', options.allow_partial ? '1' : '0');
    if (options.column_mapping !== undefined) formData.append('column_mapping', options.column_mapping);
  }
  return apiRequest<{ message: string; success_count: number; errors: string[] }>('/books/import', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchBookDetail(bookId: number): Promise<FormattedBook> {
  const book = await apiRequest<BookApiRecord>(`/books/${bookId}`);
  return normalizeBook(book);
}
