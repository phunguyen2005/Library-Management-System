import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDigitalDocuments, type DigitalDocument } from '../../api/bookApi';
import { fetchReadingProgress } from '../../api/readingProgressApi';
import { fetchFavoriteBooks, addFavoriteBook, removeFavoriteBook } from '../../api/favoriteApi';
import EmptyState from '../../components/EmptyState';
import ReadingRoom from '../../components/ReadingRoom';
import { applyImageFallback, getCoverUrl } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import { useAuth } from '../../auth/AuthContext';

export default function Digital() {
  const { user, role } = useAuth();
  const userLevel = typeof user?.level === 'number' ? user.level : 1;
  const canDownload = role === 'admin' || role === 'librarian' || userLevel >= 5;

  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DigitalDocument[]>([]);
  const [readingDoc, setReadingDoc] = useState<DigitalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'PDF' | 'EPUB' | 'AUDIO' | 'SLIDES'>('ALL');
  const [genreFilter, setGenreFilter] = useState('ALL');
  const [activeSummaryDoc, setActiveSummaryDoc] = useState<DigitalDocument | null>(null);

  // Extract available genres dynamically from loaded documents
  const availableGenres = Array.from(
    new Set(documents.map((doc) => doc.type).filter(Boolean))
  );

  const displayDocuments = documents.filter((doc) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      doc.title.toLowerCase().includes(query) ||
      doc.author.toLowerCase().includes(query) ||
      doc.type.toLowerCase().includes(query) ||
      doc.aiTags?.some((tag) => tag.toLowerCase().includes(query));

    const matchesFormat =
      formatFilter === 'ALL' || doc.format.toUpperCase() === formatFilter;

    const matchesGenre =
      genreFilter === 'ALL' || doc.type === genreFilter;

    return matchesSearch && matchesFormat && matchesGenre;
  });

  const handleToggleFavorite = async (documentId: number, currentIsFavorite: boolean) => {
    try {
      if (currentIsFavorite) {
        await removeFavoriteBook(documentId);
        emitToast({ tone: 'success', title: 'Đã bỏ yêu thích', message: 'Tài liệu đã được xóa khỏi danh sách yêu thích.' });
      } else {
        await addFavoriteBook(documentId);
        emitToast({ tone: 'success', title: 'Đã yêu thích', message: 'Tài liệu đã được thêm vào danh sách yêu thích.' });
      }
      setDocuments((current) =>
        current.map((doc) =>
          doc.id === documentId ? { ...doc, is_favorite: !currentIsFavorite } : doc
        )
      );
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Không thể cập nhật yêu thích.');
      emitToast({ tone: 'error', title: 'Lỗi', message });
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchDigitalDocuments(),
      fetchReadingProgress().catch(() => []),
      fetchFavoriteBooks().catch(() => []),
    ])
      .then(([digitalDocuments, readingProgress, favoriteBooks]) => {
        const progressByBook = new Map<number, import('../../types/book').ReadingProgressRecord>(
          readingProgress.map((item) => [item.book_id, item] as [number, import('../../types/book').ReadingProgressRecord]),
        );
        const favoriteIds = new Set(favoriteBooks.map((book) => book.id));

        setDocuments(
          digitalDocuments.map((document) => ({
            ...document,
            readingProgress: progressByBook.get(document.id) ?? null,
            is_favorite: favoriteIds.has(document.id),
          })),
        );
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error, 'Không thể tải tài liệu số.');
        setError(message);
        emitToast({ tone: 'error', title: 'Không thể tải tài liệu số', message });
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    const selectedId = Number(searchParams.get('book'));
    if (!selectedId || documents.length === 0) {
      return;
    }
    const match = documents.find((doc) => doc.id === selectedId);
    if (match) {
      setReadingDoc(match);
    }
  }, [documents, searchParams]);

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Tài liệu số</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Truy cập bộ sưu tập E-Book, Audio và bài giảng điện tử 24/7
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-low shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên tài liệu, tác giả, tag..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-surface-bright border border-surface-container-high text-sm text-on-surface placeholder:text-outline outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Dropdown */}
          <div className="relative min-w-[160px]">
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-surface-bright border border-surface-container-high text-xs font-bold text-on-surface-variant outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">Tất cả thể loại</option>
              {availableGenres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[16px] pointer-events-none">
              keyboard_arrow_down
            </span>
          </div>

          {/* Format Tabs */}
          <div className="flex flex-wrap gap-1">
            {(['ALL', 'PDF', 'EPUB', 'AUDIO', 'SLIDES'] as const).map((filter) => {
              const label =
                filter === 'ALL'
                  ? 'Tất cả'
                  : filter === 'AUDIO'
                    ? 'Audiobook'
                    : filter;
              const isActive = formatFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFormatFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-sm shadow-primary/20'
                      : 'bg-surface-bright border border-surface-container-high text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid auto-rows-max grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center font-medium text-on-surface-variant animate-pulse">
            Đang tải tài liệu...
          </div>
        ) : error ? (
          <div className="col-span-full">
            <EmptyState icon="error" title="Không thể tải tài liệu số" message={error} />
          </div>
        ) : displayDocuments.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon="folder_open"
              title="Không có tài liệu số phù hợp"
              message="Thử chọn định dạng khác hoặc quay lại sau khi thư viện cập nhật thêm tài liệu."
            />
          </div>
        ) : (
          displayDocuments.map((resource) => (
            <div
              key={resource.id}
              className="group relative flex flex-col rounded-2xl border border-surface-container-low bg-surface-bright p-4 scholar-shadow transition-colors hover:border-primary/30"
            >
              <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-surface-container">
                <img
                  src={getCoverUrl(resource.cover)}
                  alt={resource.title}
                  onError={(event) => applyImageFallback(event.currentTarget)}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <span
                    className={`${resource.color} select-none rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md`}
                  >
                    {resource.format}
                  </span>
                  <span className="text-[10px] font-medium text-white">{resource.size}</span>
                </div>

                {/* Quick Favorite Heart Button */}
                <button
                  type="button"
                  onClick={() => handleToggleFavorite(resource.id, !!resource.is_favorite)}
                  className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xs transition-all hover:scale-110 active:scale-95 cursor-pointer hover:bg-black/60"
                  title={resource.is_favorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] transition-colors ${
                      resource.is_favorite ? 'text-red-500 fill-red-500' : 'text-white'
                    }`}
                    style={{ fontVariationSettings: resource.is_favorite ? '"FILL" 1' : '"FILL" 0' }}
                  >
                    favorite
                  </span>
                </button>
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                    {resource.type}
                  </span>
                  {resource.readingProgress && (
                    <span className="rounded-md bg-green-500/10 px-1.5 py-0.5 text-[9px] font-bold text-green-600 animate-pulse">
                      {resource.format.toUpperCase() === 'AUDIO' ? 'Đang nghe' : 'Đang đọc'}
                    </span>
                  )}
                </div>
                <h3 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-on-surface transition-colors group-hover:text-primary">
                  {resource.title}
                </h3>

                <div className="mt-1.5 flex items-center justify-between">
                  <p className="line-clamp-1 text-xs text-on-surface-variant">{resource.author}</p>
                  <div className="flex items-center gap-1 rounded-md bg-surface-container-low px-2 py-0.5 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px]">cloud_download</span>
                    <span className="font-medium">{resource.downloads}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={!resource.openUrl}
                    onClick={() => setReadingDoc(resource)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-2 text-[11px] font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-outline cursor-pointer"
                  >
                    {resource.format.toUpperCase() === 'AUDIO' ? (
                      <>
                        <span className="material-symbols-outlined text-[13px]">headphones</span>
                        <span>Nghe</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[13px]">menu_book</span>
                        <span>Mở đọc</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!resource.downloadUrl}
                    onClick={() => {
                      if (!canDownload) {
                        emitToast({
                          tone: 'warning',
                          title: 'Yêu cầu cấp độ 5',
                          message: 'Bạn phải đạt cấp độ 5 trở lên trong hệ thống học giả để tải tài liệu số.',
                        });
                        return;
                      }
                      if (resource.downloadUrl) {
                        window.open(resource.downloadUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="rounded-lg border border-surface-container-high px-2 py-2 text-[11px] font-bold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:text-outline cursor-pointer"
                  >
                    Tải về
                  </button>
                </div>
                {!resource.hasAttachedFile ? (
                  <p className="mt-2 text-[10px] text-on-surface-variant">
                    Bản ghi này đang dùng tệp xem trước cho đến khi thủ thư gắn tài liệu thật.
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {/* AI Summary Button */}
                  {resource.aiSummary && resource.format.toUpperCase() !== 'AUDIO' && (
                    <button
                      type="button"
                      onClick={() => setActiveSummaryDoc(resource)}
                      className="flex items-center gap-1 rounded-md bg-primary/10 hover:bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                      <span>Tóm tắt AI</span>
                    </button>
                  )}
                  {resource.format.toUpperCase() !== 'AUDIO' && resource.aiTags?.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {resource.readingProgress ? (
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, resource.readingProgress.progress_percent)}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-on-surface-variant">
                      Tiếp tục: trang {resource.readingProgress.current_page}/{resource.readingProgress.total_pages}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* AI Summary Modal */}
      {activeSummaryDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface-bright p-6 scholar-shadow border border-surface-container-high animate-scale-up">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-2xl">smart_toy</span>
                <h3 className="font-bold text-lg">Tóm tắt AI: {activeSummaryDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSummaryDoc(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 text-sm leading-relaxed text-on-surface">
              <p className="whitespace-pre-line">{activeSummaryDoc.aiSummary}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveSummaryDoc(null)}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/95 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {readingDoc && (
        <ReadingRoom
          document={readingDoc}
          onClose={() => {
            setReadingDoc(null);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('book');
            setSearchParams(nextParams, { replace: true });
          }}
          onProgressSaved={(progress) => {
            setDocuments((current) =>
              current.map((document) =>
                document.id === progress.book_id
                  ? { ...document, readingProgress: progress }
                  : document,
              ),
            );
            setReadingDoc((current) =>
              current && current.id === progress.book_id
                ? { ...current, readingProgress: progress }
                : current,
              );
          }}
        />
      )}
    </div>
  );
}
