import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createLibrarian,
  deleteLibrarian,
  getAllLibrarians,
  updateLibrarian,
  LibrarianApiRecord,
  LibrarianPayload
} from '../../api/librarianApi';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDisplayDate } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import { useAuth } from '../../auth/AuthContext';

type LibrarianFormData = {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  hire_date: string;
  password?: string;
  password_confirmation?: string;
  role: string;
  permissions: string[];
};

type ModalMode = 'add' | 'edit';

const SCHOOL_LABEL = 'Trường Đại học Sư phạm TP.HCM';
const EMPTY_FORM: LibrarianFormData = {
  id: 0,
  name: '',
  email: '',
  phone_number: '',
  hire_date: '',
  password: '',
  password_confirmation: '',
  role: 'librarian',
  permissions: [],
};

type LibrarianListItem = {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  hireDate: string;
  role: string;
  roleColor: string;
  permissions: string[];
};

const PERMISSION_DETAILS: Record<string, { label: string; color: string }> = {
  manage_books: { label: 'Kho Sách', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' },
  manage_members: { label: 'Độc Giả', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' },
  approve_requests: { label: 'Duyệt Mượn Trả', color: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30' },
  manage_rooms: { label: 'Phòng Nhóm', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30' },
  manage_fines: { label: 'Quản Lý Phạt', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30' },
  waive_fines: { label: 'Miễn Phạt', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' },
  manage_settings: { label: 'Cài Đặt', color: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-900/30' },
  view_reports: { label: 'Báo Cáo', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30' },
  view_audit_logs: { label: 'Nhật Ký', color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:text-slate-400 dark:border-slate-700/30' },
  manage_librarians: { label: 'Phân Quyền', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30' },
};

function mapLibrarian(lib: LibrarianApiRecord): LibrarianListItem {
  const roleName = lib.role || 'librarian';
  const isSuper = roleName === 'admin' || lib.email.toLowerCase().startsWith('phunguyen2005');
  return {
    id: lib.librarian_id,
    name: lib.name,
    email: lib.email,
    phoneNumber: lib.phone_number || 'Chưa cập nhật',
    hireDate: lib.hire_date || '',
    role: isSuper ? 'Quản trị viên' : 'Thủ thư',
    roleColor: isSuper 
      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30' 
      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    permissions: lib.permissions || [],
  };
}

function buildPayload(formData: LibrarianFormData, includePassword: boolean): LibrarianPayload {
  const payload: LibrarianPayload = {
    name: formData.name.trim(),
    email: formData.email.trim(),
    phone_number: formData.phone_number.trim() || null,
    hire_date: formData.hire_date || null,
    role: formData.role,
    permissions: formData.permissions,
  };

  if (includePassword || (formData.password && formData.password.trim())) {
    payload.password = formData.password;
    payload.password_confirmation = formData.password_confirmation;
  }

  return payload;
}

function getValidationMessage(formData: LibrarianFormData, mode: ModalMode) {
  const password = formData.password;
  const confirmation = formData.password_confirmation;
  const hasPasswordInput = Boolean(password || confirmation);
  const phoneNumber = formData.phone_number.trim();

  if (phoneNumber.length > 15) {
    return 'Số điện thoại không được vượt quá 15 ký tự.';
  }

  if (mode === 'add' || hasPasswordInput) {
    if (!password) {
      return 'Vui lòng nhập mật khẩu cho thủ thư.';
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

export default function AdminLibrarians() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuth();
  const [librarians, setLibrarians] = useState<LibrarianListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [formData, setFormData] = useState<LibrarianFormData>(EMPTY_FORM);
  const [libToDelete, setLibToDelete] = useState<LibrarianListItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  const searchTerm = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadLibrarians = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const response = await getAllLibrarians(currentPage, debouncedSearchTerm);
      setLibrarians(response.data.map(mapLibrarian));
      if (response.meta) {
        setTotalPages(response.meta.last_page);
      }
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể tải danh sách thủ thư.');
      emitToast({ tone: 'error', title: 'Lỗi tải dữ liệu', message });
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadLibrarians();
  }, [currentPage, debouncedSearchTerm]);

  const updateSearch = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (value.trim()) {
      nextParams.set('search', value);
    } else {
      nextParams.delete('search');
    }
    
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
    setFormData({
      ...EMPTY_FORM,
      hire_date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (lib: LibrarianListItem) => {
    setModalMode('edit');
    setFormData({
      id: lib.id,
      name: lib.name,
      email: lib.email,
      phone_number: lib.phoneNumber === 'Chưa cập nhật' ? '' : lib.phoneNumber,
      hire_date: lib.hireDate,
      password: '',
      password_confirmation: '',
      role: lib.role === 'Quản trị viên' ? 'admin' : 'librarian',
      permissions: lib.permissions,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSaving) {
      return;
    }
    setIsModalOpen(false);
  };

  const promptDelete = (lib: LibrarianListItem) => {
    // Không cho phép tự xóa chính mình
    if (currentUser?.librarian_id === lib.id) {
      emitToast({ tone: 'error', title: 'Không thể thực hiện', message: 'Bạn không thể tự xóa tài khoản của chính mình.' });
      return;
    }
    // Không cho phép xóa Quản trị viên phunguyen2005
    if (lib.email.toLowerCase().startsWith('phunguyen2005')) {
      emitToast({ tone: 'error', title: 'Không thể thực hiện', message: 'Không thể xóa tài khoản Quản trị viên tối cao.' });
      return;
    }

    setLibToDelete(lib);
    setIsConfirmDeleteOpen(true);
  };

  const cancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setLibToDelete(null);
  };

  const handleDelete = async () => {
    const lib = libToDelete;
    if (!lib) return;

    cancelDelete();

    try {
      await deleteLibrarian(lib.id);
      await loadLibrarians(false);
      emitToast({
        tone: 'success',
        title: 'Đã xóa tài khoản',
        message: `Thủ thư ${lib.name} đã được xóa thành công.`,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể xóa thủ thư.');
      emitToast({ tone: 'error', title: 'Thao tác thất bại', message });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationMessage = getValidationMessage(formData, modalMode);

    if (validationMessage) {
      emitToast({ tone: 'error', title: 'Không thể lưu thủ thư', message: validationMessage });
      return;
    }

    setIsSaving(true);

    try {
      if (modalMode === 'add') {
        await createLibrarian(buildPayload(formData, true));
        emitToast({
          tone: 'success',
          title: 'Đã thêm thủ thư',
          message: `Tài khoản thủ thư ${formData.name.trim()} đã được khởi tạo thành công.`,
        });
      } else {
        await updateLibrarian(formData.id, buildPayload(formData, false));
        emitToast({
          tone: 'success',
          title: 'Đã cập nhật thủ thư',
          message: `Đã lưu thay đổi thông tin thủ thư ${formData.name.trim()}.`,
        });
      }

      setIsModalOpen(false);
      await loadLibrarians(false);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể lưu thông tin thủ thư.');
      emitToast({ tone: 'error', title: 'Thao tác thất bại', message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Quản lý Thủ thư</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quản trị viên tối cao phân quyền, thêm mới, sửa thông tin và quản lý vận hành của các thủ thư thường.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">person_add</span>
            Thêm thủ thư mới
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
              placeholder="Tìm thủ thư theo tên, email, sđt..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-surface-container bg-white text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Mã số</th>
                <th className="px-6 py-4">Họ và tên</th>
                <th className="px-6 py-4">Liên hệ</th>
                <th className="px-6 py-4">Ngày vào làm</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Quyền hạn</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    Đang tải danh sách thủ thư...
                  </td>
                </tr>
              ) : librarians.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <EmptyState
                      icon="person_search"
                      title="Không tìm thấy thủ thư nào"
                      message="Thử thay đổi từ khóa tìm kiếm hoặc thêm mới tài khoản thủ thư."
                    />
                  </td>
                </tr>
              ) : (
                librarians.map((lib) => (
                  <tr key={lib.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-slate-700">
                        #{lib.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">
                          {lib.name.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{lib.name}</p>
                          <p className="text-[10px] text-slate-500">{SCHOOL_LABEL}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{lib.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{lib.phoneNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatDisplayDate(lib.hireDate, 'Chưa cập nhật')}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${lib.roleColor}`}
                      >
                        {lib.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lib.role === 'Quản trị viên' ? (
                        <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                          Toàn Quyền
                        </span>
                      ) : lib.permissions.length === 0 ? (
                        <span className="text-[11px] italic text-slate-400">Không có quyền</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {lib.permissions.map((perm) => {
                            const details = PERMISSION_DETAILS[perm];
                            return (
                              <span
                                key={perm}
                                className={`rounded border px-1.5 py-0.5 text-[9px] font-medium leading-none ${
                                  details?.color || 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {details?.label || perm}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(lib)}
                          className="rounded-lg p-2 text-primary transition-all hover:bg-primary-container"
                          title="Chỉnh sửa"
                          aria-label={`Chỉnh sửa ${lib.name}`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDelete(lib)}
                          disabled={currentUser?.librarian_id === lib.id || lib.email.toLowerCase().startsWith('phunguyen2005')}
                          className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Xóa"
                          aria-label={`Xóa ${lib.name}`}
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
        title="Xác nhận xóa tài khoản"
        message={`Bạn có chắc chắn muốn xóa thủ thư "${libToDelete?.name}"? Hệ thống sẽ ngăn cản hành động này nếu thủ thư đã có lịch sử vận hành duyệt mượn sách.`}
        confirmLabel="Xóa tài khoản"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-surface-container bg-slate-50 p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {modalMode === 'add' ? 'Thêm tài khoản thủ thư mới' : 'Chỉnh sửa tài khoản thủ thư'}
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
                <div className="md:col-span-2 col-span-1">
                  <label htmlFor="lib-name" className="mb-1 block text-xs font-bold text-slate-600">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lib-name"
                    required
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="lib-email" className="mb-1 block text-xs font-bold text-slate-600">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lib-email"
                    required
                    type="email"
                    disabled={modalMode === 'edit' && formData.email.toLowerCase().startsWith('phunguyen2005')}
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="lib-phone" className="mb-1 block text-xs font-bold text-slate-600">
                    Số điện thoại
                  </label>
                  <input
                    id="lib-phone"
                    type="tel"
                    value={formData.phone_number}
                    onChange={(event) =>
                      setFormData({ ...formData, phone_number: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="lib-hire-date" className="mb-1 block text-xs font-bold text-slate-600">
                    Ngày vào làm
                  </label>
                  <input
                    id="lib-hire-date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(event) =>
                      setFormData({ ...formData, hire_date: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="lib-role" className="mb-1 block text-xs font-bold text-slate-600">
                    Vai trò hệ thống <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="lib-role"
                    required
                    disabled={modalMode === 'edit' && formData.email.toLowerCase().startsWith('phunguyen2005')}
                    value={formData.role}
                    onChange={(event) => {
                      const selectedRole = event.target.value;
                      setFormData({
                        ...formData,
                        role: selectedRole,
                        permissions: selectedRole === 'admin' ? Object.keys(PERMISSION_DETAILS) : [],
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="librarian">Thủ thư thư viện (Librarian)</option>
                    <option value="admin">Quản trị viên tối cao (Admin)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="lib-password" className="mb-1 block text-xs font-bold text-slate-600">
                    {modalMode === 'add' ? 'Mật khẩu' : 'Mật khẩu mới'}
                    {modalMode === 'add' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id="lib-password"
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
                  <label htmlFor="lib-password-confirmation" className="mb-1 block text-xs font-bold text-slate-600">
                    Xác nhận mật khẩu
                    {modalMode === 'add' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id="lib-password-confirmation"
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

                <div className="md:col-span-2 col-span-1 space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-700">
                    Cấp quyền hoạt động động (RBAC Permissions)
                    {formData.role === 'admin' && (
                      <span className="ml-2 font-normal text-slate-500">
                        (Quản trị viên mặc định có toàn bộ quyền)
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(PERMISSION_DETAILS).map(([permName, { label }]) => {
                      const isChecked =
                        formData.role === 'admin' || formData.permissions.includes(permName);
                      return (
                        <label
                          key={permName}
                          className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-all cursor-pointer ${
                            isChecked
                              ? 'border-primary/30 bg-primary/5 text-primary'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-600'
                          } ${formData.role === 'admin' ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={formData.role === 'admin'}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              let nextPerms = [...formData.permissions];
                              if (checked) {
                                if (!nextPerms.includes(permName)) {
                                  nextPerms.push(permName);
                                }
                              } else {
                                nextPerms = nextPerms.filter((p) => p !== permName);
                              }
                              setFormData({ ...formData, permissions: nextPerms });
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20 accent-primary"
                          />
                          <span className="text-xs font-medium leading-none">{label}</span>
                        </label>
                      );
                    })}
                  </div>
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
    </div>
  );
}
