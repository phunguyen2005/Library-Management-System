import React, { useEffect, useState } from 'react';
import { fetchDigitalDocuments, type DigitalDocument } from '../../api/bookApi';
import { fetchReadingProgress } from '../../api/readingProgressApi';
import EmptyState from '../../components/EmptyState';
import ReadingRoom from '../../components/ReadingRoom';
import { applyImageFallback, getCoverUrl } from '../../lib/display';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

export default function Digital() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DigitalDocument[]>([]);
  const [readingDoc, setReadingDoc] = useState<DigitalDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayDocuments = documents;

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([
      fetchDigitalDocuments(),
      fetchReadingProgress().catch(() => []),
    ])
      .then(([digitalDocuments, readingProgress]) => {
        const progressByBook = new Map<number, import('../../types/book').ReadingProgressRecord>(
          readingProgress.map((item) => [item.book_id, item] as [number, import('../../types/book').ReadingProgressRecord]),
        );
        setDocuments(
          digitalDocuments.map((document) => ({
            ...document,
            readingProgress: progressByBook.get(document.id) ?? null,
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

  return (
    <div className="flex h-full flex-col space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Tài liệu số</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Truy cập bộ sưu tập E-Book, Audio và bài giảng điện tử 24/7
          </p>
        </div>
      </div>

      <div className="grid auto-rows-max grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center font-medium text-on-surface-variant">
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
              className="group flex flex-col rounded-2xl border border-surface-container-low bg-surface-bright p-4 scholar-shadow transition-colors hover:border-primary/30"
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
              </div>

              <div className="flex flex-1 flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  {resource.type}
                </span>
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
                    className="rounded-lg bg-primary px-2 py-2 text-[11px] font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-container-high disabled:text-outline"
                  >
                    Mở đọc
                  </button>
                  <button
                    type="button"
                    disabled={!resource.downloadUrl}
                    onClick={() => {
                      if (resource.downloadUrl) {
                        window.open(resource.downloadUrl, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="rounded-lg border border-surface-container-high px-2 py-2 text-[11px] font-bold text-on-surface transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:text-outline"
                  >
                    Tải về
                  </button>
                </div>
                {!resource.hasAttachedFile ? (
                  <p className="mt-2 text-[10px] text-on-surface-variant">
                    Bản ghi này đang dùng tệp xem trước cho đến khi thủ thư gắn tài liệu thật.
                  </p>
                ) : null}
                {(resource.aiTags?.length ?? 0) > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {resource.aiTags?.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
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

      {readingDoc && (
        <ReadingRoom
          document={readingDoc}
          onClose={() => setReadingDoc(null)}
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
