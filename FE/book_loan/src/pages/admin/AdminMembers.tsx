import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createMember,
  deleteMember,
  getAllMembers,
  updateMember,
  importMembers,
  toggleMemberDisabled,
} from '../../api/userApi';
import CSVImportWizard from '../../components/CSVImportWizard';
import CSVExportSelector from '../../components/CSVExportSelector';
import { AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../api/client';
import { getStoredToken } from '../../auth/storage';

const EXPECTED_FIELDS = [
  { key: 'name', label: 'Họ và tên', required: true, fallbacks: ['ho_ten', 'name', 'ten', 'full name'] },
  { key: 'email', label: 'Địa chỉ Email', required: true, fallbacks: ['email', 'thu dien tu', 'mail'] },
  { key: 'phone_number', label: 'Số điện thoại', required: false, fallbacks: ['phone', 'so_dien_thoai', 'sdt', 'tel'] },
  { key: 'password', label: 'Mật khẩu', required: false, fallbacks: ['mat_khau', 'password', 'pwd'] },
  { key: 'join_date', label: 'Ngày tham gia', required: false, fallbacks: ['join_date', 'ngay_tham_gia', 'ngay tham gia'] },
];

const SAMPLE_CSV = "ho_ten,email,so_dien_thoai,mat_khau,ngay_tham_gia\nNguyễn Văn A,vana@gmail.com,0987654321,Student123,2026-05-23\nTrần Thị B,thib@gmail.com,0912345678,Student123,2026-05-23";

const AVAILABLE_EXPORT_COLUMNS = [
  { key: 'member_id', label: 'Mã sinh viên' },
  { key: 'name', label: 'Họ và tên' },
  { key: 'email', label: 'Địa chỉ Email' },
  { key: 'phone_number', label: 'Số điện thoại' },
  { key: 'level', label: 'Cấp độ học giả' },
  { key: 'xp', label: 'Tích lũy XP' },
  { key: 'points', label: 'Xu tích lũy' },
  { key: 'join_date', label: 'Ngày tham gia' },
];

const DEFAULT_EXPORT_COLUMNS = ['member_id', 'name', 'email', 'phone_number', 'join_date'];

import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { MemberApiRecord, MemberListItem, MemberPayload } from '../../types/member';

type MemberFormData = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  join_date: string;
  password: string;
  password_confirmation: string;
  level?: number;
  xp?: number;
  points?: number;
  badgesCount?: number;
};

type ModalMode = 'add' | 'edit';

const SCHOOL_LABEL = 'Trường Đại học Sư phạm TP.HCM';
const EMPTY_FORM: MemberFormData = {
  id: 0,
  name: '',
  email: '',
  phone_number: '',
  join_date: '',
  password: '',
  password_confirmation: '',
};

function mapMember(member: MemberApiRecord): MemberListItem {
  const disabled = member.is_disabled ?? false;
  return {
    id: member.member_id,
    name: member.name,
    dept: SCHOOL_LABEL,
    type: 'Sinh viên',
    email: member.email || `${member.member_id}@student.hcmue.edu.vn`,
    phoneNumber: member.phone_number || 'Chưa cập nhật',
    joinDate: member.join_date || '',
    status: disabled ? 'Vô hiệu hóa' : 'Hoạt động',
    statusColor: disabled
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-green-100 text-green-700 border-green-200',
    xp: member.xp ?? 0,
    points: member.points ?? 0,
    level: member.level ?? 1,
    badgesCount: member.badges_count ?? 0,
    isDisabled: disabled,
  };
}

function buildPayload(formData: MemberFormData, includePassword: boolean): MemberPayload {
  const payload: MemberPayload = {
    name: formData.name.trim(),
    email: formData.email.trim(),
    phone_number: formData.phone_number.trim() || null,
    join_date: formData.join_date || null,
  };

  if (formData.level !== undefined) {
    payload.level = formData.level;
  }
  if (formData.xp !== undefined) {
    payload.xp = formData.xp;
  }
  if (formData.points !== undefined) {
    payload.points = formData.points;
  }

  if (includePassword || formData.password.trim()) {
    payload.password = formData.password;
    payload.password_confirmation = formData.password_confirmation;
  }

  return payload;
}

