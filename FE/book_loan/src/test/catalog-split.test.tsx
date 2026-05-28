import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Catalog from '../pages/student/Catalog';
import type { FormattedBook } from '../types/book';

const { autocompleteBooksMock, fetchBorrowableBooksMock, fetchBooksMock, fetchFavoriteBooksMock } = vi.hoisted(() => ({
  autocompleteBooksMock: vi.fn(),
  fetchBorrowableBooksMock: vi.fn(),
  fetchBooksMock: vi.fn(),
  fetchFavoriteBooksMock: vi.fn(),
}));

const borrowableBook: FormattedBook = {
  id: 7,
  book_id: 7,
  title: 'Borrowable Catalog Book',
  author: 'Library Admin',
  isbn: 'ISBN-7000',
  category: 'Reference',
  genre: 'Reference',
  location: 'Shelf C',
  status: 'San co',
  statusColor: 'bg-green-500',
  cover: 'https://example.com/cover.jpg',
  quantity: 2,
  available_quantity: 2,
  is_available: true,
  is_digital: false,
  is_favorite: false,
  favorite_count: 0,
};

const unavailableBook: FormattedBook = {
  ...borrowableBook,
  id: 8,
  book_id: 8,
  title: 'Queued Catalog Book',
  isbn: 'ISBN-8000',
  status: 'Het sach',
  statusColor: 'bg-tertiary',
  quantity: 2,
  available_quantity: 0,
  is_available: false,
};

const legacyCategoryBook: FormattedBook = {
  ...borrowableBook,
  id: 9,
  book_id: 9,
  title: 'Legacy Free Category Book',
  isbn: 'ISBN-9000',
  category: 'Reference',
  genre: 'Reference',
  location: 'Shelf Z',
};

vi.mock('../api/bookApi', () => ({
  autocompleteBooks: (...args: any[]) => autocompleteBooksMock(...args),
  fetchBooks: (...args: any[]) => fetchBooksMock(...args),
  fetchBorrowableBooks: (...args: any[]) => fetchBorrowableBooksMock(...args),
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    user: { email: '4801104101@student.hcmue.edu.vn' },
    role: 'student',
  }),
}));

vi.mock('../api/borrowApi', () => ({
  requestBorrow: vi.fn(),
  getMyRequests: vi.fn(async () => []),
}));

vi.mock('../api/reservationApi', () => ({
  fetchMyReservations: vi.fn(async () => []),
  reserveBook: vi.fn(),
  cancelReservation: vi.fn(),
}));

vi.mock('../api/reviewApi', () => ({
  fetchBookReviews: vi.fn(async () => ({ data: [] })),
  submitBookReview: vi.fn(),
}));

vi.mock('../api/favoriteApi', () => ({
  fetchFavoriteBooks: () => fetchFavoriteBooksMock(),
  addFavoriteBook: vi.fn(),
  removeFavoriteBook: vi.fn(),
  mergeFavoriteState: (books: FormattedBook[], favorites: FormattedBook[]) => {
    const favoriteIds = new Set(favorites.map((book) => book.id));

    return books.map((book) => ({
      ...book,
      is_favorite: favoriteIds.has(book.id),
      favorite_count: favoriteIds.has(book.id) ? 2 : book.favorite_count,
    }));
  },
}));

vi.mock('../components/LibraryMapModal', () => ({
  default: () => null,
}));

describe('Catalog borrowable split', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads only borrowable books for the student catalog', async () => {
    fetchBorrowableBooksMock.mockResolvedValueOnce({ data: [borrowableBook], meta: { total: 1 } });
    fetchBooksMock.mockResolvedValueOnce([]);
    fetchFavoriteBooksMock.mockResolvedValueOnce([
      { ...borrowableBook, is_favorite: true, favorite_count: 2 },
    ]);

    render(
      <MemoryRouter>
        <Catalog />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchBorrowableBooksMock).toHaveBeenCalled());
    expect(fetchFavoriteBooksMock).toHaveBeenCalled();
    expect(fetchBooksMock).not.toHaveBeenCalled();
    expect(await screen.findByText('Borrowable Catalog Book')).toBeInTheDocument();
    expect(screen.getByLabelText('Bỏ yêu thích Borrowable Catalog Book')).toBeInTheDocument();
    expect(screen.getByText('2 lượt yêu thích')).toBeInTheDocument();
  });

  it('shows fixed library map classifications instead of free-text book categories', async () => {
    fetchBorrowableBooksMock.mockResolvedValueOnce({
      data: [legacyCategoryBook],
      meta: { total: 1 },
    });
    fetchFavoriteBooksMock.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Catalog />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(fetchBorrowableBooksMock).toHaveBeenCalledWith(1, '', 12, 'all', 'title', undefined),
    );

    expect(screen.getAllByRole('button', { name: 'A - Khoa học Tự nhiên' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'C - Công nghệ - Kỹ thuật' })[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reference' })).not.toBeInTheDocument();
  });

  it('waits for Vietnamese IME composition before syncing the search query', async () => {
    fetchBorrowableBooksMock.mockResolvedValue({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 12, total: 0 },
    });
    fetchFavoriteBooksMock.mockResolvedValue([]);
    autocompleteBooksMock.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Catalog />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(fetchBorrowableBooksMock).toHaveBeenCalledWith(1, '', 12, 'all', 'title', undefined),
    );
    fetchBorrowableBooksMock.mockClear();
    vi.useFakeTimers();

    const searchBox = screen.getByRole('searchbox');
    const decomposedQuery = 'Toa\u0301n';
    const normalizedQuery = decomposedQuery.normalize('NFC');

    fireEvent.compositionStart(searchBox);
    fireEvent.change(searchBox, { target: { value: decomposedQuery } });

    await act(async () => {
      vi.advanceTimersByTime(650);
    });

    expect(fetchBorrowableBooksMock).not.toHaveBeenCalled();

    fireEvent.compositionEnd(searchBox, { target: { value: decomposedQuery } });

    await act(async () => {
      vi.advanceTimersByTime(350);
      await Promise.resolve();
    });

    expect(fetchBorrowableBooksMock).toHaveBeenCalledWith(
      1,
      normalizedQuery,
      12,
      'all',
      'title',
      undefined,
    );
  });

  it('opens details for unavailable books so students can reserve them', async () => {
    const user = userEvent.setup();
    fetchBorrowableBooksMock.mockResolvedValueOnce({
      data: [unavailableBook],
      meta: { total: 1 },
    });
    fetchFavoriteBooksMock.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <Catalog />
      </MemoryRouter>,
    );

    await user.click(await screen.findByText('Queued Catalog Book'));

    expect(screen.getAllByText('Queued Catalog Book')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Đặt chỗ trước' })).toBeInTheDocument();
  });
});
