import React, { useCallback, useEffect, useRef, useState } from 'react';
import { syncReadingProgress } from '../api/readingProgressApi';
import { sendChatMessage } from '../api/aiApi';
import { getErrorMessage } from '../lib/errors';
import { emitToast } from '../notifications/events';
import { applyImageFallback } from '../lib/display';
import type { DigitalDocument, ReadingProgressRecord } from '../types/book';

interface ReadingRoomProps {
  document: DigitalDocument;
  onClose: () => void;
  onProgressSaved?: (progress: ReadingProgressRecord) => void;
}

export default function ReadingRoom({ document, onClose, onProgressSaved }: ReadingRoomProps) {
  const isPdf = document.format.toUpperCase() === 'PDF';
  const isAudio = document.format.toUpperCase() === 'AUDIO';
  
  const [currentPage, setCurrentPage] = useState(document.readingProgress?.current_page ?? 1);
  const [totalPages, setTotalPages] = useState(document.readingProgress?.total_pages ?? 1);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const autoSavePendingRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const progressPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

  // Audio specific states & refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // AI Chat specific states & refs
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

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

  // Debounced auto save for progress
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
    }, 800); // 800ms debounce to save server writes

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [currentPage, saveProgress, totalPages]);

  // Prefill AI messages on open
  useEffect(() => {
    if (isAiOpen && aiMessages.length === 0) {
      setAiMessages([
        {
          sender: 'ai',
          text: `Xin chào! Tôi là **Trợ lý AI** đồng hành cùng bạn học tập tài liệu **"${document.title}"** (định dạng ${document.format}). 🤖\n\nBạn có thể hỏi tôi bất kỳ điều gì liên quan đến cuốn sách này (ví dụ: tóm tắt ý chính, giải thích các thuật ngữ khó, đặt câu hỏi kiểm tra kiến thức...). Tôi luôn sẵn sàng!`,
        },
      ]);
    }
  }, [isAiOpen, aiMessages.length, document.title, document.format]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, isAiOpen]);

  // Audio helper handlers
  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    setCurrentTime(current);

    // Save playback position to progress: 1 sec = 1 page
    const currentSec = Math.max(1, Math.floor(current));
    setCurrentPage(currentSec);
    queueProgressSave();
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    setDuration(dur);
    setTotalPages(Math.max(1, Math.floor(dur)));
    queueProgressSave();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
    setCurrentPage(Math.max(1, Math.floor(time)));
    queueProgressSave();
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    let nextTime = audioRef.current.currentTime + seconds;
    if (nextTime < 0) nextTime = 0;
    if (nextTime > duration) nextTime = duration;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    setCurrentPage(Math.max(1, Math.floor(nextTime)));
    queueProgressSave();
  };

  const cyclePlaybackRate = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    audioRef.current.playbackRate = nextRate;
  };

  // AI Chat helper handler
  const handleSendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;

    const userMsgText = aiInput;
    setAiInput('');
    setAiMessages((prev) => [...prev, { sender: 'user', text: userMsgText }]);
    setIsAiLoading(true);

    try {
      // Package query with book metadata context
      const contextualPrompt = `Tôi đang đọc tài liệu "${document.title}" của tác giả ${document.author}. ` +
        (document.aiSummary ? `Bản tóm tắt AI có sẵn: ${document.aiSummary}. ` : '') +
        `Tôi có câu hỏi sau: ${userMsgText}`;

      // Package conversation history
      const history = aiMessages.slice(-8).map((msg) => ({
        sender: msg.sender === 'user' ? ('user' as const) : ('ai' as const),
        text: msg.text,
      }));

      const chatResponse = await sendChatMessage(contextualPrompt, history);
      setAiMessages((prev) => [...prev, { sender: 'ai', text: chatResponse.response }]);

    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Lỗi kết nối tới trợ lý AI.');
      setAiMessages((prev) => [
        ...prev,
        { sender: 'ai', text: '⚠️ *Không thể kết nối đến Trợ lý AI học tập. Vui lòng kiểm tra đường truyền và thử lại nhé!*' },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900 text-stone-100 animate-fade-in">
      {/* Header bar */}
      <header className="flex h-16 items-center justify-between border-b border-stone-800 bg-stone-950 px-6 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleClose()}
            aria-label="Đóng phòng đọc"
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h1 className="line-clamp-1 text-base font-bold">{document.title}</h1>
            <p className="text-xs text-stone-400">{document.author} • {document.type}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded bg-stone-800 px-2.5 py-1 text-xs font-bold uppercase text-stone-300">
            {document.format}
          </span>
          {document.downloadUrl && (
            <button
              type="button"
              onClick={() => window.open(document.downloadUrl!, '_blank')}
              className="flex h-10 gap-2 items-center rounded-lg bg-stone-800 px-4 text-sm font-semibold transition-colors hover:bg-stone-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>Tải tệp</span>
            </button>
          )}

          {/* AI Helper Toggle Button */}
          <button
            type="button"
            onClick={() => setIsAiOpen(!isAiOpen)}
            className={`flex h-10 gap-2 items-center rounded-lg px-4 text-sm font-bold transition-all cursor-pointer ${
              isAiOpen
                ? 'bg-primary text-white shadow-md'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            <span>Hỏi Trợ lý AI</span>
          </button>

          <button
            type="button"
            onClick={() => void handleClose()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
      </header>

      {/* Progress Sync Info Bar */}
      {isAudio ? (
        <section className="flex items-center justify-between border-b border-stone-800 bg-stone-950 px-6 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-300">
            <span className="material-symbols-outlined text-[16px] text-primary animate-pulse">headphones</span>
            <span>Tiến độ nghe bài giảng: {progressPercent}%</span>
          </div>
          <span aria-live="polite" className="text-xs font-semibold text-stone-500">
            {isSavingProgress ? 'Đang tự động lưu...' : 'Đã đồng bộ tiến trình nghe'}
          </span>
        </section>
      ) : (
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
      )}

      {/* Main Split Viewport */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Reading / Playback Panel */}
        <main className="flex-1 bg-stone-900 p-4 flex flex-col justify-center items-center overflow-hidden">
          {document.openUrl ? (
            <div className="h-full w-full overflow-hidden rounded-xl border border-stone-850 bg-stone-950 shadow-2xl flex flex-col items-center justify-center">
              {isPdf ? (
                <iframe
                  src={`${document.openUrl}#toolbar=1`}
                  title={document.title}
                  className="h-full w-full border-none"
                  allow="autoplay"
                />
              ) : isAudio ? (
                <div className="flex flex-col items-center justify-center space-y-6 p-6 w-full max-w-lg">
                  <audio
                    ref={audioRef}
                    src={document.openUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onEnded={() => setIsPlaying(false)}
                  />

                  {/* Vinyl Rotating Disc Cover */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="h-44 w-44 rounded-full bg-stone-950 border-4 border-stone-850 shadow-2xl overflow-hidden flex items-center justify-center relative"
                      style={{
                        animation: isPlaying ? 'spin 15s linear infinite' : 'none',
                      }}
                    >
                      {/* Vinyl Grooves */}
                      <div className="absolute inset-2 rounded-full border border-stone-800/30"></div>
                      <div className="absolute inset-5 rounded-full border border-stone-800/30"></div>
                      <div className="absolute inset-8 rounded-full border border-stone-800/30"></div>
                      <div className="absolute inset-11 rounded-full border border-stone-800/30"></div>

                      <img
                        src={document.cover || '/fallback-book-cover.png'}
                        alt={document.title}
                        className="h-20 w-20 rounded-full object-cover z-10 border border-stone-900"
                        onError={(event) => applyImageFallback(event.currentTarget)}
                      />

                      {/* Center Spindle */}
                      <div className="absolute h-3 w-3 bg-stone-900 rounded-full z-20 border border-stone-700 shadow-inner"></div>
                    </div>
                  </div>

                  {/* Audio Track Info */}
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-bold text-stone-100 line-clamp-1">{document.title}</h2>
                    <p className="text-xs text-stone-400">{document.author} • Audio Lecture</p>
                  </div>

                  {/* Custom Styled Audio Player Panel */}
                  <div className="w-full space-y-4 bg-stone-900/60 p-4 rounded-xl border border-stone-800 backdrop-blur-xs">
                    {/* Progress Slider */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-stone-400">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-between">
                      {/* Playback Rate Selector */}
                      <button
                        type="button"
                        onClick={cyclePlaybackRate}
                        className="flex h-8 px-2.5 items-center justify-center rounded-lg bg-stone-950 hover:bg-stone-850 border border-stone-800 text-[10px] font-bold text-stone-300 transition-colors cursor-pointer"
                        title="Tốc độ phát"
                      >
                        <span className="material-symbols-outlined text-[13px] mr-1">speed</span>
                        <span>{playbackRate}x</span>
                      </button>

                      {/* Backward 10s */}
                      <button
                        type="button"
                        onClick={() => handleSkip(-10)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
                        title="Lùi 10s"
                      >
                        <span className="material-symbols-outlined text-base">replay_10</span>
                      </button>

                      {/* Play / Pause Toggle Button */}
                      <button
                        type="button"
                        onClick={togglePlayPause}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-white shadow-md transition-transform active:scale-95 cursor-pointer"
                        title={isPlaying ? 'Tạm dừng' : 'Phát'}
                      >
                        <span className="material-symbols-outlined text-2xl select-none">
                          {isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </button>

                      {/* Forward 10s */}
                      <button
                        type="button"
                        onClick={() => handleSkip(10)}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 transition-colors cursor-pointer"
                        title="Tiến 10s"
                      >
                        <span className="material-symbols-outlined text-base">forward_10</span>
                      </button>

                      {/* Download Link */}
                      <a
                        href={document.downloadUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-950 hover:bg-stone-850 border border-stone-800 text-stone-300 transition-colors"
                        title="Tải bài giảng"
                      >
                        <span className="material-symbols-outlined text-[15px]">download</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center space-y-4">
                  <span className="material-symbols-outlined text-6xl text-primary animate-bounce">menu_book</span>
                  <h3 className="text-lg font-bold">Không thể mở xem trước trực tiếp</h3>
                  <p className="max-w-md text-center text-sm text-stone-400">
                    Tài liệu định dạng **{document.format}** chưa hỗ trợ trình đọc trực tuyến. Vui lòng sử dụng tính năng tải về để xem trên thiết bị của bạn.
                  </p>
                  {document.downloadUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(document.downloadUrl!, '_blank')}
                      className="rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
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

        {/* Right sidebar - AI Chatbot Drawer */}
        {isAiOpen && (
          <div className="w-full md:w-96 border-l border-stone-800 bg-stone-950 flex flex-col h-full animate-slide-left z-30">
            {/* Sidebar Chat Header */}
            <header className="flex h-14 items-center justify-between border-b border-stone-800 px-4 bg-stone-900/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl animate-pulse">smart_toy</span>
                <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">Trợ lý học tập AI</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-800 hover:text-stone-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </header>

            {/* AI Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-stone-950">
              {aiMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/10'
                        : 'bg-stone-900 border border-stone-800 text-stone-200 rounded-tl-none shadow-inner'
                    }`}
                  >
                    {msg.text.split('\n').map((line, idx) => (
                      <p key={idx} className="my-0.5 min-h-[0.5rem] whitespace-pre-line">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none p-3 bg-stone-900 border border-stone-800 text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1 w-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1 w-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1 w-1 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[10px] ml-1 text-stone-500 font-medium">Trợ lý đang suy nghĩ...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatMessagesEndRef} />
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendAiMessage();
              }}
              className="border-t border-stone-800 bg-stone-900/30 p-3 flex gap-2 items-center"
            >
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="Đặt câu hỏi về nội dung tài liệu..."
                disabled={isAiLoading}
                className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder:text-stone-500 outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!aiInput.trim() || isAiLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity cursor-pointer shadow-md shadow-primary/10"
              >
                <span className="material-symbols-outlined text-base">send</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Global CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
