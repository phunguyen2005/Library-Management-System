import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { requestBorrow, getMyRequests, type MemberRequest } from '../../api/borrowApi';
import { fetchBorrowableBooks } from '../../api/bookApi';
import {
  addFavoriteBook,
  fetchFavoriteBooks,
  mergeFavoriteState,
  removeFavoriteBook,
} from '../../api/favoriteApi';
import { fetchBookReviews, submitBookReview, type ReviewRecord } from '../../api/reviewApi';
import { reserveBook, cancelReservation, fetchMyReservations, type ReservationRecord } from '../../api/reservationApi';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import StarRating from '../../components/StarRating';
import LibraryMapModal from '../../components/LibraryMapModal';
import { applyImageFallback } from '../../lib/display';
import { getErrorMessage, isUnauthorizedError } from '../../lib/errors';
import { BOOK_CLASSIFICATIONS } from '../../lib/bookClassification';
import { emitToast } from '../../notifications/events';
import type { FormattedBook } from '../../types/book';
import type { PaginationMeta } from '../../types/pagination';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type SortKey = 'title' | 'newest' | 'available';

const PAGE_SIZE = 12;

const AVAILABILITY_OPTIONS: Array<{ label: string; value: AvailabilityFilter }> = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Còn sách', value: 'available' },
  { label: 'Hết sách', value: 'unavailable' },
];

const SORT_OPTIONS: Array<{ label: string; value: SortKey }> = [
  { label: 'Tên A-Z', value: 'title' },
  { label: 'Năm xuất bản mới', value: 'newest' },
  { label: 'Còn nhiều bản nhất', value: 'available' },
];

function readAvailability(value: string | null): AvailabilityFilter {
  return value === 'available' || value === 'unavailable' ? value : 'all';
}

function readSort(value: string | null): SortKey {
  return value === 'newest' || value === 'available' ? value : 'title';
}

