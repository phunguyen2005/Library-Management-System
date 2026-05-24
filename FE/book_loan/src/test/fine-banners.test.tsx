import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StudentRequests from '../pages/student/StudentRequests';

const {
  getFineSummaryMock,
  getMyRequestsMock,
  fetchMyReservationsMock,
} = vi.hoisted(() => ({
  getFineSummaryMock: vi.fn(),
  getMyRequestsMock: vi.fn(),
  fetchMyReservationsMock: vi.fn(),
}));

vi.mock('../api/fineApi', () => ({
  getMyFines: vi.fn(async () => []),
  getFineSummary: () => getFineSummaryMock(),
}));

vi.mock('../api/borrowApi', () => ({
  getMyRequests: () => getMyRequestsMock(),
}));

vi.mock('../api/reservationApi', () => ({
  fetchMyReservations: () => fetchMyReservationsMock(),
  cancelReservation: vi.fn(),
}));

describe('fine banners', () => {
  it('lets students jump from the requests warning banner to the fines page', async () => {
    const user = userEvent.setup();
    getMyRequestsMock.mockResolvedValueOnce([]);
    fetchMyReservationsMock.mockResolvedValueOnce([]);
    getFineSummaryMock.mockResolvedValueOnce({
      has_unpaid: true,
      total_unpaid: 65000,
      count: 2,
    });

    render(
      <MemoryRouter initialEntries={['/requests']}>
        <Routes>
          <Route path="/requests" element={<StudentRequests />} />
          <Route path="/fines" element={<div>Fine route reached</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Bạn có 2 khoản phạt chưa thanh toán/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xem chi tiết' }));
    expect(screen.getByText('Fine route reached')).toBeInTheDocument();
  });
});
