import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MyBooks from '../pages/student/MyBooks';
import type { MemberBorrowRequest } from '../types/request';

const overdueRequest: MemberBorrowRequest = {
  id: 50,
  bookTitle: 'Distributed Systems',
  author: 'Library Faculty',
  cover: null,
  category: 'Technology',
  status: 'borrowed',
  borrow_date: '2026-04-01',
  due_date: '2026-12-30',
  return_date: null,
  is_overdue: true,
  days_overdue: 5,
  due_status: 'overdue',
};

vi.mock('../api/borrowApi', () => ({
  getMyRequests: async () => [overdueRequest],
}));

describe('MyBooks overdue display', () => {
  it('renders overdue status from API fields instead of recalculating from due date', async () => {
    render(<MyBooks />);

    expect(await screen.findByText('Distributed Systems')).toBeInTheDocument();
    expect(screen.getByLabelText('Loan due status overdue')).toHaveTextContent('5');
  });
});
