import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminMembers from '../pages/admin/AdminMembers';
import type { MemberApiRecord, MemberPayload } from '../types/member';

let membersState: MemberApiRecord[] = [];

const getAllMembersMock = vi.fn(async () => ({ data: membersState }));

const createMemberMock = vi.fn(async (payload: MemberPayload) => {
  const member: MemberApiRecord = {
    member_id: 11,
    name: payload.name,
    email: payload.email,
    phone_number: payload.phone_number,
    join_date: payload.join_date,
  };

  membersState = [...membersState, member];

  return member;
});

const updateMemberMock = vi.fn(async (memberId: number, payload: MemberPayload) => {
  const updatedMember: MemberApiRecord = {
    member_id: memberId,
    name: payload.name,
    email: payload.email,
    phone_number: payload.phone_number,
    join_date: payload.join_date,
    level: payload.level,
    xp: payload.xp,
    points: payload.points,
  };

  membersState = membersState.map((member) =>
    member.member_id === memberId ? updatedMember : member,
  );

  return updatedMember;
});

const deleteMemberMock = vi.fn(async (memberId: number) => {
  membersState = membersState.filter((member) => member.member_id !== memberId);

  return { message: 'Xoa thanh vien thanh cong.' };
});

vi.mock('../api/userApi', () => ({
  getAllMembers: () => getAllMembersMock(),
  createMember: (payload: MemberPayload) => createMemberMock(payload),
  updateMember: (memberId: number, payload: MemberPayload) =>
    updateMemberMock(memberId, payload),
  deleteMember: (memberId: number) => deleteMemberMock(memberId),
}));

function renderAdminMembers() {
  return render(
    <MemoryRouter>
      <AdminMembers />
    </MemoryRouter>,
  );
}

describe('AdminMembers', () => {
  it('creates a member through the admin members page', async () => {
    membersState = [];
    const user = userEvent.setup();

    renderAdminMembers();

    await screen.findByText('Không tìm thấy thành viên phù hợp');
    await user.click(screen.getByRole('button', { name: 'Thêm thành viên' }));
    fireEvent.change(screen.getByLabelText(/Họ và tên/), {
      target: { value: 'Nguyen New Member' },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: 'new.member@student.hcmue.edu.vn' },
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), {
      target: { value: '0901777777' },
    });
    fireEvent.change(screen.getByLabelText(/Ngày tham gia/), {
      target: { value: '2026-04-19' },
    });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu/), {
      target: { value: 'Student123' },
    });
    fireEvent.change(screen.getByLabelText(/Xác nhận mật khẩu/), {
      target: { value: 'Student123' },
    });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(createMemberMock).toHaveBeenCalledWith({
        name: 'Nguyen New Member',
        email: 'new.member@student.hcmue.edu.vn',
        phone_number: '0901777777',
        join_date: '2026-04-19',
        password: 'Student123',
        password_confirmation: 'Student123',
      });
      expect(screen.getByText('Nguyen New Member')).toBeInTheDocument();
    });
  }, 10000);

  it('updates a member without requiring a password change', async () => {
    membersState = [
      {
        member_id: 3,
        name: 'Old Member',
        email: 'old.member@student.hcmue.edu.vn',
        phone_number: '0901000003',
        join_date: '2026-03-17',
      },
    ];
    const user = userEvent.setup();

    renderAdminMembers();

    expect(await screen.findByText('Old Member')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Chỉnh sửa Old Member' }));
    fireEvent.change(screen.getByLabelText(/Họ và tên/), {
      target: { value: 'Updated Member' },
    });
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), {
      target: { value: '0901888888' },
    });
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));

    await waitFor(() => {
      expect(updateMemberMock).toHaveBeenCalledWith(3, {
        name: 'Updated Member',
        email: 'old.member@student.hcmue.edu.vn',
        phone_number: '0901888888',
        join_date: '2026-03-17',
        level: 1,
        xp: 0,
        points: 0,
      });
      expect(screen.getByText('Updated Member')).toBeInTheDocument();
    });
  }, 10000);

  it('deletes a member after confirmation', async () => {
    membersState = [
      {
        member_id: 4,
        name: 'Delete Member',
        email: 'delete.member@student.hcmue.edu.vn',
        phone_number: '0901000004',
        join_date: '2026-03-17',
      },
    ];
    const user = userEvent.setup();

    renderAdminMembers();

    expect(await screen.findByText('Delete Member')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xóa Delete Member' }));
    await user.click(screen.getByRole('button', { name: 'Xóa thành viên' }));

    await waitFor(() => {
      expect(deleteMemberMock).toHaveBeenCalledWith(4);
      expect(screen.queryByText('Delete Member')).not.toBeInTheDocument();
    });
  });
});
