import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import StudentFines from '../pages/student/Fines';

const { getMyFinesMock, fetchGamifyProfileMock } = vi.hoisted(() => ({
  getMyFinesMock: vi.fn(),
  fetchGamifyProfileMock: vi.fn(),
}));

vi.mock('../api/fineApi', () => ({
  getMyFines: () => getMyFinesMock(),
  applyFineWaiver: vi.fn(),
  initiateMomoPayment: vi.fn(),
  initiateVnpayPayment: vi.fn(),
  getMomoPaymentStatus: vi.fn(),
  simulateMomoPayment: vi.fn(),
  simulateVnpayPayment: vi.fn(),
}));

vi.mock('../api/gamifyApi', () => ({
  fetchGamifyProfile: () => fetchGamifyProfileMock(),
}));

function renderStudentFines() {
  return render(
    <MemoryRouter>
      <StudentFines />
    </MemoryRouter>,
  );
}

describe('StudentFines', () => {
  it('shows unpaid totals, fine rows, and the counter payment guide', async () => {
    const user = userEvent.setup();
    getMyFinesMock.mockResolvedValueOnce({
      total_unpaid: 65000,
      fines: [
        {
          fine_id: 5,
          loan_id: 42,
          book_title: 'Giáo trình Lập trình Web',
          due_date: '2026-05-10',
          return_date: null,
          days_overdue: 13,
          amount: 65000,
          reason: 'overdue',
          status: 'unpaid',
          paid_at: null,
          waived_reason: null,
          created_at: '2026-05-11T00:05:00Z',
          payments: [],
        },
      ],
    });

    fetchGamifyProfileMock.mockResolvedValueOnce({
      xp: 120,
      points: 400,
      level: 2,
      daily_streak: 1,
      last_check_in_at: null,
      active_tickets: [],
      history: [],
    });

    renderStudentFines();

    expect(await screen.findByText('Khoản phạt của tôi')).toBeInTheDocument();
    expect(screen.getAllByText(/65\.000/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('Giáo trình Lập trình Web')[0]).toBeInTheDocument();
    expect(screen.getAllByText('13 ngày')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Chưa trả')[0]).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Xem hướng dẫn thanh toán/ }));

    expect(screen.getByRole('dialog', { name: /Hướng dẫn thanh toán/ })).toBeInTheDocument();
    expect(screen.getByText(/Tiền mặt tại quầy/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /MoMo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /VNPay/ })).toBeInTheDocument();
    expect(screen.getByText(/Mã phiếu phạt #5/)).toBeInTheDocument();
  });
});
