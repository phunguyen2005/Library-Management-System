import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminFines from '../pages/admin/AdminFines';

const {
  getAdminFinesMock,
  getFineStatisticsMock,
  payFineMock,
  waiveFineMock,
} = vi.hoisted(() => ({
  getAdminFinesMock: vi.fn(),
  getFineStatisticsMock: vi.fn(),
  payFineMock: vi.fn(),
  waiveFineMock: vi.fn(),
}));

const unpaidFine = {
  fine_id: 7,
  loan_id: 42,
  member_id: 1,
  member: {
    member_id: 1,
    name: 'Nguyen Van An',
    email: 'an@student.hcmue.edu.vn',
  },
  book_title: 'Lập trình Laravel',
  due_date: '2026-05-15',
  return_date: null,
  days_overdue: 8,
  amount: 40000,
  reason: 'overdue',
  status: 'unpaid',
  paid_at: null,
  waived_reason: null,
  payments: [],
  created_at: '2026-05-23T00:05:00Z',
};

function mockFineApis() {
  getFineStatisticsMock.mockResolvedValue({
    total_collected: 120000,
    total_unpaid: 40000,
    total_waived: 10000,
    this_month_collected: 120000,
    by_month: [],
  });
  getAdminFinesMock.mockResolvedValue({
    data: [unpaidFine],
    meta: {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 1,
    },
  });
  payFineMock.mockResolvedValue({ message: 'Đã thu phí', fine: { ...unpaidFine, status: 'paid' } });
  waiveFineMock.mockResolvedValue({ message: 'Đã miễn phạt', fine: { ...unpaidFine, status: 'waived' } });
}

vi.mock('../api/fineApi', () => ({
  getAdminFines: (...args: unknown[]) => getAdminFinesMock(...args),
  getFineStatistics: () => getFineStatisticsMock(),
  payFine: (...args: unknown[]) => payFineMock(...args),
  waiveFine: (...args: unknown[]) => waiveFineMock(...args),
}));

function renderAdminFines() {
  return render(
    <MemoryRouter>
      <AdminFines />
    </MemoryRouter>,
  );
}

describe('AdminFines', () => {
  it('shows financial statistics and collects a cash fine with a note', async () => {
    mockFineApis();
    const user = userEvent.setup();

    renderAdminFines();

    expect(await screen.findByText('Quản lý khoản phạt')).toBeInTheDocument();
    expect(screen.getByText('Lập trình Laravel')).toBeInTheDocument();
    expect(screen.getAllByText(/40\.000/)[0]).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Thu phí' }));
    await user.type(screen.getByLabelText('Ghi chú thu phí'), 'Sinh viên đóng tiền mặt tại quầy');
    await user.click(screen.getByRole('button', { name: 'Xác nhận thu phí' }));

    await waitFor(() => {
      expect(payFineMock).toHaveBeenCalledWith(7, {
        method: 'cash',
        note: 'Sinh viên đóng tiền mặt tại quầy',
      });
    });
  });

  it('waives an unpaid fine with a required reason', async () => {
    mockFineApis();
    const user = userEvent.setup();

    renderAdminFines();

    await screen.findByText('Lập trình Laravel');
    await user.click(screen.getByRole('button', { name: 'Miễn phạt' }));
    await user.type(screen.getByLabelText('Lý do miễn phạt'), 'Sinh viên có xác nhận hoàn cảnh khó khăn');
    await user.click(screen.getByRole('button', { name: 'Xác nhận miễn phạt' }));

    await waitFor(() => {
      expect(waiveFineMock).toHaveBeenCalledWith(7, 'Sinh viên có xác nhận hoàn cảnh khó khăn');
    });
  });
});
