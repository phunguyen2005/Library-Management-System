import React, { startTransition, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import { generateBookMetadata, generateAllBooksMetadata } from '../../api/aiApi';
import {
  addBorrowableBook,
  addDigitalResource,
  deleteBook,
  fetchBorrowableBooks,
  fetchBookCopies,
  fetchDigitalResourceBooks,
  updateBorrowableBook,
  updateDigitalResource,
  uploadDigitalFile,
  importBooks,
  updateBookCopy,
  addBookCopy,
  deleteBookCopy,
  type BookPayload,
} from '../../api/bookApi';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { SHELF_LABELS } from '../../components/LibraryMapModal';
import { useDebounce } from '../../hooks/useDebounce';
import { applyImageFallback } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import type { BookCopy, BookCopyCondition, BookCopyStatus, FormattedBook } from '../../types/book';
import { BOOK_CLASSIFICATIONS, getDefaultShelfForCategory, findClassification, getShelvesForCategory } from '../../lib/bookClassification';
import { AnimatePresence } from 'framer-motion';
import CSVImportWizard from '../../components/CSVImportWizard';
import CSVExportSelector from '../../components/CSVExportSelector';
import { API_BASE_URL } from '../../api/client';
import { getStoredToken } from '../../auth/storage';

const EXPECTED_FIELDS = [
  { key: 'title', label: 'Tên sách / Tiêu đề', required: true, fallbacks: ['ten_sach', 'title', 'tieu de', 'ten'] },
  { key: 'author', label: 'Tác giả', required: true, fallbacks: ['tac_gia', 'author', 'tac gia'] },
  { key: 'genre', label: 'Thể loại / Thư mục', required: false, fallbacks: ['the_loai', 'genre', 'the loai', 'danh muc'] },
  { key: 'published_year', label: 'Năm xuất bản', required: false, fallbacks: ['published_year', 'nam_xuat_ban', 'nam xb', 'published year'] },
  { key: 'location', label: 'Vị trí kệ', required: false, fallbacks: ['vi_tri', 'location', 'ke', 'vi tri'] },
  { key: 'quantity', label: 'Số lượng bản', required: false, fallbacks: ['so_luong', 'quantity', 'so luong'] },
  { key: 'is_digital', label: 'Sách số / Tài nguyên (1/0)', required: false, fallbacks: ['sach_so', 'is_digital', 'sach so'] },
];

const SAMPLE_CSV_PHYSICAL = "ten_sach,tac_gia,the_loai,nam_xuat_ban,vi_tri,so_luong,sach_so\nĐắc Nhân Tâm,Dale Carnegie,Triết học & Tâm lý học,2020,Kệ J1,5,0\nLược sử thời gian,Stephen Hawking,Khoa học Tự nhiên,2018,Kệ A1,3,0";
const SAMPLE_CSV_DIGITAL = "ten_sach,tac_gia,the_loai,nam_xuat_ban,vi_tri,so_luong,sach_so\nGiáo trình Triết học Mác - Lênin,Bộ Giáo dục và Đào tạo,Giáo trình,2021,,0,1\nBáo cáo Phát triển Bền vững,Tổng cục Thống kê,Báo cáo,2025,,0,1";

const AVAILABLE_EXPORT_COLUMNS = [
  { key: 'book_id', label: 'Mã tài liệu' },
  { key: 'title', label: 'Tên tài liệu' },
  { key: 'author', label: 'Tác giả' },
  { key: 'genre', label: 'Thể loại / Danh mục' },
  { key: 'published_year', label: 'Năm xuất bản' },
  { key: 'location', label: 'Vị trí kệ' },
  { key: 'total_quantity', label: 'Tổng số lượng bản' },
  { key: 'available_quantity', label: 'Bản khả dụng' },
  { key: 'is_digital', label: 'Loại tài liệu' },
  { key: 'download_count', label: 'Lượt tải số' },
];

const DEFAULT_EXPORT_COLUMNS = ['book_id', 'title', 'author', 'genre', 'location', 'total_quantity', 'available_quantity'];

const COPY_STATUSES: BookCopyStatus[] = ['available', 'borrowed', 'repairing', 'lost', 'damaged'];
const COPY_CONDITIONS: BookCopyCondition[] = ['good', 'damaged', 'lost'];

type InventoryTab = 'borrow' | 'digital';

type InventoryFormData = {
  id: number;
  title: string;
  author: string;
  category: string;
  location: string;
  cover: string;
  quantity: number;
  published_year: string;
  file_format: string;
  file_size: string;
  digital_file_name: string;
  has_digital_file: boolean;
};

const EMPTY_FORM: InventoryFormData = {
  id: 0,
  title: '',
  author: '',
  category: 'Giáo trình',
  location: '',
  cover: '',
  quantity: 1,
  published_year: '',
  file_format: '',
  file_size: '',
  digital_file_name: '',
  has_digital_file: false,
};

function formatFileSize(file: File) {
  return `${Math.max(1, Math.ceil(file.size / 1024))} KB`;
}

function determineCategory(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (ext === 'epub') return 'EPUB';
  if (ext === 'ppt' || ext === 'pptx') return 'SLIDES';
  if (ext === 'mp3' || ext === 'wav' || ext === 'm4a') return 'AUDIO';
  return 'PDF';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toFormData(book: FormattedBook): InventoryFormData {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    location: book.location,
    cover: book.cover,
    quantity: book.quantity || 1,
    published_year: book.published_year ? String(book.published_year) : '',
    file_format: book.file_format || '',
    file_size: book.file_size || '',
    digital_file_name: book.digital_file_name || '',
    has_digital_file: Boolean(book.has_digital_file),
  };
}

function buildPayload(formData: InventoryFormData, tab: InventoryTab): BookPayload {
  const publishedYear = Number(formData.published_year);

  return {
    title: formData.title.trim(),
    author: formData.author.trim(),
    category: formData.category.trim(),
    genre: formData.category.trim(),
    published_year: Number.isFinite(publishedYear) && publishedYear > 0 ? publishedYear : undefined,
    location: tab === 'borrow' ? formData.location.trim() : undefined,
    cover: formData.cover.trim() || undefined,
    quantity: tab === 'borrow' ? formData.quantity : undefined,
    resource_type: tab === 'digital' ? formData.category.trim() : undefined,
  };
}

export default function AdminInventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'digital' ? 'digital' : 'borrow';
  const [activeTab, setActiveTab] = useState<InventoryTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [borrowBooks, setBorrowBooks] = useState<FormattedBook[]>([]);
  const [digitalBooks, setDigitalBooks] = useState<FormattedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<InventoryFormData>(EMPTY_FORM);
  const [selectedDigitalFile, setSelectedDigitalFile] = useState<File | null>(null);
  const [bookToDelete, setBookToDelete] = useState<FormattedBook | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [aiActionId, setAiActionId] = useState<number | null>(null);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [repairActionId, setRepairActionId] = useState<number | null>(null);
  const [copiesBook, setCopiesBook] = useState<FormattedBook | null>(null);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [isCopiesLoading, setIsCopiesLoading] = useState(false);
  const [copyActionId, setCopyActionId] = useState<number | 'new' | null>(null);
  const [newCopyBarcode, setNewCopyBarcode] = useState('');

  // --- CSV Import/Export state ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExportBooks = (columns: string[]) => {
    const token = getStoredToken();
    if (!token) {
      emitToast({ tone: 'error', title: 'Lỗi', message: 'Không thể xác thực để xuất dữ liệu.' });
      return;
    }
    try {
      emitToast({ tone: 'info', title: 'Xuất dữ liệu', message: 'Đang khởi tạo tải dữ liệu...' });

      let exportUrl = `${API_BASE_URL}/reports/export-books`;
      const params: Record<string, string> = {
        columns: columns.join(','),
      };
      if (searchTerm) {
        params.query = searchTerm;
      }
      if (activeTab === 'digital') {
        params.is_digital = '1';
      } else if (activeTab === 'borrow') {
        params.is_digital = '0';
      }
      exportUrl += '?' + new URLSearchParams(params).toString();

      fetch(exportUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (!res.ok) throw new Error('Yêu cầu xuất tệp dữ liệu thất bại.'); return res.blob(); })
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = Object.assign(document.createElement('a'), {
            href: url,
            download: `xuat-kho-sach-${new Date().toISOString().slice(0, 10)}.csv`,
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

  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const books = activeTab === 'borrow' ? borrowBooks : digitalBooks;
  const isDigitalTab = activeTab === 'digital';

  const loadBooks = async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      setLoadError(null);
      if (activeTab === 'digital') {
        const digital = await fetchDigitalResourceBooks(page, debouncedSearchTerm, 10, selectedCategory);
        setDigitalBooks(digital.data);
        if (digital.meta) {
          setTotalPages(digital.meta.last_page);
          setTotalRecords(digital.meta.total);
        }
      } else {
        const borrowable = await fetchBorrowableBooks(page, debouncedSearchTerm, 10, selectedCategory);
        setBorrowBooks(borrowable.data);
        if (borrowable.meta) {
          setTotalPages(borrowable.meta.last_page);
          setTotalRecords(borrowable.meta.total);
        }
      }
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể tải dữ liệu quản lý sách.');
      setLoadError(message);
      emitToast({ tone: 'error', title: 'Không thể tải danh sách sách', message });
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadBooks();
  }, [activeTab, page, debouncedSearchTerm, selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setActiveTab(searchParams.get('tab') === 'digital' ? 'digital' : 'borrow');
    setPage(1);
  }, [searchParams]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const updateTab = (tab: InventoryTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    nextParams.delete('search');
    setSearchParams(nextParams, { replace: true });
    setActiveTab(tab);
    setSearchTerm('');
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setIsFiltering(true);

    startTransition(() => {
      setSearchTerm(value);
      setPage(1);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', activeTab);

      if (value.trim()) {
        nextParams.set('search', value);
      } else {
        nextParams.delete('search');
      }

      setSearchParams(nextParams, { replace: true });
      setIsFiltering(false);
    });
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormData({
      ...EMPTY_FORM,
      quantity: activeTab === 'borrow' ? 1 : 0,
      category: activeTab === 'borrow' ? 'Giáo trình' : 'PDF',
    });
    setSelectedDigitalFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (book: FormattedBook) => {
    setModalMode('edit');
    setFormData(toFormData(book));
    setSelectedDigitalFile(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedDigitalFile(null);
  };

  const promptDelete = (book: FormattedBook) => {
    setBookToDelete(book);
    setIsConfirmDeleteOpen(true);
  };

  const cancelDelete = () => {
    setIsConfirmDeleteOpen(false);
    setBookToDelete(null);
  };

  const handleDelete = async () => {
    const book = bookToDelete;
    if (!book) return;

    cancelDelete();

    try {
      await deleteBook(book.id);
      await loadBooks(false);
      emitToast({
        tone: 'success',
        title: 'Đã xóa sách',
        message: `Đã xóa "${book.title}".`,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể xóa sách này.');
      emitToast({ tone: 'error', title: 'Không thể xóa sách', message });
    }
  };

  const handleGenerateAiMetadata = async (book: FormattedBook) => {
    setAiActionId(book.id);

    try {
      const response = await generateBookMetadata(book.id);
      const updateList = (items: FormattedBook[]) =>
        items.map((item) => (item.id === response.book.id ? { ...item, ...response.book } : item));

      setBorrowBooks(updateList);
      setDigitalBooks(updateList);
      emitToast({
        tone: 'success',
        title: 'Đã tạo metadata AI',
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể tạo metadata AI cho tài liệu này.');
      emitToast({ tone: 'error', title: 'Không thể tạo metadata AI', message });
    } finally {
      setAiActionId(null);
    }
  };

  const handleGenerateAllAiMetadata = async () => {
    setIsGeneratingAll(true);

    try {
      const response = await generateAllBooksMetadata();
      await loadBooks(false);
      emitToast({
        tone: 'success',
        title: 'Đã tạo metadata AI hàng loạt',
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể tạo metadata AI hàng loạt.');
      emitToast({ tone: 'error', title: 'Không thể tạo metadata AI hàng loạt', message });
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleCompleteRepair = async (book: FormattedBook) => {
    setRepairActionId(book.id);
    try {
      const { completeBookRepair } = await import('../../api/borrowApi');
      const response = await completeBookRepair(book.id);
      await loadBooks(false);
      emitToast({
        tone: 'success',
        title: 'Hoàn tất sửa sách',
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }
      const message = getErrorMessage(error, 'Không thể hoàn thành sửa sách.');
      emitToast({ tone: 'error', title: 'Lỗi', message });
    } finally {
      setRepairActionId(null);
    }
  };

  const openCopiesDrawer = async (book: FormattedBook) => {
    setCopiesBook(book);
    setBookCopies([]);
    setNewCopyBarcode('');
    setIsCopiesLoading(true);

    try {
      const copies = await fetchBookCopies(book.id);
      setBookCopies(copies);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }
      const message = getErrorMessage(error, 'Không thể tải danh sách bản sao.');
      emitToast({ tone: 'error', title: 'Không thể tải bản sao', message });
    } finally {
      setIsCopiesLoading(false);
    }
  };

  const refreshCopiesDrawer = async () => {
    if (!copiesBook) return;
    const copies = await fetchBookCopies(copiesBook.id);
    setBookCopies(copies);
    await loadBooks(false);
  };

  const handleCopyFieldChange = async (
    copy: BookCopy,
    field: 'barcode' | 'status' | 'condition',
    value: string,
  ) => {
    if (!copiesBook) return;
    setCopyActionId(copy.id);
    try {
      await updateBookCopy(copiesBook.id, copy.id, { [field]: value });
      await refreshCopiesDrawer();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }
      const message = getErrorMessage(error, 'Không thể cập nhật bản sao.');
      emitToast({ tone: 'error', title: 'Không thể cập nhật bản sao', message });
    } finally {
      setCopyActionId(null);
    }
  };

  const handleAddCopy = async () => {
    if (!copiesBook) return;
    setCopyActionId('new');
    try {
      await addBookCopy(copiesBook.id, newCopyBarcode.trim() ? { barcode: newCopyBarcode.trim() } : {});
      setNewCopyBarcode('');
      await refreshCopiesDrawer();
      emitToast({ tone: 'success', title: 'Đã thêm bản sao', message: copiesBook.title });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }
      const message = getErrorMessage(error, 'Không thể thêm bản sao.');
      emitToast({ tone: 'error', title: 'Không thể thêm bản sao', message });
    } finally {
      setCopyActionId(null);
    }
  };

  const handleDeleteCopy = async (copy: BookCopy) => {
    if (!copiesBook) return;
    setCopyActionId(copy.id);
    try {
      await deleteBookCopy(copiesBook.id, copy.id);
      await refreshCopiesDrawer();
      emitToast({ tone: 'success', title: 'Đã xóa bản sao', message: copy.barcode });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }
      const message = getErrorMessage(error, 'Không thể xóa bản sao.');
      emitToast({ tone: 'error', title: 'Không thể xóa bản sao', message });
    } finally {
      setCopyActionId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isDigitalTab && modalMode === 'add' && !selectedDigitalFile) {
      emitToast({
        tone: 'error',
        title: 'Cần tệp số',
        message: 'Hãy chọn tệp PDF, EPUB, MP3, WAV, M4A hoặc slide trước khi lưu tài nguyên số này.',
      });
      return;
    }

    // Client-side file type validation before any API call
    if (isDigitalTab && selectedDigitalFile) {
      const allowedExtensions = ['pdf', 'epub', 'mp3', 'wav', 'm4a', 'ppt', 'pptx'];
      const ext = selectedDigitalFile.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExtensions.includes(ext)) {
        emitToast({
          tone: 'error',
          title: 'Định dạng không hợp lệ',
          message: `Tệp "${selectedDigitalFile.name}" không được hỗ trợ. Chỉ chấp nhận: PDF, EPUB, MP3, WAV, M4A, PPT, PPTX.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload(formData, activeTab);
      const savedBook =
        activeTab === 'borrow'
          ? modalMode === 'add'
            ? await addBorrowableBook(payload)
            : await updateBorrowableBook(formData.id, payload)
          : modalMode === 'add'
            ? await addDigitalResource(payload)
            : await updateDigitalResource(formData.id, payload);

      if (activeTab === 'digital' && selectedDigitalFile) {
        await uploadDigitalFile(savedBook.id, selectedDigitalFile);
      }

      const uploadedFormat = selectedDigitalFile
        ? determineCategory(selectedDigitalFile.name)
        : null;
      const isAudioUpload = uploadedFormat === 'AUDIO';

      closeModal();
      await loadBooks(false);
      emitToast({
        tone: 'success',
        title:
          activeTab === 'digital'
            ? isAudioUpload
              ? 'Đã lưu audio book'
              : 'Đã lưu tài nguyên số'
            : 'Đã lưu sách mượn',
        message:
          activeTab === 'digital'
            ? isAudioUpload
              ? 'Audio book và tệp âm thanh đã được cập nhật thành công.'
              : 'Thông tin và tệp tài nguyên số đã được cập nhật.'
            : 'Kho sách mượn đã được cập nhật.',
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể lưu bản ghi này.');
      emitToast({ tone: 'error', title: 'Không thể lưu bản ghi', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBarcodes = () => {
    if (books.length === 0) {
      emitToast({
        tone: 'info',
        title: 'Không có gì để in',
        message: 'Trang hiện tại không có dữ liệu.',
      });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=960,height=720');

    if (!printWindow) {
      emitToast({
        tone: 'error',
        title: 'Không thể mở cửa sổ in',
        message: 'Vui lòng cho phép cửa sổ bật lên để in nhãn mã vạch.',
      });
      return;
    }

    const labels = books
      .map((book) => {
        const code = `SACH-${String(book.id).padStart(5, '0')}`;
        const barcodeForFont = `*${code}*`;

        return `
          <article class="label">
            <strong>${escapeHtml(book.title)}</strong>
            <small>${escapeHtml(book.author)} | ${escapeHtml(book.location)}</small>
            <div class="barcode-font">${escapeHtml(barcodeForFont)}</div>
            <code>${escapeHtml(code)}</code>
          </article>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Mã vạch sách</title>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body { margin: 24px; font-family: Arial, sans-serif; color: #111827; }
            h1 { margin: 0 0 16px; font-size: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .label { min-height: 150px; border: 1px dashed #94a3b8; padding: 12px; page-break-inside: avoid; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            strong { display: block; font-size: 12px; line-height: 1.3; min-height: 32px; font-weight: 700; width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
            small { display: block; margin-top: 4px; color: #64748b; font-size: 10px; }
            .barcode-font { font-family: 'Libre Barcode 39', cursive; font-size: 38px; line-height: 1; margin: 8px 0; }
            code { font-size: 11px; font-weight: 700; font-family: monospace; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>Nhãn mã vạch sách</h1>
          <main class="grid">${labels}</main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handlePrintSingleCopy = (copy: BookCopy) => {
    if (!copiesBook) return;

    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) {
      emitToast({
        tone: 'error',
        title: 'Không thể mở cửa sổ in',
        message: 'Vui lòng cho phép cửa sổ bật lên để in nhãn mã vạch.',
      });
      return;
    }

    const code = copy.barcode.toUpperCase();
    const barcodeForFont = `*${code}*`;

    const labelHtml = `
      <article class="label">
        <strong>${escapeHtml(copiesBook.title)}</strong>
        <small>${escapeHtml(copiesBook.author)} | Kệ: ${escapeHtml(copiesBook.location)}</small>
        <div class="barcode-font">${escapeHtml(barcodeForFont)}</div>
        <code>${escapeHtml(code)}</code>
        <small style="margin-top: 4px;">Tình trạng: ${escapeHtml(copy.condition === 'good' ? 'Tốt' : copy.condition === 'damaged' ? 'Hỏng' : 'Mất')}</small>
      </article>
    `;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>In mã vạch bản sao</title>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body { margin: 24px; font-family: Arial, sans-serif; color: #111827; }
            h1 { margin: 0 0 16px; font-size: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .label { min-height: 150px; border: 1px dashed #94a3b8; padding: 12px; page-break-inside: avoid; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            strong { display: block; font-size: 12px; line-height: 1.3; font-weight: 700; width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
            small { display: block; margin-top: 4px; color: #64748b; font-size: 10px; }
            .barcode-font { font-family: 'Libre Barcode 39', cursive; font-size: 38px; line-height: 1; margin: 8px 0; }
            code { font-size: 11px; font-weight: 700; font-family: monospace; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>Nhãn mã vạch bản sao</h1>
          <main class="grid">${labelHtml}</main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  const handlePrintAllCopies = () => {
    if (!copiesBook || bookCopies.length === 0) {
      emitToast({
        tone: 'info',
        title: 'Không có bản sao',
        message: 'Không có bản sao nào để in.',
      });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=960,height=720');
    if (!printWindow) {
      emitToast({
        tone: 'error',
        title: 'Không thể mở cửa sổ in',
        message: 'Vui lòng cho phép cửa sổ bật lên để in nhãn mã vạch.',
      });
      return;
    }

    const labels = bookCopies
      .map((copy) => {
        const code = copy.barcode.toUpperCase();
        const barcodeForFont = `*${code}*`;

        return `
          <article class="label">
            <strong>${escapeHtml(copiesBook.title)}</strong>
            <small>${escapeHtml(copiesBook.author)} | Kệ: ${escapeHtml(copiesBook.location)}</small>
            <div class="barcode-font">${escapeHtml(barcodeForFont)}</div>
            <code>${escapeHtml(code)}</code>
            <small style="margin-top: 4px;">Tình trạng: ${escapeHtml(copy.condition === 'good' ? 'Tốt' : copy.condition === 'damaged' ? 'Hỏng' : 'Mất')}</small>
          </article>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>In tất cả mã vạch bản sao</title>
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; }
            body { margin: 24px; font-family: Arial, sans-serif; color: #111827; }
            h1 { margin: 0 0 16px; font-size: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .label { min-height: 150px; border: 1px dashed #94a3b8; padding: 12px; page-break-inside: avoid; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            strong { display: block; font-size: 12px; line-height: 1.3; font-weight: 700; width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
            small { display: block; margin-top: 4px; color: #64748b; font-size: 10px; }
            .barcode-font { font-family: 'Libre Barcode 39', cursive; font-size: 38px; line-height: 1; margin: 8px 0; }
            code { font-size: 11px; font-weight: 700; font-family: monospace; }
            @media print { body { margin: 12mm; } }
          </style>
        </head>
        <body>
          <h1>Nhãn mã vạch bản sao - ${escapeHtml(copiesBook.title)}</h1>
          <main class="grid">${labels}</main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Quản lý sách</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quản lý kho sách vật lý tách riêng khỏi các tệp PDF/âm thanh tải xuống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Unified Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-surface-container-high/60 bg-surface-container-lowest/80 p-1.5 backdrop-blur-sm scholar-shadow">
            {/* Conditional scanner and barcode actions */}
            {activeTab === 'borrow' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex h-9 items-center gap-1.5 px-3 rounded-xl text-indigo-600 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                  title="Quét mã vạch"
                >
                  <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
                  <span className="text-xs font-bold uppercase tracking-wider hidden lg:inline">Quét mã</span>
                </button>
                
                <button
                  type="button"
                  onClick={handlePrintBarcodes}
                  className="flex h-9 items-center gap-1.5 px-3 rounded-xl text-slate-600 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                  title="In nhãn mã vạch"
                >
                  <span className="material-symbols-outlined text-[20px]">print</span>
                  <span className="text-xs font-bold uppercase tracking-wider hidden lg:inline">In mã vạch</span>
                </button>
                
                <div className="h-5 w-[1px] bg-surface-container-high/80 mx-1 hidden lg:block" />
              </>
            )}

            {/* Import CSV */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl text-emerald-600 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              title="Nhập sách từ tệp CSV"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">upload_file</span>
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Nhập CSV</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex h-9 items-center gap-1.5 px-3 rounded-xl text-blue-600 transition-all hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              title="Xuất sách ra tệp CSV"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">file_download</span>
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Xuất CSV</span>
            </button>

            <div className="h-5 w-[1px] bg-surface-container-high/80 mx-1" />

            {/* AI Generator Button */}
            <button
              type="button"
              disabled={isGeneratingAll}
              onClick={handleGenerateAllAiMetadata}
              className={`flex h-9 items-center gap-1.5 px-3 rounded-xl text-purple-600 transition-all hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:scale-[1.03] active:scale-[0.97] disabled:cursor-wait disabled:opacity-60 cursor-pointer ${
                isGeneratingAll ? 'bg-purple-50 animate-pulse' : ''
              }`}
              title={isGeneratingAll ? "Đang xử lý AI..." : "Tạo Tóm tắt & Nhãn AI cho toàn bộ sách"}
            >
              <span className={`material-symbols-outlined text-[20px] ${isGeneratingAll ? 'animate-spin' : ''}`}>
                {isGeneratingAll ? 'progress_activity' : 'auto_awesome'}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider hidden md:inline">Tạo AI tất cả</span>
            </button>
          </div>

          {/* Primary Action Button: Add */}
          <button
            type="button"
            aria-label={isDigitalTab ? 'Thêm tài nguyên số' : 'Thêm sách mượn'}
            onClick={openAddModal}
            className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 font-semibold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            {isDigitalTab ? 'Thêm tài nguyên số' : 'Thêm sách mượn'}
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Loại quản lý sách"
        className="flex w-fit gap-2 rounded-xl bg-surface-container-low p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'borrow'}
          onClick={() => updateTab('borrow')}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'borrow'
              ? 'bg-surface-bright text-primary scholar-shadow'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Sách mượn
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'digital'}
          onClick={() => updateTab('digital')}
          className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
            activeTab === 'digital'
              ? 'bg-surface-bright text-primary scholar-shadow'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Tài nguyên số
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-surface-container-low bg-surface-bright scholar-shadow">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container bg-slate-50/50 p-6">
          <div className="flex flex-wrap items-center gap-3 w-full flex-1 md:max-w-2xl">
            <div className="relative flex-1 min-w-[240px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                type="text"
                placeholder={
                  isDigitalTab
                    ? 'Tìm theo tiêu đề, tác giả, định dạng...'
                    : 'Tìm theo tiêu đề, tác giả, kệ...'
                }
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-full rounded-xl border border-surface-container-high bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="relative shrink-0 min-w-[200px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                filter_alt
              </span>
              <select
                aria-label="Lọc theo thể loại"
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-xl border border-surface-container-high bg-white py-2.5 pl-9 pr-8 text-sm outline-none transition-all focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer font-semibold text-slate-600"
              >
                <option value="all">Tất cả thể loại</option>
                {BOOK_CLASSIFICATIONS.map((item) => (
                  <option key={item.code} value={item.genre}>
                    {item.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">
                arrow_drop_down
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-outline">
            {isFiltering ? 'Đang tải...' : `${totalRecords} bản ghi`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-container bg-surface-container-low text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                <th className="px-6 py-4">Bìa</th>
                <th className="px-6 py-4">Chi tiết</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">{isDigitalTab ? 'Tệp số' : 'Kệ'}</th>
                <th className="px-6 py-4">{isDigitalTab ? 'Lượt tải' : 'Tình trạng'}</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-outline">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <EmptyState icon="error" title="Không thể tải dữ liệu" message={loadError} />
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8">
                    <EmptyState
                      icon="search_off"
                      title={isDigitalTab ? 'Không tìm thấy tài nguyên số' : 'Không tìm thấy sách mượn'}
                      message={
                        isDigitalTab
                          ? 'Tải lên tệp PDF/âm thanh hoặc đổi từ khóa tìm kiếm.'
                          : 'Thêm sách mượn hoặc đổi từ khóa tìm kiếm.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book.id} className="transition-all hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="h-16 w-12 overflow-hidden rounded-lg border border-surface-container bg-surface-container-high shadow-sm">
                        <img
                          src={book.cover}
                          alt={book.title}
                          onError={(event) => applyImageFallback(event.currentTarget)}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="line-clamp-1 text-sm font-bold text-on-surface">
                          {book.title}
                        </p>
                        <p className="mt-0.5 text-xs text-outline">Tác giả: {book.author}</p>
                        <p className="mt-1 inline-block rounded bg-primary/5 px-2 py-0.5 font-mono text-[10px] text-primary">
                          Mã: {book.id}
                        </p>
                        {(book.ai_tags?.length ?? 0) > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {book.ai_tags?.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-md border border-surface-container bg-surface-container-high px-2 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                        {book.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      {isDigitalTab ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-on-surface">
                            {book.digital_file_name || 'Chưa đính kèm tệp'}
                          </p>
                          <p className="text-outline">
                            {[book.file_format, book.file_size].filter(Boolean).join(' - ') || 'Chờ tải lên'}
                          </p>
                        </div>
                      ) : (
                        book.location
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isDigitalTab ? (
                        <span className="text-xs font-bold text-slate-700">
                          {Number(book.download_count ?? 0).toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${book.statusColor}`} />
                            <span className="text-xs font-bold text-slate-700">{book.status}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-outline">
                            {book.available_quantity}/{book.quantity} bản
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isDigitalTab && (
                          <button
                            type="button"
                            onClick={() => openCopiesDrawer(book)}
                            className="rounded-lg p-2 text-indigo-600 transition-all hover:bg-indigo-50"
                            title="Xem bản sao"
                            aria-label={`Xem bản sao ${book.title}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                          </button>
                        )}
                        {!isDigitalTab && book.repairing_quantity > 0 && (
                          <button
                            type="button"
                            onClick={() => handleCompleteRepair(book)}
                            disabled={repairActionId === book.id}
                            className="rounded-lg p-2 text-amber-600 transition-all hover:bg-amber-50 disabled:cursor-wait disabled:opacity-60"
                            title="Hoàn thành sửa sách"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {repairActionId === book.id ? 'progress_activity' : 'build'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleGenerateAiMetadata(book)}
                          disabled={aiActionId === book.id}
                          className="rounded-lg p-2 text-purple-600 transition-all hover:bg-purple-50 disabled:cursor-wait disabled:opacity-60"
                          title="Tạo metadata AI"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {aiActionId === book.id ? 'progress_activity' : 'auto_awesome'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(book)}
                          className="rounded-lg p-2 text-primary transition-all hover:bg-primary-container"
                          title="Sửa"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => promptDelete(book)}
                          className="rounded-lg p-2 text-red-500 transition-all hover:bg-red-50"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-surface-container bg-white p-4">
          <p className="text-xs font-medium text-outline">
            Tổng cộng: {totalRecords} bản ghi
          </p>
          <div className="flex gap-1">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </section>

      {copiesBook ? (
        <div role="dialog" aria-modal="true" aria-labelledby="book-copies-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-surface-container bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-surface-container p-5">
              <div>
                <h3 id="book-copies-title" className="text-lg font-bold text-slate-900">Bản sao vật lý</h3>
                <p className="mt-1 text-sm text-slate-600">{copiesBook.title}</p>
              </div>
              <button type="button" onClick={() => setCopiesBook(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-surface-container bg-slate-50/70 p-4">
              <input
                aria-label="Mã vạch bản sao mới"
                value={newCopyBarcode}
                onChange={(event) => setNewCopyBarcode(event.target.value)}
                className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                placeholder="Để trống để tự sinh mã"
              />
              <button type="button" onClick={handleAddCopy} disabled={copyActionId === 'new'}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">add</span>
                {copyActionId === 'new' ? 'Đang thêm...' : 'Thêm bản sao'}
              </button>
              {bookCopies.length > 0 && (
                <button type="button" onClick={handlePrintAllCopies}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  In tất cả nhãn
                </button>
              )}
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Mã vạch</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3">Tình trạng</th>
                    <th className="px-4 py-3">Ngày thêm</th>
                    <th className="px-4 py-3">Lần cuối mượn</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isCopiesLoading ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Đang tải bản sao...</td></tr>
                  ) : bookCopies.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8"><EmptyState icon="qr_code_2" title="Chưa có bản sao" message="Thêm bản sao vật lý để quản lý mã vạch cho đầu sách này." /></td></tr>
                  ) : (
                    bookCopies.map((copy, index) => (
                      <tr key={copy.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-semibold text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`Mã vạch ${copy.barcode}`}
                            defaultValue={copy.barcode}
                            disabled={copyActionId === copy.id}
                            onBlur={(event) => {
                              const next = event.currentTarget.value.trim();
                              if (next && next !== copy.barcode) void handleCopyFieldChange(copy, 'barcode', next);
                            }}
                            className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs outline-none focus:border-primary"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Trạng thái ${copy.barcode}`}
                            value={copy.status}
                            disabled={copyActionId === copy.id || copy.status === 'borrowed'}
                            onChange={(event) => void handleCopyFieldChange(copy, 'status', event.target.value)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
                          >
                            {COPY_STATUSES.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Tình trạng ${copy.barcode}`}
                            value={copy.condition}
                            disabled={copyActionId === copy.id}
                            onChange={(event) => void handleCopyFieldChange(copy, 'condition', event.target.value)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold outline-none focus:border-primary"
                          >
                            {COPY_CONDITIONS.map((condition) => (
                              <option key={condition} value={condition}>{condition}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{copy.added_at ? copy.added_at.slice(0, 10) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{copy.last_checked_out_at ? copy.last_checked_out_at.slice(0, 10) : '—'}</td>
                        <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                          <button type="button" onClick={() => handlePrintSingleCopy(copy)}
                            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
                            title="In mã vạch bản sao">
                            <span className="material-symbols-outlined text-[18px]">print</span>
                          </button>
                          <button type="button" onClick={() => void handleDeleteCopy(copy)}
                            disabled={copy.status === 'borrowed' || copyActionId === copy.id}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            title={copy.status === 'borrowed' ? 'Không thể xóa bản sao đang mượn' : 'Xóa bản sao'}>
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa sách "${bookToDelete?.title}" không? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa sách"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-surface-container bg-slate-50 p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {modalMode === 'add'
                  ? isDigitalTab
                    ? 'Thêm tài nguyên số'
                    : 'Thêm sách mượn'
                  : isDigitalTab
                    ? 'Cập nhật tài nguyên số'
                    : 'Cập nhật sách mượn'}
              </h3>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="book-title" className="mb-1 block text-xs font-bold text-slate-600">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="book-title"
                    aria-label="Tiêu đề sách"
                    required
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({ ...formData, title: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="book-author" className="mb-1 block text-xs font-bold text-slate-600">
                    Tác giả <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="book-author"
                    aria-label="Tác giả sách"
                    required
                    type="text"
                    value={formData.author}
                    onChange={(event) =>
                      setFormData({ ...formData, author: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="col-span-1">
                  <label htmlFor="book-category" className="mb-1 block text-xs font-bold text-slate-600">
                    {isDigitalTab ? 'Loại tài nguyên (Tự động)' : 'Danh mục'} <span className="text-red-500">*</span>
                  </label>
                  {isDigitalTab ? (
                    <input
                      id="book-category"
                      required
                      type="text"
                      disabled
                      placeholder="Tự động từ định dạng tệp"
                      value={formData.category}
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 text-slate-500 px-4 py-2 outline-none cursor-not-allowed font-medium"
                    />
                  ) : (
                    <select
                      id="book-category"
                      required
                      aria-label="Danh mục"
                      value={findClassification(formData.category).genre}
                      onChange={(event) => {
                        const nextCategory = event.target.value;
                        setFormData({
                          ...formData,
                          category: nextCategory,
                          location: getDefaultShelfForCategory(nextCategory),
                        });
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      {BOOK_CLASSIFICATIONS.map((classification) => (
                        <option key={classification.code} value={classification.genre}>
                          {classification.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {!isDigitalTab ? (
                  <>
                    <div className="col-span-1">
                      <label htmlFor="book-location" className="mb-1 block text-xs font-bold text-slate-600">
                        Vị trí kệ
                      </label>
                      <select
                        id="book-location"
                        aria-label="Vị trí sách"
                        value={formData.location}
                        onChange={(event) =>
                          setFormData({ ...formData, location: event.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      >
                        <option value="">Chọn kệ...</option>
                        {getShelvesForCategory(formData.category).map((shelf) => (
                          <option key={shelf.code} value={shelf.value}>
                            {shelf.label}
                          </option>
                        ))}
                        {formData.location && !getShelvesForCategory(formData.category).some(shelf => shelf.value === formData.location) && (
                          <option value={formData.location}>
                            {formData.location} (Hiện tại)
                          </option>
                        )}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label htmlFor="book-quantity" className="mb-1 block text-xs font-bold text-slate-600">
                        Số lượng <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="book-quantity"
                        required
                        type="number"
                        min="0"
                        value={formData.quantity}
                        onChange={(event) =>
                          setFormData({
                            ...formData,
                            quantity: parseInt(event.target.value, 10) || 0,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </>
                ) : null}

                <div className="col-span-1">
                  <label htmlFor="book-published-year" className="mb-1 block text-xs font-bold text-slate-600">
                    Năm xuất bản
                  </label>
                  <input
                    id="book-published-year"
                    type="number"
                    min="1900"
                    max="2100"
                    value={formData.published_year}
                    onChange={(event) =>
                      setFormData({ ...formData, published_year: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="book-cover" className="mb-1 block text-xs font-bold text-slate-600">
                    URL bìa
                  </label>
                  <input
                    id="book-cover"
                    type="text"
                    value={formData.cover}
                    onChange={(event) =>
                      setFormData({ ...formData, cover: event.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="https://..."
                  />
                </div>

                {isDigitalTab ? (
                  <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label htmlFor="book-digital-file" className="mb-2 block text-xs font-bold text-slate-600">
                      Tệp số {modalMode === 'add' ? <span className="text-red-500">*</span> : null}
                    </label>
                    <input
                      id="book-digital-file"
                      aria-label="Tệp số"
                      type="file"
                      accept=".pdf,.epub,.ppt,.pptx,.mp3,.wav,.m4a"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          const allowedExtensions = ['pdf', 'epub', 'ppt', 'pptx', 'mp3', 'wav', 'm4a'];
                          if (!ext || !allowedExtensions.includes(ext)) {
                            emitToast({
                              tone: 'error',
                              title: 'Định dạng tệp không hỗ trợ',
                              message: 'Hệ thống chỉ chấp nhận tệp PDF, EPUB, Slides (PPT/PPTX) hoặc Âm thanh (MP3/WAV/M4A).',
                            });
                            event.target.value = ''; // Reset file input
                            setSelectedDigitalFile(null);
                            return;
                          }
                          setSelectedDigitalFile(file);
                          const cat = determineCategory(file.name);
                          setFormData((prev) => ({ ...prev, category: cat }));
                        } else {
                          setSelectedDigitalFile(null);
                        }
                      }}
                      className="w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:opacity-90 cursor-pointer"
                    />
                    <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">
                      {selectedDigitalFile ? (
                        <span>
                          Đã chọn: {selectedDigitalFile.name} ({formatFileSize(selectedDigitalFile)})
                        </span>
                      ) : formData.digital_file_name ? (
                        <span>
                          Đã đính kèm: {formData.digital_file_name}
                          {formData.file_format ? ` - ${formData.file_format}` : ''}
                          {formData.file_size ? ` - ${formData.file_size}` : ''}
                        </span>
                      ) : (
                        <span>Chưa có tệp số đính kèm.</span>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-100 px-5 py-2.5 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  aria-label={isDigitalTab ? 'Lưu tài nguyên số' : 'Lưu sách mượn'}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-md shadow-primary/20 transition-all hover:opacity-90 active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting && (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  <span>
                    {isSubmitting
                      ? 'Đang lưu...'
                      : isDigitalTab
                      ? 'Lưu tài nguyên số'
                      : 'Lưu sách mượn'}
                  </span>
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
            onImportSuccess={() => void loadBooks(false)}
            entityType="book"
            importApiCall={importBooks}
            expectedFields={EXPECTED_FIELDS}
            sampleCSV={isDigitalTab ? SAMPLE_CSV_DIGITAL : SAMPLE_CSV_PHYSICAL}
            sampleFileName={isDigitalTab ? "mau_nhap_tai_nguyen_so.csv" : "mau_nhap_sach_muon.csv"}
          />
        )}

        {isExportModalOpen && (
          <CSVExportSelector
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            onExport={handleExportBooks}
            availableColumns={AVAILABLE_EXPORT_COLUMNS}
            defaultColumns={DEFAULT_EXPORT_COLUMNS}
            title={isDigitalTab ? "Xuất kho Tài nguyên số" : "Xuất kho Sách mượn"}
            description="Lọc và xuất danh sách các ấn phẩm/tài liệu ra tệp CSV để lưu trữ hoặc phân tích."
          />
        )}
      </AnimatePresence>

      {showScanner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Quét mã vạch sách vật lý</h3>
              <button type="button" onClick={() => setShowScanner(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="relative aspect-square w-full bg-black">
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) {
                    const scannedValue = result[0].rawValue.trim();
                    if (scannedValue.toUpperCase().startsWith('SACH-') || !isNaN(Number(scannedValue))) {
                      const searchVal = scannedValue.toUpperCase().startsWith('SACH-') ? scannedValue : `SACH-${scannedValue.padStart(5, '0')}`;
                      setShowScanner(false);
                      handleSearchChange(searchVal);
                      emitToast({
                        tone: 'success',
                        title: 'Đã nhận diện mã vạch',
                        message: `Đang lọc sách theo mã: ${searchVal}`,
                      });
                    } else {
                      emitToast({
                        tone: 'error',
                        title: 'Mã không hợp lệ',
                        message: 'Mã quét không khớp định dạng mã sách thư viện.',
                      });
                    }
                  }
                }}
                components={{ finder: true }}
              />
            </div>
            <div className="bg-slate-50 p-4 text-center text-sm text-slate-500">
              Đưa mã vạch in trên nhãn sách (SACH-XXXXX) vào khung camera để tìm nhanh trong danh mục.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