function getValidationMessage(formData: MemberFormData, mode: ModalMode) {
  const password = formData.password;
  const confirmation = formData.password_confirmation;
  const hasPasswordInput = Boolean(password || confirmation);
  const phoneNumber = formData.phone_number.trim();

  if (phoneNumber.length > 15) {
    return 'So dien thoai khong duoc vuot qua 15 ky tu.';
  }

  if (mode === 'add' || hasPasswordInput) {
    if (!password) {
      return 'Vui lòng nhập mật khẩu cho thành viên.';
    }

    if (password !== confirmation) {
      return 'Mật khẩu xác nhận không khớp.';
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return 'Mật khẩu cần có tối thiểu 8 ký tự, gồm chữ cái và số.';
    }
  }

  return '';
}

export default function AdminMembers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [formData, setFormData] = useState<MemberFormData>(EMPTY_FORM);
  const [memberToDelete, setMemberToDelete] = useState<MemberListItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isTogglingId, setIsTogglingId] = useState<number | null>(null);

  // --- CSV Import/Export state ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportMembers = (columns: string[]) => {
    const token = getStoredToken();
    if (!token) {
      emitToast({ tone: 'error', title: 'Lỗi', message: 'Không thể xác thực để xuất dữ liệu.' });
      return;
    }
    try {
      emitToast({ tone: 'info', title: 'Xuất dữ liệu', message: 'Đang khởi tạo tải dữ liệu...' });

      let exportUrl = `${API_BASE_URL}/reports/export-members`;
      const params: Record<string, string> = {
        columns: columns.join(','),
      };
      if (searchTerm) {
        params.query = searchTerm;
      }
      exportUrl += '?' + new URLSearchParams(params).toString();

      fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (!res.ok) throw new Error('Yêu cầu xuất tệp dữ liệu thất bại.'); return res.blob(); })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `danh-sach-sinh-vien-${new Date().toISOString().slice(0, 10)}.csv`,
          });
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          emitToast({ tone: 'success', title: 'Thành công', message: 'Tải xuống tệp CSV thành công.' });
        })
        .catch((err: Error) => emitToast({ tone: 'error', title: 'Thất bại', message: err.message }));
    } catch {
      emitToast({ tone: 'error', title: 'Lỗi', message: 'Không thể xác thực để xuất dữ liệu.' });
    }
  };

  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadMembers = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const response = await getAllMembers(currentPage, debouncedSearchTerm);
      setMembers(response.data.map(mapMember));
      if (response.meta) {
        setTotalPages(response.meta.last_page);
      }
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể tải danh sách thành viên.');
      emitToast({ tone: 'error', title: 'Lỗi tải dữ liệu', message });
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadMembers();
  }, [currentPage, debouncedSearchTerm]);

  const updateSearch = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value.trim()) {
      nextParams.set('search', value);
    } else {
      nextParams.delete('search');
    }
    
    // Reset to page 1 when search changes
    nextParams.set('page', '1');

    setSearchParams(nextParams, { replace: true });
  };

  const handlePageChange = (page: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('page', page.toString());
    setSearchParams(nextParams);
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (member: MemberListItem) => {
    setModalMode('edit');
    setFormData({
      id: member.id,
      name: member.name,
      email: member.email,
      phone_number: member.phoneNumber === 'Chưa cập nhật' ? '' : member.phoneNumber,
      join_date: member.joinDate,
      password: '',
      password_confirmation: '',
      level: member.level,
      xp: member.xp,
      points: member.points,
      badgesCount: member.badgesCount,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }

    setIsModalOpen(false);
  };

  const promptDelete = (member: MemberListItem) => {
    setMemberToDelete(member);
    setIsConfirmDeleteOpen(true);
  };

  const cancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setMemberToDelete(null);
  };

  const handleDelete = async () => {
    const member = memberToDelete;
    if (!member) return;

    cancelDelete();

    try {
      await deleteMember(member.id);
      await loadMembers(false);
      emitToast({
        tone: 'success',
        title: 'Đã xóa thành viên',
        message: `${member.name} đã được xóa khỏi hệ thống.`,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể xóa thành viên.');
      emitToast({ tone: 'error', title: 'Không thể xóa thành viên', message });
    }
  };

  const handleToggleDisable = async (member: MemberListItem) => {
    setIsTogglingId(member.id);
    try {
      const res = await toggleMemberDisabled(member.id);
      await loadMembers(false);
      emitToast({
        tone: member.isDisabled ? 'success' : 'info',
        title: member.isDisabled ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản',
        message: res.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      const message = getErrorMessage(error, 'Không thể thay đổi trạng thái tài khoản.');
      emitToast({ tone: 'error', title: 'Thao tác thất bại', message });
    } finally {
      setIsTogglingId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationMessage = getValidationMessage(formData, modalMode);

    if (validationMessage) {
      emitToast({ tone: 'error', title: 'Không thể lưu thành viên', message: validationMessage });
      return;
    }

    setIsSaving(true);

    try {
      if (modalMode === 'add') {
        await createMember(buildPayload(formData, true));
        emitToast({
          tone: 'success',
          title: 'Đã thêm thành viên',
          message: `${formData.name.trim()} đã có tài khoản thư viện.`,
        });
      } else {
        await updateMember(formData.id, buildPayload(formData, false));
        emitToast({
          tone: 'success',
          title: 'Đã cập nhật thành viên',
          message: `${formData.name.trim()} đã được lưu thay đổi.`,
        });
      }

      setIsModalOpen(false);
      await loadMembers(false);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể lưu thành viên.');
      emitToast({ tone: 'error', title: 'Không thể lưu thành viên', message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Quản lý thành viên</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tạo tài khoản, cập nhật hồ sơ và quản lý thông tin liên hệ của độc giả.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-surface-container-high px-5 py-2.5 font-medium text-slate-700 transition-all hover:bg-slate-200 hover:-translate-y-0.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">upload_file</span>
            Nhập từ CSV
          </button>
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-surface-container-high px-5 py-2.5 font-medium text-slate-700 transition-all hover:bg-slate-200 hover:-translate-y-0.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">download</span>
            Xuất CSV
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">person_add</span>
            Thêm thành viên
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container bg-slate-50/50 p-6">
          <div className="relative w-full md:max-w-sm">
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400"
            >
              search
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Tìm theo tên, email, số điện thoại..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-surface-container bg-white text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Mã độc giả</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4">Ngày tham gia</th>
                <th className="px-6 py-4">Loại thẻ</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Quản lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <EmptyState
                      icon="person_search"
                      title="Không tìm thấy thành viên phù hợp"
                      message="Thử thay đổi từ khóa tìm kiếm hoặc thêm thành viên mới."
                    />
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-slate-700">
                        {member.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold uppercase text-slate-600">
                          {member.name.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{member.name}</p>
                          <p className="text-[10px] text-slate-500">{member.dept}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{member.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{member.phoneNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatDisplayDate(member.joinDate, 'Chưa cập nhật')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {member.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${member.statusColor}`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          className="rounded-lg p-2 text-primary transition-all hover:bg-primary-container"
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa ${member.name}`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          disabled={isTogglingId === member.id}
                          onClick={() => handleToggleDisable(member)}
                          className={`rounded-lg p-2 transition-all disabled:opacity-50 ${
                            member.isDisabled
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                          title={member.isDisabled ? 'Kích hoạt lại tài khoản' : 'Vô hiệu hóa tài khoản'}
                          aria-label={member.isDisabled ? `Kích hoạt lại ${member.name}` : `Vô hiệu hóa ${member.name}`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                            {isTogglingId === member.id
                              ? 'hourglass_empty'
                              : member.isDisabled
                              ? 'lock_open'
                              : 'block'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDelete(member)}
                          className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-50"
                          title="Xóa"
                          aria-label={`Xóa ${member.name}`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      </section>

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa thành viên "${memberToDelete?.name}"? Hệ thống có thể không cho phép nếu sinh viên đang có sách mượn.`}
        confirmLabel="Xóa thành viên"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-container bg-slate-50 p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {modalMode === 'add' ? 'Thêm thành viên mới' : 'Chỉnh sửa thành viên'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Đóng"
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {modalMode === 'edit' && (
                  <div className="md:col-span-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                        Thành tích Học giả (Gamification)
                      </h4>
                      <p className="text-[11px] text-indigo-700 mt-0.5">Điều chỉnh cấp độ, điểm tích lũy XP và xu thưởng của sinh viên.</p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 text-center w-full lg:w-auto">
                      <div className="flex-1 min-w-[85px] bg-white border border-indigo-200/60 rounded-xl px-2 py-1.5 shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10">
                        <label htmlFor="member-level" className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider cursor-pointer select-none">Cấp độ</label>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <span className="font-bold text-indigo-500 text-xs select-none">Lvl</span>
                          <input
                            id="member-level"
                            type="number"
                            min="1"
                            value={formData.level ?? 1}
                            onChange={(e) => setFormData({ ...formData, level: Math.max(1, parseInt(e.target.value) || 1) })}
                            className="font-extrabold text-indigo-600 text-sm w-10 bg-transparent border-none p-0 outline-none text-center focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-[95px] bg-white border border-indigo-200/60 rounded-xl px-2 py-1.5 shadow-sm transition-all focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/10">
                        <label htmlFor="member-xp" className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider cursor-pointer select-none">Tích lũy</label>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <input
                            id="member-xp"
                            type="number"
                            min="0"
                            value={formData.xp ?? 0}
                            onChange={(e) => setFormData({ ...formData, xp: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="font-extrabold text-blue-600 text-sm w-14 bg-transparent border-none p-0 outline-none text-center focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="font-bold text-blue-500 text-[10px] select-none">XP</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[85px] bg-white border border-indigo-200/60 rounded-xl px-2 py-1.5 shadow-sm transition-all focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/10">
                        <label htmlFor="member-points" className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider cursor-pointer select-none">Điểm xu</label>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <input
                            id="member-points"
                            type="number"
                            min="0"
                            value={formData.points ?? 0}
                            onChange={(e) => setFormData({ ...formData, points: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="font-extrabold text-amber-600 text-sm w-10 bg-transparent border-none p-0 outline-none text-center focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="select-none text-xs" aria-hidden="true">🪙</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[85px] bg-white/60 border border-indigo-100 rounded-xl px-2 py-1.5 shadow-sm select-none">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">Huy hiệu</span>
                        <div className="flex items-center justify-center gap-0.5 mt-0.5">
                          <span className="font-extrabold text-emerald-600 text-sm">{formData.badgesCount ?? 0}</span>
                          <span aria-hidden="true" className="text-xs">🏅</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label htmlFor="member-name" className="mb-1 block text-xs font-bold text-slate-600">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="member-name"
                    required
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="member-email" className="mb-1 block text-xs font-bold text-slate-600">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="member-email"
                    required
                    type="email"
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="member-phone" className="mb-1 block text-xs font-bold text-slate-600">
                    Số điện thoại
                  </label>
                  <input
                    id="member-phone"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(event) =>
                      setFormData({ ...formData, phone_number: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="member-join-date" className="mb-1 block text-xs font-bold text-slate-600">
                    Ngày tham gia
                  </label>
                  <input
                    id="member-join-date"
                    type="date"
                    value={formData.join_date}
                    onChange={(event) =>
                      setFormData({ ...formData, join_date: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="member-id" className="mb-1 block text-xs font-bold text-slate-600">
                    Mã độc giả
                  </label>
                  <input
                    id="member-id"
                    type="text"
                    value={modalMode === 'add' ? 'Tự động tạo' : formData.id}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-slate-500 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="member-password" className="mb-1 block text-xs font-bold text-slate-600">
                    {modalMode === 'add' ? 'Mật khẩu' : 'Mật khẩu mới'}
                    {modalMode === 'add' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id="member-password"
                    required={modalMode === 'add'}
                    type="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(event) =>
                      setFormData({ ...formData, password: event.target.value })
                    }
                    placeholder={modalMode === 'edit' ? 'Để trống nếu không đổi' : undefined}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="member-password-confirmation" className="mb-1 block text-xs font-bold text-slate-600">
                    Xác nhận mật khẩu
                    {modalMode === 'add' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id="member-password-confirmation"
                    required={modalMode === 'add' || Boolean(formData.password)}
                    type="password"
                    autoComplete="new-password"
                    value={formData.password_confirmation}
                    onChange={(event) =>
                      setFormData({ ...formData, password_confirmation: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl bg-slate-100 px-5 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isImportModalOpen && (
          <CSVImportWizard
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImportSuccess={() => {
              void loadMembers(false);
            }}
            entityType="member"
            importApiCall={importMembers}
            expectedFields={EXPECTED_FIELDS}
            sampleCSV={SAMPLE_CSV}
            sampleFileName="mau_nhap_thanh_vien.csv"
          />
        )}

        {isExportModalOpen && (
          <CSVExportSelector
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExportMembers}
            availableColumns={AVAILABLE_EXPORT_COLUMNS}
            defaultColumns={DEFAULT_EXPORT_COLUMNS}
            title="Xuất danh sách Thành viên"
            description="Lọc và xuất danh sách độc giả học giả ra tệp CSV để lưu trữ hoặc phân tích."
          />
        )}
      </AnimatePresence>
    </div>
  );
}
