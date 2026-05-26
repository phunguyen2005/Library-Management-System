import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminInventory from '../pages/admin/AdminInventory';
import type { FormattedBook } from '../types/book';

const borrowBook: FormattedBook = {
  id: 12,
  book_id: 12,
  title: 'Physical Algorithms',
  author: 'Library Admin',
  isbn: 'ISBN-12000',
  category: 'Technology',
  genre: 'Technology',
  location: 'Shelf B',
  status: 'San co',
  statusColor: 'bg-green-500',
  cover: 'https://example.com/cover.jpg',
  quantity: 3,
  available_quantity: 3,
  is_available: true,
  is_digital: false,
};

const uploadedBook: FormattedBook = {
  id: 99,
  book_id: 99,
  title: 'Digital Systems',
  author: 'Library Admin',
  isbn: 'ISBN-99000',
  category: 'Technology',
  genre: 'Technology',
  location: 'Shelf D',
  status: 'San co',
  statusColor: 'bg-green-500',
  cover: 'https://example.com/cover.jpg',
  quantity: 1,
  available_quantity: 1,
  is_available: true,
  is_digital: true,
  file_format: 'PDF',
  file_size: '12 KB',
  has_digital_file: true,
  digital_file_name: 'lesson.pdf',
};

const fetchBooksMock = vi.fn(async () => ({ data: [] }));
const fetchBorrowableBooksMock = vi.fn(async () => ({ data: [borrowBook] }));
const fetchDigitalResourceBooksMock = vi.fn(async () => ({ data: [] }));
const addBookMock = vi.fn(async (_payload: unknown) => uploadedBook);
const addBorrowableBookMock = vi.fn(async (_payload: unknown) => borrowBook);
const addDigitalResourceMock = vi.fn(async (_payload: unknown) => uploadedBook);
const updateBookMock = vi.fn(async (_bookId: unknown, _payload: unknown) => uploadedBook);
const updateBorrowableBookMock = vi.fn(async (_bookId: unknown, _payload: unknown) => borrowBook);
const updateDigitalResourceMock = vi.fn(async (_bookId: unknown, _payload: unknown) => uploadedBook);
const deleteBookMock = vi.fn(async (_bookId: unknown) => ({ message: 'Deleted' }));
const uploadDigitalFileMock = vi.fn(async (_bookId: unknown, _file: unknown) => uploadedBook);

vi.mock('../api/bookApi', () => ({
  fetchBooks: (page?: number, query?: string, limit?: number) =>
    Reflect.apply(fetchBooksMock, null, [page, query, limit]),
  fetchBorrowableBooks: (page?: number, query?: string, limit?: number) =>
    Reflect.apply(fetchBorrowableBooksMock, null, [page, query, limit]),
  fetchDigitalResourceBooks: (page?: number, query?: string, limit?: number) =>
    Reflect.apply(fetchDigitalResourceBooksMock, null, [page, query, limit]),
  addBook: (payload: unknown) => addBookMock(payload),
  addBorrowableBook: (payload: unknown) => addBorrowableBookMock(payload),
  addDigitalResource: (payload: unknown) => addDigitalResourceMock(payload),
  updateBook: (bookId: unknown, payload: unknown) => updateBookMock(bookId, payload),
  updateBorrowableBook: (bookId: unknown, payload: unknown) =>
    updateBorrowableBookMock(bookId, payload),
  updateDigitalResource: (bookId: unknown, payload: unknown) =>
    updateDigitalResourceMock(bookId, payload),
  deleteBook: (bookId: unknown) => deleteBookMock(bookId),
  uploadDigitalFile: (bookId: unknown, file: unknown) => uploadDigitalFileMock(bookId, file),
}));

vi.mock('../api/aiApi', () => ({
  generateBookMetadata: vi.fn(),
  generateAllBooksMetadata: vi.fn(),
}));

function renderAdminInventory() {
  return render(
    <MemoryRouter>
      <AdminInventory />
    </MemoryRouter>,
  );
}

