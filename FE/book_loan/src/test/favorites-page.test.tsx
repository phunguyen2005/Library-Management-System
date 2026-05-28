import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Favorites from '../pages/student/Favorites';
import type { FormattedBook } from '../types/book';

const { fetchFavoriteBooksMock } = vi.hoisted(() => ({
  fetchFavoriteBooksMock: vi.fn(),
}));

const favoriteBook: FormattedBook = {
  id: 9,
  book_id: 9,
  title: 'Clean Architecture',
  author: 'Robert C. Martin',
  isbn: 'ISBN-9000',
  category: 'Software',
  genre: 'Software',
  location: 'Shelf F',
  status: 'San co',
  statusColor: 'bg-green-500',
  cover: 'https://example.com/clean.jpg',
  quantity: 2,
  available_quantity: 1,
  is_available: true,
  is_digital: false,
  is_favorite: true,
  favorite_count: 4,
};

vi.mock('../api/favoriteApi', () => ({
  fetchFavoriteBooks: () => fetchFavoriteBooksMock(),
  removeFavoriteBook: vi.fn(),
}));

describe('Favorites page', () => {
  it('renders favorite books from the API', async () => {
    fetchFavoriteBooksMock.mockResolvedValueOnce([favoriteBook]);

    render(
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchFavoriteBooksMock).toHaveBeenCalled());
    expect(await screen.findByText('Clean Architecture')).toBeInTheDocument();
    expect(screen.getByText('Robert C. Martin')).toBeInTheDocument();
    expect(screen.getByText(/4\s+lượt/)).toBeInTheDocument();
  });
});
