import React, { useCallback, useEffect, useRef, useState } from 'react';
import { syncReadingProgress } from '../api/readingProgressApi';
import { getErrorMessage } from '../lib/errors';
import { emitToast } from '../notifications/events';
import type { DigitalDocument, ReadingProgressRecord } from '../types/book';

interface ReadingRoomProps {
  document: DigitalDocument;
  onClose: () => void;
  onProgressSaved?: (progress: ReadingProgressRecord) => void;
}

export default function ReadingRoom({ document, onClose, onProgressSaved }: ReadingRoomProps) {
  const isPdf = document.format.toUpperCase() === 'PDF';
  const [currentPage, setCurrentPage] = useState(document.readingProgress?.current_page ?? 1);
  const [totalPages, setTotalPages] = useState(document.readingProgress?.total_pages ?? 1);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const autoSavePendingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const progressPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  const saveProgress = useCallback(async () => {
    const nextTotalPages = Math.max(1, totalPages);
    const nextCurrentPage = Math.min(Math.max(1, currentPage), nextTotalPages);

    setIsSavingProgress(true);

    try {
      const progress = await syncReadingProgress(document.id, {
        current_page: nextCurrentPage,
        total_pages: nextTotalPages,
      });

      if (progress) {
        setCurrentPage(progress.current_page);
        setTotalPages(progress.total_pages);
        onProgressSaved?.(progress);
      }

    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Không thể lưu tiến độ đọc.');
      emitToast({ tone: 'error', title: 'Không thể lưu tiến độ', message });
    } finally {
      setIsSavingProgress(false);
    }
  }, [currentPage, document.id, onProgressSaved, totalPages]);

  const queueProgressSave = () => {
    autoSavePendingRef.current = true;
  };

  const flushPendingProgressSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (!autoSavePendingRef.current) {
      return;
    }

    autoSavePendingRef.current = false;
    await saveProgress();
  }, [saveProgress]);

  const handleClose = async () => {
    await flushPendingProgressSave();
    onClose();
  };

  useEffect(() => {
    if (!autoSavePendingRef.current) {
      return undefined;
    }

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      autoSavePendingRef.current = false;
      void saveProgress();
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [currentPage, saveProgress, totalPages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900 text-stone-100 animate-fade-in">
      {/* Header bar */}
      <header className="flex h-16 items-center justify-between border-b border-stone-800 bg-stone-950 px-6 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label="Đóng phòng đọc"
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h1 className="line-clamp-1 text-base font-bold">{document.title}</h1>
            <p className="text-xs text-stone-400">{document.author} • {document.type}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded bg-stone-800 px-2.5 py-1 text-xs font-semibold uppercase text-stone-300">
            {document.format}
          </span>
          {document.downloadUrl && (
            <button
              type="button"
              onClick={() => window.open(document.downloadUrl!, '_blank')}
              className="flex h-10 gap-2 items-center rounded-lg bg-stone-800 px-4 text-sm font-semibold transition-colors hover:bg-stone-700"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Tải tệp</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleClose()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
      </header>

      <section className="flex flex-wrap items-center gap-3 border-b border-stone-800 bg-stone-950 px-6 py-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-stone-300">
          <span>Trang</span>
          <input
            type="number"
            min="1"
            value={currentPage}
            onChange={(event) => {
              queueProgressSave();
              setCurrentPage(Number(event.target.value) || 1);
            }}
            onBlur={() => void flushPendingProgressSave()}
            className="h-9 w-20 rounded-lg border border-stone-700 bg-stone-900 px-2 text-sm text-stone-100 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-stone-300">
          <span>Tổng</span>
          <input
            type="number"
            min="1"
            value={totalPages}
            onChange={(event) => {
              queueProgressSave();
              setTotalPages(Number(event.target.value) || 1);
            }}
            onBlur={() => void flushPendingProgressSave()}
            className="h-9 w-20 rounded-lg border border-stone-700 bg-stone-900 px-2 text-sm text-stone-100 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <div className="min-w-[180px] flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-stone-800">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <span className="text-xs font-bold text-stone-300">{progressPercent}%</span>
        <span aria-live="polite" className="min-w-16 text-xs font-semibold text-stone-500">
          {isSavingProgress ? 'Đang lưu' : ''}
        </span>
      </section>

      {/* Main viewport */}
      <main className="flex-1 bg-stone-900 p-4">
        {document.openUrl ? (
          <div className="h-full w-full overflow-hidden rounded-xl border border-stone-800 bg-stone-950 shadow-2xl">
            {isPdf ? (
              <iframe
                src={`${document.openUrl}#toolbar=1`}
                title={document.title}
                className="h-full w-full border-none"
                allow="autoplay"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-primary">menu_book</span>
                <h3 className="text-lg font-bold">Không thể mở xem trước trực tiếp</h3>
                <p className="max-w-md text-center text-sm text-stone-400">
                  Tài liệu định dạng **{document.format}** chưa hỗ trợ trình đọc trực tuyến. Vui lòng sử dụng tính năng tải về để xem trên thiết bị của bạn.
                </p>
                {document.downloadUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(document.downloadUrl!, '_blank')}
                    className="rounded-lg bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                  >
                    Tải tài liệu ngay
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-stone-600">error</span>
            <h3 className="text-lg font-bold">Tài liệu số chưa đính kèm tệp tin</h3>
            <p className="max-w-md text-center text-sm text-stone-400">
              Bản ghi này đang dùng tài liệu mẫu cho đến khi thủ thư gắn tệp tin chính thức. Vui lòng quay lại sau!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