describe('AdminInventory digital upload', () => {
  beforeEach(() => {
    fetchBooksMock.mockResolvedValue({ data: [] });
    fetchBorrowableBooksMock.mockResolvedValue({ data: [borrowBook] });
    fetchDigitalResourceBooksMock.mockResolvedValue({ data: [] });
    addBookMock.mockResolvedValue(uploadedBook);
    addBorrowableBookMock.mockResolvedValue(borrowBook);
    addDigitalResourceMock.mockResolvedValue(uploadedBook);
    updateBookMock.mockResolvedValue(uploadedBook);
    updateBorrowableBookMock.mockResolvedValue(borrowBook);
    updateDigitalResourceMock.mockResolvedValue(uploadedBook);
    deleteBookMock.mockResolvedValue({ message: 'Deleted' });
    uploadDigitalFileMock.mockResolvedValue(uploadedBook);
  });

  it('renders separate tabs for borrow books and digital resources', async () => {
    renderAdminInventory();

    expect(await screen.findByRole('tab', { name: 'Sách mượn' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tài nguyên số' })).toBeInTheDocument();
  });

  it('creates a borrow book without uploading a digital file', async () => {
    const user = userEvent.setup();

    renderAdminInventory();

    await waitFor(() => expect(fetchBorrowableBooksMock).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Thêm sách mượn' }));
    await user.type(screen.getByLabelText('Tiêu đề sách'), 'Physical Algorithms');
    await user.type(screen.getByLabelText('Tác giả sách'), 'Library Admin');
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Danh mục' }),
      'Công nghệ - Kỹ thuật',
    );
    await user.selectOptions(screen.getByLabelText('Vị trí sách'), 'Kệ C2');
    await user.click(screen.getByRole('button', { name: 'Lưu sách mượn' }));

    await waitFor(() => {
      expect(addBorrowableBookMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Physical Algorithms',
          genre: 'Công nghệ - Kỹ thuật',
          location: 'Kệ C2',
        }),
      );
      expect(uploadDigitalFileMock).not.toHaveBeenCalled();
    });
  });

  it('limits borrow book category and shelf choices to the library map groups', async () => {
    const user = userEvent.setup();

    renderAdminInventory();

    await waitFor(() => expect(fetchBorrowableBooksMock).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Thêm sách mượn' }));

    const categorySelect = screen.getByRole('combobox', { name: 'Danh mục' });
    expect(categorySelect).toHaveDisplayValue('G - Giáo trình Đại học');
    expect(screen.getByRole('option', { name: 'C - Công nghệ - Kỹ thuật' })).toBeInTheDocument();

    await user.selectOptions(categorySelect, 'Công nghệ - Kỹ thuật');

    const shelfSelect = screen.getByLabelText('Vị trí sách');
    expect(shelfSelect).toHaveDisplayValue('Kệ C1 (CN-KT - Công nghệ - Kỹ thuật)');
    expect(screen.getByRole('option', { name: 'Kệ C1 (CN-KT - Công nghệ - Kỹ thuật)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Kệ B1/ })).not.toBeInTheDocument();
  });

  it('uploads a selected digital file after creating a digital resource', async () => {
    const user = userEvent.setup();
    const file = new File(['%PDF-1.4 test'], 'lesson.pdf', { type: 'application/pdf' });

    renderAdminInventory();

    await waitFor(() => expect(fetchBorrowableBooksMock).toHaveBeenCalled());
    await user.click(screen.getByRole('tab', { name: 'Tài nguyên số' }));
    await user.click(screen.getByRole('button', { name: 'Thêm tài nguyên số' }));
    await user.type(screen.getByLabelText('Tiêu đề sách'), 'Digital Systems');
    await user.type(screen.getByLabelText('Tác giả sách'), 'Library Admin');
    await user.upload(screen.getByLabelText('Tệp số'), file);
    await user.click(screen.getByRole('button', { name: 'Lưu tài nguyên số' }));

    await waitFor(() => {
      expect(addDigitalResourceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Digital Systems',
        }),
      );
      expect(uploadDigitalFileMock).toHaveBeenCalledWith(99, file);
    });
  });
});
