import { apiRequest } from './client';
import { normalizeBook, unwrapCollection } from './bookApi';
import type { BookApiRecord, FormattedBook } from '../types/book';
import type { PaginatedResponse } from '../types/pagination';

type FavoriteMutationResponse = {
  message: string;
  book: BookApiRecord;
};

export async function fetchFavoriteBooks(page = 1, perPage = 100) {
  const response = await apiRequest<PaginatedResponse<BookApiRecord> | BookApiRecord[]>(
    `/favorites?page=${page}&per_page=${perPage}`,
  );

  return unwrapCollection(response).map((book) => ({
    ...normalizeBook(book),
    is_favorite: true,
  }));
}

export async function addFavoriteBook(bookId: number) {
  const response = await apiRequest<FavoriteMutationResponse>(`/favorites/${bookId}`, {
    method: 'POST',
  });

  return {
    message: response.message,
    book: normalizeBook(response.book),
  };
}

export async function removeFavoriteBook(bookId: number) {
  const response = await apiRequest<FavoriteMutationResponse>(`/favorites/${bookId}`, {
    method: 'DELETE',
  });

  return {
    message: response.message,
    book: normalizeBook(response.book),
  };
}

export function mergeFavoriteState(
  books: FormattedBook[],
  favorites: FormattedBook[],
): FormattedBook[] {
  const favoriteIds = new Set(favorites.map((book) => book.id));
  const favoriteCounts = new Map(
    favorites.map((book) => [book.id, Number(book.favorite_count ?? 0)]),
  );

  return books.map((book) => ({
    ...book,
    is_favorite: favoriteIds.has(book.id),
    favorite_count: favoriteCounts.get(book.id) ?? book.favorite_count ?? 0,
  }));
}
