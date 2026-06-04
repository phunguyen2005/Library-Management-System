import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  manage_blog: { label: 'Blog', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30' },
};

const isProtectedAdminEmail = (email: string) => {
  const el = email.toLowerCase();
  return el.startsWith('phunguyen2005') || el === 'phugamer18@gmail.com';
};

function mapLibrarian(lib: LibrarianApiRecord): LibrarianListItem {
  const roleName = lib.role || 'librarian';
  const isSuper = roleName === 'admin' || isProtectedAdminEmail(lib.email);
  return {
    id: lib.librarian_id,
    name: lib.name,
    email: lib.email,
    phoneNumber: lib.phone_number || '',
    hireDate: lib.hire_date || '',
    role: isSuper ? 'admin' : 'librarian',
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

function getValidationMessage(formData: LibrarianFormData, mode: ModalMode, t: (key: string) => string) {
  const password = formData.password;
  const confirmation = formData.password_confirmation;
  const hasPasswordInput = Boolean(password || confirmation);
  const phoneNumber = formData.phone_number.trim();

  if (phoneNumber.length > 15) {
    return t('adminLibrarians.validation.phoneLength');
  }

  if (mode === 'add' || hasPasswordInput) {
    if (!password) {
      return t('adminLibrarians.validation.passwordRequired');
    }

    if (password !== confirmation) {
      return t('adminLibrarians.validation.passwordConfirmMismatch');
    }

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return t('adminLibrarians.validation.passwordFormat');
    }
  }

  return '';
}

export default function AdminLibrarians() {
  const { t } = useTranslation();
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

      const message = getErrorMessage(error, t('adminLibrarians.error.loadFailed'));
      emitToast({ tone: 'error', title: t('adminLibrarians.error.loadTitle'), message });
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
      phone_number: lib.phoneNumber,
      hire_date: lib.hireDate,
      password: '',
      password_confirmation: '',
      role: lib.role,
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
      emitToast({ tone: 'error', title: t('adminLibrarians.error.actionFailed'), message: t('adminLibrarians.validation.cannotDeleteSelf') });
      return;
    }
    // Không cho phép xóa Quản trị viên phunguyen2005 hoặc phugamer18@gmail.com
    if (isProtectedAdminEmail(lib.email)) {
      emitToast({ tone: 'error', title: t('adminLibrarians.error.actionFailed'), message: t('adminLibrarians.validation.cannotDeleteSuperAdmin') });
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
        title: t('adminLibrarians.deleteSuccessTitle'),
        message: t('adminLibrarians.deleteSuccessMsg', { name: lib.name }),
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminLibrarians.error.deleteFailed'));
      emitToast({ tone: 'error', title: t('adminLibrarians.error.actionFailed'), message });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationMessage = getValidationMessage(formData, modalMode, t);

    if (validationMessage) {
      emitToast({ tone: 'error', title: t('adminLibrarians.error.saveFailed'), message: validationMessage });
      return;
    }

    setIsSaving(true);

    try {
      if (modalMode === 'add') {
        await createLibrarian(buildPayload(formData, true));
        emitToast({
          tone: 'success',
          title: t('adminLibrarians.addSuccessTitle'),
          message: t('adminLibrarians.addSuccessMsg', { name: formData.name.trim() }),
        });
      } else {
        await updateLibrarian(formData.id, buildPayload(formData, false));
        emitToast({
          tone: 'success',
          title: t('adminLibrarians.updateSuccessTitle'),
          message: t('adminLibrarians.updateSuccessMsg', { name: formData.name.trim() }),
        });
      }

      setIsModalOpen(false);
      await loadLibrarians(false);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, t('adminLibrarians.error.saveInfoFailed'));
      emitToast({ tone: 'error', title: t('adminLibrarians.error.actionFailed'), message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{t('adminLibrarians.title')}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('adminLibrarians.subtitle')}
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-medium text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">person_add</span>
            {t('adminLibrarians.addBtn')}
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
              placeholder={t('adminLibrarians.searchPlaceholder') || ''}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-surface-container bg-white text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">{t('adminLibrarians.table.id')}</th>
                <th className="px-6 py-4">{t('adminLibrarians.table.name')}</th>
                <th className="px-6 py-4">{t('adminLibrarians.table.contact')}</th>
                <th className="px-6 py-4">{t('adminLibrarians.table.hireDate')}</th>
                <th className="px-6 py-4">{t('adminLibrarians.table.role')}</th>
                <th className="px-6 py-4">{t('adminLibrarians.table.permissions')}</th>
                <th className="px-6 py-4 text-right">{t('adminLibrarians.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    {t('adminLibrarians.loading')}
                  </td>
                </tr>
              ) : librarians.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8">
                    <EmptyState
                      icon="person_search"
                      title={t('adminLibrarians.empty.title') || ''}
                      message={t('adminLibrarians.empty.message') || ''}
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
                          <p className="text-[10px] text-slate-500">{t('landing.footerCatalog') === 'Danh mục sách' ? 'Trường Đại học Sư phạm TP.HCM' : 'Ho Chi Minh City University of Education'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">{lib.email}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{lib.phoneNumber || t('adminLibrarians.notUpdated')}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {formatDisplayDate(lib.hireDate, t('adminLibrarians.notUpdated'))}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${lib.roleColor}`}
                      >
                        {lib.role === 'admin' ? t('common.admin') : t('common.librarian')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lib.role === 'admin' ? (
                        <span className="rounded bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30">
                          {t('adminLibrarians.fullPermissions')}
                        </span>
                      ) : lib.permissions.length === 0 ? (
                        <span className="text-[11px] italic text-slate-400">{t('adminLibrarians.noPermissions')}</span>
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
                                {t(`adminLibrarians.permissions.${perm}`, details?.label || perm)}
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
                          title={t('common.edit') || 'Edit'}
                          aria-label={`${t('common.edit') || 'Edit'} ${lib.name}`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDelete(lib)}
                          disabled={currentUser?.librarian_id === lib.id || isProtectedAdminEmail(lib.email)}
                          className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                          title={t('common.delete') || 'Delete'}
                          aria-label={`${t('common.delete') || 'Delete'} ${lib.name}`}
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
        title={t('adminLibrarians.confirmDelete.title')}
        message={t('adminLibrarians.confirmDelete.message', { name: libToDelete?.name })}
        confirmLabel={t('adminLibrarians.confirmDelete.confirmLabel')}
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-surface-container bg-slate-50 p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {modalMode === 'add' ? t('adminLibrarians.modal.addTitle') : t('adminLibrarians.modal.editTitle')}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label={t('common.close') || 'Close'}
              >
                <span aria-hidden="true" className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2 col-span-1">
                  <label htmlFor="lib-name" className="mb-1 block text-xs font-bold text-slate-600">
                    {t('adminLibrarians.form.fullName')} <span className="text-red-500">*</span>
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
                    {t('adminLibrarians.form.email')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lib-email"
                    required
                    type="email"
                    disabled={modalMode === 'edit' && isProtectedAdminEmail(formData.email)}
                    value={formData.email}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="lib-phone" className="mb-1 block text-xs font-bold text-slate-600">
                    {t('adminLibrarians.form.phone')}
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
                    {t('adminLibrarians.form.hireDate')}
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
                    {t('adminLibrarians.form.role')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="lib-role"
                    required
                    disabled={modalMode === 'edit' && isProtectedAdminEmail(formData.email)}
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
                    <option value="librarian">{t('adminLibrarians.form.roleLibrarian')}</option>
                    <option value="admin">{t('adminLibrarians.form.roleAdmin')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="lib-password" className="mb-1 block text-xs font-bold text-slate-600">
                    {modalMode === 'add' ? t('adminLibrarians.form.password') : t('adminLibrarians.form.newPassword')}
                    {modalMode === 'add' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id="lib-password"
                    required={modalMode === 'add'}
                    type="password"
                    autoComplete="new-password"
                    value={formData.password || ''}
                    onChange={(event) =>
                      setFormData({ ...formData, password: event.target.value })
                    }
                    placeholder={modalMode === 'edit' ? t('adminLibrarians.form.passwordPlaceholder') || '' : undefined}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label htmlFor="lib-password-confirmation" className="mb-1 block text-xs font-bold text-slate-600">
                    {t('adminLibrarians.form.passwordConfirmation')}
                    {modalMode === 'add' && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    id="lib-password-confirmation"
                    required={modalMode === 'add' || Boolean(formData.password)}
                    type="password"
                    autoComplete="new-password"
                    value={formData.password_confirmation || ''}
                    onChange={(event) =>
                      setFormData({ ...formData, password_confirmation: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="md:col-span-2 col-span-1 space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-bold text-slate-700">
                    {t('adminLibrarians.form.permissionsTitle')}
                    {formData.role === 'admin' && (
                      <span className="ml-2 font-normal text-slate-500">
                        {t('adminLibrarians.form.permissionsAdminHint')}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {Object.entries(PERMISSION_DETAILS).map(([permName, { label: defaultLabel }]) => {
                      const isChecked =
                        formData.role === 'admin' || formData.permissions.includes(permName);
                      const displayLabel = t(`adminLibrarians.permissions.${permName}`, defaultLabel);
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
                          <span className="text-xs font-medium leading-none">{displayLabel}</span>
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/20 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? t('common.processing') : t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