function readPage(value: string | null): number {
  const page = Number(value);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeSearchQuery(value: string): string {
  return value.normalize('NFC');
}

export default function Catalog() {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';
  const availability = readAvailability(searchParams.get('availability'));
  const sort = readSort(searchParams.get('sort'));
  const page = readPage(searchParams.get('page'));
  const [searchInput, setSearchInput] = useState(() => normalizeSearchQuery(query));
  const [isComposingSearch, setIsComposingSearch] = useState(false);
  const [selectedBook, setSelectedBook] = useState<FormattedBook | null>(null);
  const [books, setBooks] = useState<FormattedBook[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [myRequests, setMyRequests] = useState<MemberRequest[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapHighlight, setMapHighlight] = useState<string | null>(null);
  const [mapBookTitle, setMapBookTitle] = useState<string | null>(null);

  // Autocomplete suggestions
  const [suggestions, setSuggestions] = useState<FormattedBook[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const favoriteBooksRef = useRef<FormattedBook[]>([]);
  const previousQueryRef = useRef(query);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (query === previousQueryRef.current) {
      return;
    }

    previousQueryRef.current = query;

    const normalizedQuery = normalizeSearchQuery(query);
    if (!isComposingSearch && normalizedQuery !== normalizeSearchQuery(searchInput).trim()) {
      setSearchInput(normalizedQuery);
    }
  }, [isComposingSearch, query, searchInput]);

  useEffect(() => {
    if (isComposingSearch) {
      return;
    }

    const nextQuery = normalizeSearchQuery(searchInput).trim();
    const currentQuery = normalizeSearchQuery(query);

    if (nextQuery === currentQuery) {
      return;
    }

    const handler = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams);

      if (nextQuery) {
        nextParams.set('q', nextQuery);
      } else {
        nextParams.delete('q');
      }

      nextParams.delete('book');
      nextParams.delete('page');
      setSelectedBook(null);
      setSearchParams(nextParams, { replace: true });
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [isComposingSearch, query, searchInput, searchParams, setSearchParams]);

  useEffect(() => {
    if (isComposingSearch) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingSuggestions(false);
      return;
    }

    const autocompleteQuery = normalizeSearchQuery(searchInput).trim();

    if (autocompleteQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingSuggestions(false);
      return;
    }

    setIsSearchingSuggestions(true);
    const handler = setTimeout(async () => {
      try {
        const { autocompleteBooks } = await import('../../api/bookApi');
        const results = await autocompleteBooks(autocompleteQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (e) {
        // Ignore
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [isComposingSearch, searchInput]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [favoriteActionId, setFavoriteActionId] = useState<number | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    let isActive = true;

    Promise.all([
      fetchFavoriteBooks(),
      fetchMyReservations(),
      getMyRequests(),
    ])
      .then(([favoriteBooks, userReservations, requests]) => {
        if (!isActive) {
          return;
        }

        favoriteBooksRef.current = favoriteBooks;
        setBooks((current) => mergeFavoriteState(current, favoriteBooks));
        setReservations(userReservations);
        setMyRequests(requests);
      })
      .catch((error: unknown) => {
        if (isUnauthorizedError(error) || !isActive) {
          return;
        }

        const message = getErrorMessage(error, 'Không thể tải danh mục sách.');
        emitToast({ tone: 'error', title: 'Không thể tải danh mục', message });
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    const isAvailable =
      availability === 'all' ? undefined : availability === 'available';

    setIsLoading(true);
    setLoadError(null);

    fetchBorrowableBooks(page, query, PAGE_SIZE, category, sort, isAvailable)
      .then((booksResponse) => {
        if (!isActive) {
          return;
        }

        setBooks(mergeFavoriteState(booksResponse.data, favoriteBooksRef.current));
        setPaginationMeta(
          booksResponse.meta ?? {
            current_page: page,
            last_page: 1,
            per_page: PAGE_SIZE,
            total: booksResponse.data.length,
          },
        );
      })
      .catch((error: unknown) => {
        if (isUnauthorizedError(error) || !isActive) {
          return;
        }

        const message = getErrorMessage(error, 'Không thể tải danh mục sách.');
        setLoadError(message);
        emitToast({ tone: 'error', title: 'Không thể tải danh mục', message });
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [availability, category, page, query, sort]);

  useEffect(() => {
    const selectedId = Number(searchParams.get('book'));

    if (!selectedId || books.length === 0) {
      return;
    }

    const match = books.find((book) => book.id === selectedId);

    if (match) {
      setSelectedBook(match);
    }
  }, [books, searchParams]);

  useEffect(() => {
    if (selectedBook) {
      setReviews([]);
      fetchBookReviews(selectedBook.id)
        .then((res) => setReviews(res.data))
        .catch(() => {});
      
      // Reset review form inputs when switching books
      setNewRating(5);
      setNewComment('');
    } else {
      setReviews([]);
    }
  }, [selectedBook]);

  const currentPage = paginationMeta?.current_page ?? page;
  const totalPages = paginationMeta?.last_page ?? 1;
  const totalRecords = paginationMeta?.total ?? books.length;

  const updateFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);

    if (!value || value === 'all' || (key === 'sort' && value === 'title')) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    if (key !== 'book') {
      nextParams.delete('book');
      nextParams.delete('page');
      setSelectedBook(null);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    setSearchInput('');
    setSelectedBook(null);
    setSearchParams({}, { replace: true });
  };

  const openBook = (book: FormattedBook) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('book', String(book.id));
    setSelectedBook(book);
    setSearchParams(nextParams, { replace: true });
  };

  const closeBook = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('book');
    setSelectedBook(null);
    setSearchParams(nextParams, { replace: true });
  };

  const handlePageChange = (nextPage: number) => {
    const boundedPage = Math.max(1, Math.min(nextPage, totalPages));
    const nextParams = new URLSearchParams(searchParams);

    if (boundedPage <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(boundedPage));
    }

    nextParams.delete('book');
    setSelectedBook(null);
    setSearchParams(nextParams, { replace: true });
  };

  const handleBorrow = async () => {
    if (!selectedBook || !selectedBook.is_available) {
      return;
    }

    setIsBorrowing(true);

    try {
      const response = await requestBorrow(selectedBook.id);
      emitToast({
        tone: 'success',
        title: 'Đã gửi yêu cầu mượn',
        message: response.message,
      });
      closeBook();
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Lỗi khi yêu cầu mượn sách');
      emitToast({
        tone: 'error',
        title: 'Không thể gửi yêu cầu mượn',
        message,
      });
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedBook) return;
    setIsReserving(true);
    try {
      const response = await reserveBook(selectedBook.id);
      setReservations((prev) => [...prev, response.reservation]);
      emitToast({
        tone: 'success',
        title: 'Đặt chỗ thành công',
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      const message = getErrorMessage(error, 'Lỗi khi đặt chỗ sách.');
      emitToast({ tone: 'error', title: 'Không thể đặt chỗ', message });
    } finally {
      setIsReserving(false);
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    setIsReserving(true);
    try {
      const response = await cancelReservation(reservationId);
      setReservations((prev) => prev.filter((r) => r.reservation_id !== reservationId));
      emitToast({
        tone: 'success',
        title: 'Đã hủy đặt chỗ',
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      const message = getErrorMessage(error, 'Lỗi khi hủy đặt chỗ.');
      emitToast({ tone: 'error', title: 'Không thể hủy đặt chỗ', message });
    } finally {
      setIsReserving(false);
    }
  };

  const handleSubmitReview = async (loanId: number) => {
    if (!selectedBook) return;
    setIsSubmittingReview(true);
    try {
      const response = await submitBookReview(
        selectedBook.id,
        newRating,
        newComment.trim() || null,
        loanId
      );
      
      setReviews((prev) => [response.review, ...prev]);
      
      setBooks((current) =>
        current.map((b) =>
          b.id === selectedBook.id
            ? { ...b, avg_rating: response.avg_rating, reviews_count: response.reviews_count }
            : b
        )
      );

      setSelectedBook((current) =>
        current
          ? { ...current, avg_rating: response.avg_rating, reviews_count: response.reviews_count }
          : null
      );

      const updatedRequests = await getMyRequests();
      setMyRequests(updatedRequests);

      emitToast({
        tone: 'success',
        title: 'Đánh giá thành công',
        message: response.message,
      });
      setNewComment('');
      setNewRating(5);
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) return;
      const message = getErrorMessage(error, 'Không thể gửi đánh giá.');
      emitToast({ tone: 'error', title: 'Gửi đánh giá thất bại', message });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const syncFavoriteBook = (updatedBook: FormattedBook) => {
    setBooks((current) =>
      current.map((book) => (book.id === updatedBook.id ? { ...book, ...updatedBook } : book)),
    );
    setSelectedBook((current) =>
      current?.id === updatedBook.id ? { ...current, ...updatedBook } : current,
    );
  };

  const handleToggleFavorite = async (book: FormattedBook) => {
    setFavoriteActionId(book.id);

    try {
      const response = book.is_favorite
        ? await removeFavoriteBook(book.id)
        : await addFavoriteBook(book.id);

      syncFavoriteBook(response.book);
      emitToast({
        tone: 'success',
        title: response.book.is_favorite ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích',
        message: response.message,
      });
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) {
        return;
      }

      const message = getErrorMessage(error, 'Không thể cập nhật sách yêu thích.');
      emitToast({ tone: 'error', title: 'Không thể cập nhật yêu thích', message });
    } finally {
      setFavoriteActionId(null);
    }
  };

  const selectedIsAvailable = Boolean(selectedBook?.is_available);

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Backdrop for filter on mobile */}
      {isFilterOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-xs lg:hidden"
          onClick={() => setIsFilterOpen(false)}
        />
      )}

      <aside className={`custom-scrollbar fixed inset-y-0 right-0 z-40 w-72 overflow-y-auto bg-surface-bright p-6 border-l border-surface-container-high transition-transform duration-300 lg:static lg:z-0 lg:w-72 lg:border-r lg:border-l-0 lg:translate-x-0 ${
        isFilterOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'
      }`}>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container lg:hidden cursor-pointer"
              aria-label="Đóng bộ lọc"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <h2 className="text-lg font-bold text-on-surface">Bộ lọc</h2>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-primary hover:underline"
          >
            Xóa tất cả
          </button>
        </div>

        <div className="space-y-8">
          <div ref={autocompleteRef} className="relative block space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-outline">
              Tìm trong danh mục
            </span>
            <div className="relative">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onCompositionStart={() => setIsComposingSearch(true)}
                onCompositionEnd={(event) => {
                  setIsComposingSearch(false);
                  setSearchInput(normalizeSearchQuery(event.currentTarget.value));
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Tên sách, tác giả, ISBN..."
                className="w-full rounded-lg border border-surface-container-high bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              {isSearchingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-surface-container-high bg-white py-1 shadow-lg dark:bg-stone-900">
                {suggestions.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => {
                      openBook(book);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    <img
                      src={book.cover}
                      alt={book.title}
                      onError={(event) => applyImageFallback(event.currentTarget)}
                      className="h-10 w-7 rounded bg-surface-container object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{book.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{book.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-outline">
              Trạng thái kho
            </p>
            <div className="space-y-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 text-sm text-on-surface-variant"
                >
                  <input
                    type="radio"
                    name="availability"
                    checked={availability === option.value}
                    onChange={() => updateFilter('availability', option.value)}
                    className="text-primary focus:ring-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-outline">
              Phân loại
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => updateFilter('category', 'all')}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  category === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Tất cả phân loại
              </button>
              {BOOK_CLASSIFICATIONS.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => updateFilter('category', item.genre)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    category === item.genre
                      ? 'bg-primary text-white'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-outline">
              Sắp xếp
            </span>
            <select
              value={sort}
              onChange={(event) => updateFilter('sort', event.target.value)}
              className="w-full rounded-lg border border-surface-container-high bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>

      <section className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-8">
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-on-surface">Danh mục sách</h2>
            <p className="mt-1 text-xs md:text-sm text-on-surface-variant">
              Hiển thị {books.length} trong tổng số {totalRecords} kết quả
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-bold text-primary lg:hidden transition-colors hover:bg-primary hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">filter_alt</span>
            Bộ lọc
          </button>
        </div>

        {/* Quick Category Chips for Students */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2.5 -mx-4 px-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-200/50 md:mx-0 md:px-0">
          <button
            type="button"
            onClick={() => updateFilter('category', 'all')}
            className={`shrink-0 rounded-full px-4.5 py-2 text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer ${
              category === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary'
                : 'bg-surface-container-low text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60 dark:border-stone-800 dark:text-stone-300'
            }`}
          >
            Tất cả
          </button>
          {BOOK_CLASSIFICATIONS.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => updateFilter('category', item.genre)}
              className={`shrink-0 rounded-full px-4.5 py-2 text-xs font-bold transition-all hover:scale-[1.02] cursor-pointer ${
                category === item.genre
                  ? 'bg-primary text-white shadow-md shadow-primary/25 border border-primary'
                  : 'bg-surface-container-low text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/60 dark:border-stone-800 dark:text-stone-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            <div className="col-span-full py-10 text-center">Đang tải biểu mẫu sách...</div>
          ) : loadError ? (
            <div className="col-span-full">
              <EmptyState icon="error" title="Không thể tải danh mục" message={loadError} />
            </div>
          ) : books.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon="search_off"
                title="Không tìm thấy sách phù hợp"
                message="Thử xóa bộ lọc hoặc nhập từ khóa khác."
              />
            </div>
          ) : (
            books.map((book) => (
              <article
                key={book.id}
                className="group text-left cursor-pointer"
                onClick={() => openBook(book)}
              >
                <div
                  className="scholar-shadow relative mb-4 aspect-[3/4] overflow-hidden rounded-xl bg-surface-container transition-transform duration-300 group-hover:-translate-y-2"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    onError={(event) => applyImageFallback(event.currentTarget)}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute right-3 top-3">
                    <span
                      className={`${book.statusColor} rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-white`}
                    >
                      {book.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      book.is_favorite
                        ? `Bỏ yêu thích ${book.title}`
                        : `Thêm yêu thích ${book.title}`
                    }
                    disabled={favoriteActionId === book.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(book);
                    }}
                    className={`absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-md transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      book.is_favorite
                        ? 'bg-error text-white'
                        : 'bg-white/85 text-on-surface hover:bg-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] ${book.is_favorite ? 'filled' : ''}`}>
                      favorite
                    </span>
                  </button>
                </div>
                <h4 className="line-clamp-2 font-bold text-on-surface transition-colors group-hover:text-primary">
                  {book.title}
                </h4>
                <p className="mt-0.5 text-xs text-on-surface-variant">{book.author}</p>
                {book.avg_rating && book.avg_rating > 0 ? (
                  <div className="mt-1 flex items-center gap-1">
                    <StarRating rating={book.avg_rating} size="sm" />
                    <span className="text-[10px] font-bold text-on-surface-variant">({book.reviews_count})</span>
                  </div>
                ) : null}
                <p className="mt-1.5 text-[10px] font-medium uppercase text-primary">
                  {Number(book.favorite_count ?? 0)} lượt yêu thích
                </p>
                {book.is_available ? (
                  <p className="mt-1 text-[10px] uppercase text-outline">Kệ: {book.location ? book.location.replace(/^kệ\s+/i, '') : ''}</p>
                ) : (
                  <p className="mt-1 text-[10px] font-medium text-error">
                    Đã hết bản sẵn sàng cho mượn
                  </p>
                )}
              </article>
            ))
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </section>

      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface-bright shadow-2xl md:flex-row">
            <div className="relative bg-surface-container w-full h-60 md:h-auto md:w-2/5 shrink-0">
              <img
                src={selectedBook.cover}
                alt={selectedBook.title}
                onError={(event) => applyImageFallback(event.currentTarget)}
                decoding="async"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={closeBook}
                className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-black/40"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            </div>
            <div className="custom-scrollbar flex-1 flex flex-col overflow-y-auto p-6 md:p-12">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                    {selectedBook.category}
                  </span>
                  <h2 className="mt-4 text-3xl font-bold text-on-surface">{selectedBook.title}</h2>
                  <p className="mt-2 text-lg text-on-surface-variant">{selectedBook.author}</p>
                </div>
                <button
                  type="button"
                  onClick={closeBook}
                  className="text-on-surface-variant hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-3xl">close</span>
                </button>
              </div>
              <div className="rounded-2xl border border-surface-container bg-surface-container-low p-4">
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-outline">ISBN</p>
                    <p className="mt-1 font-semibold text-on-surface">{selectedBook.isbn}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      Năm xuất bản
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {selectedBook.published_year ?? 'Chưa rõ'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      Vị trí kệ
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-semibold text-on-surface">
                        {selectedBook.location || 'Chưa rõ'}
                      </span>
                      {selectedBook.location && (
                        <button
                          type="button"
                          onClick={() => {
                            setMapHighlight(selectedBook.location || null);
                            setMapBookTitle(selectedBook.title || null);
                            setIsMapOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary hover:text-white cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[12px]">map</span>
                          Xem vị trí
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      Tổng số / Còn lại
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {selectedBook.quantity} / {selectedBook.available_quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      Trạng thái
                    </p>
                    <div className="mt-1 flex items-center gap-2 font-semibold text-on-surface">
                      <span className={`h-2.5 w-2.5 rounded-full ${selectedBook.statusColor}`} />
                      {selectedBook.status}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-outline">
                      Đánh giá trung bình
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 font-semibold text-on-surface">
                      <StarRating rating={selectedBook.avg_rating ?? 0} size="sm" />
                      <span className="text-xs font-bold">
                        {selectedBook.avg_rating ?? 0}/5 ({selectedBook.reviews_count ?? 0} lượt)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(selectedBook.ai_summary || (selectedBook.ai_tags?.length ?? 0) > 0) ? (
                <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    <h3 className="text-sm font-bold">Tóm tắt AI</h3>
                  </div>
                  {selectedBook.ai_summary ? (
                    <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                      {selectedBook.ai_summary}
                    </p>
                  ) : null}
                  {(selectedBook.ai_tags?.length ?? 0) > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedBook.ai_tags?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-surface-bright px-2 py-1 text-[10px] font-bold uppercase text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-12 flex items-center justify-between gap-6 border-t border-surface-container-high pt-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase text-outline">
                    Trạng thái tại kho
                  </span>
                  <span
                    className={`mt-1 flex items-center gap-1 font-bold ${
                      selectedIsAvailable ? 'text-green-600' : 'text-error'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedIsAvailable ? 'bg-green-600' : 'bg-error'
                      }`}
                    />
                    {selectedIsAvailable
                      ? `${selectedBook.available_quantity} bản sẵn sàng cho mượn`
                      : 'Hiện chưa có bản sẵn sàng cho mượn'}
                  </span>
                </div>
                {(() => {
                  const isOutlookStudent = user?.email && (
                    user.email.toLowerCase().endsWith('@student.hcmue.edu.vn') || 
                    user.email.toLowerCase().endsWith('@hcmue.edu.vn')
                  );

                  if (role === 'student' && !isOutlookStudent) {
                    return (
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs text-amber-700 flex items-start gap-2 max-w-md text-left">
                        <span className="material-symbols-outlined text-amber-600 shrink-0 select-none">info</span>
                        <div>
                          <p className="font-bold">Quyền mượn bị giới hạn</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-600">
                            Quyền mượn sách vật lý và đặt chỗ chỉ áp dụng cho sinh viên sử dụng email trường (@student.hcmue.edu.vn hoặc @hcmue.edu.vn). Giao dịch của bạn được ghi nhận dưới danh nghĩa khách vãng lai (chỉ được xem tài liệu).
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const activeRes = reservations.find(
                    (r) => r.book_id === selectedBook.id && r.status === 'waiting'
                  );
                  
                  if (selectedIsAvailable) {
                    return (
                      <button
                        type="button"
                        onClick={handleBorrow}
                        disabled={isBorrowing}
                        className="rounded-xl bg-tertiary px-8 py-3 font-bold text-white shadow-lg shadow-tertiary/20 transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                      >
                        {isBorrowing ? 'Đang gửi...' : 'Mượn ngay'}
                      </button>
                    );
                  }

                  if (activeRes) {
                    return (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold text-primary uppercase">
                          Bạn đang xếp vị trí thứ #{activeRes.position} hàng chờ
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelReservation(activeRes.reservation_id)}
                          disabled={isReserving}
                          className="rounded-lg bg-error px-5 py-2 text-xs font-bold text-white shadow-md shadow-error/15 transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-wait cursor-pointer"
                        >
                          {isReserving ? 'Đang hủy...' : 'Hủy đặt chỗ'}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      onClick={handleReserve}
                      disabled={isReserving}
                      className="rounded-xl bg-primary px-8 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                    >
                      {isReserving ? 'Đang gửi...' : 'Đặt chỗ trước'}
                    </button>
                  );
                })()}
              </div>

              {/* Reviews and Ratings Section */}
              <div className="mt-8 border-t border-surface-container-high pt-6 space-y-6">
                {/* Submit review box */}
                {(() => {
                  const eligibleBorrow = myRequests.find(
                    (req) => req.book_id === selectedBook.id && req.status === 'returned' && !req.is_reviewed
                  );
                  if (!eligibleBorrow) return null;

                  return (
                    <div className={`rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4 transition-all duration-300 ${
                      isSubmittingReview ? 'opacity-60 pointer-events-none' : ''
                    }`}>
                      <div className="flex items-center gap-1.5 text-primary">
                        <span className="material-symbols-outlined text-xl">rate_review</span>
                        <h4 className="font-bold text-sm">Đánh giá cuốn sách này</h4>
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Bạn đã trả sách thành công! Hãy gửi đánh giá để giúp những bạn đọc khác chọn được sách phù hợp.
                      </p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-outline">Số sao của bạn:</span>
                          <StarRating rating={newRating} onChange={setNewRating} interactive={true} size="lg" />
                        </div>
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Nhập cảm nhận của bạn về cuốn sách (tối đa 1000 ký tự)..."
                          rows={3}
                          className="w-full rounded-xl border border-surface-container-high bg-surface-bright text-on-surface p-3 text-xs outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-outline/70 transition-all duration-200"
                          maxLength={1000}
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSubmitReview(eligibleBorrow.id)}
                            disabled={isSubmittingReview}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white transition-all hover:opacity-90 hover:shadow-md disabled:cursor-wait cursor-pointer"
                          >
                            {isSubmittingReview ? (
                              <>
                                <span className="material-symbols-outlined animate-spin text-xs">progress_activity</span>
                                <span>Đang gửi...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-xs">send</span>
                                <span>Gửi đánh giá</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Reviews List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-on-surface text-sm">
                    Đánh giá từ bạn đọc ({reviews.length})
                  </h4>

                  {reviews.length === 0 ? (
                    <p className="text-xs text-on-surface-variant italic">
                      Chưa có đánh giá nào cho cuốn sách này. Hãy là người đầu tiên gửi cảm nhận!
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                      {reviews.map((rev) => (
                        <div key={rev.review_id} className="rounded-xl bg-surface-container/30 p-4 border border-outline-variant/50 space-y-2.5 transition-all hover:bg-surface-container/40">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-primary">account_circle</span>
                                {rev.member?.name ?? 'Bạn đọc'}
                              </p>
                              <span className="text-[10px] text-on-surface-variant/80 font-medium pl-5 block mt-0.5">
                                {rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                              </span>
                            </div>
                            <div className="shrink-0 bg-surface-bright px-2 py-1 rounded-lg border border-outline-variant/30 flex items-center">
                              <StarRating rating={rev.rating} size="sm" />
                            </div>
                          </div>
                          {rev.comment && (
                            <p className="text-xs text-on-surface-variant leading-relaxed pl-3 border-l-2 border-primary/30 bg-surface-bright/40 p-2.5 rounded-r-lg">
                              {rev.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMapOpen && (
        <LibraryMapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          highlightLocation={mapHighlight}
          bookTitle={mapBookTitle || undefined}
        />
      )}
    </div>
  );
}
