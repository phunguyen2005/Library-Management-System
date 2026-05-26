import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../pages/student/Home';
import type { FormattedBook } from '../types/book';

const {
  fetchAiRecommendationsMock,
  fetchBorrowableBooksMock,
  getFineSummaryMock,
  getMyRequestsMock,
  navigateMock,
} = vi.hoisted(() => ({
  fetchAiRecommendationsMock: vi.fn(),
  fetchBorrowableBooksMock: vi.fn(),
  getFineSummaryMock: vi.fn(),
  getMyRequestsMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../api/bookApi', () => ({
  fetchBorrowableBooks: (...args: unknown[]) => fetchBorrowableBooksMock(...args),
}));

vi.mock('../api/borrowApi', () => ({
  getMyRequests: () => getMyRequestsMock(),
}));

vi.mock('../api/aiApi', () => ({
  fetchAiRecommendations: () => fetchAiRecommendationsMock(),
}));

vi.mock('../api/fineApi', () => ({
  getFineSummary: () => getFineSummaryMock(),
}));

const featuredBook: FormattedBook = {
  id: 12,
  book_id: 12,
  title: 'Clean Library Design',
  author: 'Nguyen Minh',
  isbn: 'ISBN-12000',
  category: 'Design',
  genre: 'Design',
  location: 'Shelf A2',
  status: 'San co',
  statusColor: 'bg-green-500',
  cover: 'https://example.com/clean-library-design.jpg',
  quantity: 3,
  available_quantity: 3,
  is_available: true,
  is_digital: false,
  is_favorite: false,
  favorite_count: 0,
};

describe('Student home featured banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchBorrowableBooksMock.mockResolvedValue({ data: [featuredBook], meta: { total: 1 } });
    getMyRequestsMock.mockResolvedValue([]);
    fetchAiRecommendationsMock.mockResolvedValue([]);
    getFineSummaryMock.mockResolvedValue({ has_unpaid: false, total_unpaid: 0, count: 0 });
  });

  it('renders a realistic banner with a separate right-side book cover and preserves interactions', async () => {
    const user = userEvent.setup();
    const scrollByMock = vi.fn();

    Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
      configurable: true,
      value: scrollByMock,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    const featuredSlide = await screen.findByRole('article', {
      name: 'Sach noi bat: Clean Library Design',
    });

    expect(within(featuredSlide).getByLabelText('Bia sach noi bat: Clean Library Design')).toBeInTheDocument();

    await user.click(within(featuredSlide).getByRole('button', { name: 'Muon sach Clean Library Design' }));
    expect(navigateMock).toHaveBeenCalledWith('/catalog?book=12');

    await user.click(within(featuredSlide).getByRole('button', { name: 'Xem chi tiet Clean Library Design' }));
    expect(navigateMock).toHaveBeenCalledWith('/catalog?q=Clean%20Library%20Design');

    await user.click(screen.getByRole('button', { name: 'Sach tiep theo' }));
    expect(scrollByMock).toHaveBeenCalledWith({ left: expect.any(Number), behavior: 'smooth' });

    await waitFor(() => expect(fetchBorrowableBooksMock).toHaveBeenCalledWith(1, '', 1000));
  });
});
