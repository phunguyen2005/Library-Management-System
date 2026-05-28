import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminRequests from '../pages/admin/AdminRequests';
import type { BorrowRequest } from '../api/borrowApi';

let requestsState: BorrowRequest[] = [];

const approveBorrowMock = vi.fn(async (loanId: number) => {
  requestsState = requestsState.map((request) =>
    request.id === loanId
      ? { ...request, raw_status: 'approved', status: 'Chờ nhận sách' }
      : request,
  );
  return { message: 'Đã duyệt', loan: {} };
});

const confirmPickupMock = vi.fn(async (loanId: number, barcode?: string) => {
  requestsState = requestsState.map((request) =>
    request.id === loanId
      ? { ...request, raw_status: 'borrowed', status: 'Đang mượn', barcode }
      : request,
  );
  return { message: 'Đã giao sách', loan: {} };
});

const returnBookMock = vi.fn(async (loanId: number, _condition?: string, _conditionNote?: string, _barcode?: string) => {
  requestsState = requestsState.map((request) =>
    request.id === loanId
      ? { ...request, raw_status: 'returned', status: 'Đã trả' }
      : request,
  );
  return { message: 'Đã trả', loan: {} };
});

const rejectBorrowMock = vi.fn(async (loanId: number, reason: string) => {
  requestsState = requestsState.map((request) =>
    request.id === loanId
      ? {
          ...request,
          raw_status: 'rejected',
          status: 'Từ chối',
          rejection_reason: reason,
          rejected_at: '2026-04-12T00:00:00.000000Z',
        }
      : request,
  );
  return { message: 'Đã từ chối', loan: {} };
});

const getAllRequestsMock = vi.fn(async () => requestsState);

function renderAdminRequests() {
  return render(
    <MemoryRouter>
      <AdminRequests />
    </MemoryRouter>,
  );
}

vi.mock('../api/borrowApi', async () => {
  const actual = await vi.importActual<typeof import('../api/borrowApi')>('../api/borrowApi');
  return {
    ...actual,
    getAllRequests: () => getAllRequestsMock(),
    approveBorrow: (loanId: number) => approveBorrowMock(loanId),
    confirmPickup: (loanId: number, barcode?: string) => confirmPickupMock(loanId, barcode),
    rejectBorrow: (loanId: number, reason: string) => rejectBorrowMock(loanId, reason),
    returnBook: (loanId: number, condition?: string, conditionNote?: string, barcode?: string) =>
      returnBookMock(loanId, condition, conditionNote, barcode),
  };
});

describe('AdminRequests', () => {
  it('updates a pending request to approved after approval', async () => {
    requestsState = [
      {
        id: 1,
        name: 'Nguyen Thi Minh Anh',
        role: 'SV',
        roleColor: 'bg-primary-container text-primary',
        code: '1',
        book: 'Clean Code',
        bookCode: '101',
        status: 'Chờ duyệt',
        date: '2026-04-11',
        raw_status: 'pending',
      },
    ];

    const user = userEvent.setup();
    renderAdminRequests();

    expect(await screen.findByText('Chờ duyệt')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Duyệt' }));

    await waitFor(() => {
      expect(approveBorrowMock).toHaveBeenCalledWith(1);
      expect(screen.queryByRole('button', { name: 'Duyệt' })).not.toBeInTheDocument();
    });
  });

  it('requires a barcode before confirming pickup for an approved request', async () => {
    requestsState = [
      {
        id: 4,
        name: 'Pham Minh Quan',
        role: 'SV',
        roleColor: 'bg-primary-container text-primary',
        code: '4',
        book: 'Clean Architecture',
        bookCode: '104',
        status: 'Chờ nhận sách',
        date: '2026-04-13',
        raw_status: 'approved',
      },
    ];

    const user = userEvent.setup();
    renderAdminRequests();

    await screen.findByText('Chờ nhận sách');
    await user.click(screen.getByRole('button', { name: 'Chờ nhận sách' }));
    await user.click(screen.getByRole('button', { name: 'Xác nhận giao sách' }));

    const barcodeInput = await screen.findByLabelText('Mã vạch bản sao');
    await user.type(barcodeInput, 'BC-SACH-104-01');
    const dialog = screen.getByRole('dialog', { name: /Xác nhận giao sách/ });
    await user.click(within(dialog).getByRole('button', { name: 'Xác nhận giao sách' }));

    await waitFor(() => {
      expect(confirmPickupMock).toHaveBeenCalledWith(4, 'BC-SACH-104-01');
    });
  });

  it('updates a borrowed request to returned after return action', async () => {
    requestsState = [
      {
        id: 2,
        name: 'Tran Van Khoa',
        role: 'SV',
        roleColor: 'bg-primary-container text-primary',
        code: '2',
        book: 'Domain-Driven Design',
        bookCode: '102',
        status: 'Đang mượn',
        date: '2026-04-10',
        raw_status: 'borrowed',
        barcode: 'BC-SACH-102-01',
      },
    ];

    const user = userEvent.setup();
    renderAdminRequests();

    await user.click(screen.getByRole('button', { name: 'Đang mượn' }));
    expect(await screen.findByRole('button', { name: 'Nhận trả sách' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Nhận trả sách' }));
    await user.clear(screen.getByLabelText('Mã vạch bản sao'));
    await user.type(screen.getByLabelText('Mã vạch bản sao'), 'BC-SACH-102-01');
    await user.click(screen.getByRole('button', { name: 'Xác nhận trả sách' }));

    await waitFor(() => {
      expect(returnBookMock).toHaveBeenCalledWith(2, 'good', undefined, 'BC-SACH-102-01');
      expect(screen.queryByRole('button', { name: 'Nhận trả sách' })).not.toBeInTheDocument();
    });
  });

  it('rejects a pending request with a visible reason', async () => {
    requestsState = [
      {
        id: 3,
        name: 'Le Thi Ngoc Han',
        role: 'SV',
        roleColor: 'bg-primary-container text-primary',
        code: '3',
        book: 'Refactoring',
        bookCode: '103',
        status: 'Chờ duyệt',
        date: '2026-04-12',
        raw_status: 'pending',
      },
    ];

    const user = userEvent.setup();
    renderAdminRequests();

    await screen.findByText('Chờ duyệt');
    await user.click(screen.getByRole('button', { name: 'Từ chối' }));
    await user.type(screen.getByLabelText('Lý do từ chối'), 'Sách đang kiểm kê');
    await user.click(screen.getByRole('button', { name: 'Xác nhận từ chối' }));

    await waitFor(() => {
      expect(rejectBorrowMock).toHaveBeenCalledWith(3, 'Sách đang kiểm kê');
      expect(screen.getByText('Lý do: Sách đang kiểm kê')).toBeInTheDocument();
    });
  });
});
