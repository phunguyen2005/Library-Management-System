import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { streamChatMessage, type ChatMessage } from '../api/aiApi';
import { fetchBookDetail } from '../api/bookApi';
import { requestBorrow } from '../api/borrowApi';
import { reserveBook } from '../api/reservationApi';
import { applyImageFallback } from '../lib/display';
import { getErrorMessage } from '../lib/errors';
import { emitToast } from '../notifications/events';
import { motion, AnimatePresence } from 'motion/react';
import type { FormattedBook } from '../types/book';
import { useTranslation } from 'react-i18next';

// Custom inline card sub-component for rich previews and actions
function InlineBookCard({ bookId }: { bookId: number }) {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const [book, setBook] = useState<FormattedBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isOutlookStudent = user?.email && (
    user.email.toLowerCase().endsWith('@student.hcmue.edu.vn') || 
    user.email.toLowerCase().endsWith('@hcmue.edu.vn')
  );

  useEffect(() => {
    let active = true;
    fetchBookDetail(bookId)
      .then((data) => {
        if (active) {
          setBook(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching book detail:', err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  const handleBorrow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!book) return;
    if (role === 'student' && !isOutlookStudent) {
      emitToast({
        tone: 'warning',
        title: t('aiChatbot.guestBorrowLimitTitle', 'Quyền mượn bị giới hạn'),
        message: t('aiChatbot.guestBorrowLimitMsg', 'Khách vãng lai không thể mượn sách vật lý. Vui lòng sử dụng tài khoản Outlook trường.'),
      });
      return;
    }
    setActionLoading(true);
    try {
      const response = await requestBorrow(book.id);
      emitToast({
        tone: 'success',
        title: t('aiChatbot.success', 'Thành công'),
        message: response.message || t('aiChatbot.borrowRequestSubmitted', 'Đã gửi yêu cầu mượn cuốn: {{title}}', { title: book.title }),
      });
      const updated = await fetchBookDetail(book.id);
      setBook(updated);
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('aiChatbot.borrowError', 'Lỗi khi yêu cầu mượn sách'));
      emitToast({ tone: 'error', title: t('aiChatbot.borrowFailedTitle', 'Lỗi mượn sách'), message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReserve = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!book) return;
    if (role === 'student' && !isOutlookStudent) {
      emitToast({
        tone: 'warning',
        title: t('aiChatbot.guestReserveLimitTitle', 'Quyền đặt chỗ bị giới hạn'),
        message: t('aiChatbot.guestReserveLimitMsg', 'Khách vãng lai không thể đặt chỗ trước. Vui lòng sử dụng tài khoản Outlook trường.'),
      });
      return;
    }
    setActionLoading(true);
    try {
      const response = await reserveBook(book.id);
      emitToast({
        tone: 'success',
        title: t('aiChatbot.success', 'Thành công'),
        message: response.message || t('aiChatbot.reserveSuccessMsg', 'Đặt chỗ thành công cuốn: {{title}}', { title: book.title }),
      });
      const updated = await fetchBookDetail(book.id);
      setBook(updated);
    } catch (error: unknown) {
      const message = getErrorMessage(error, t('aiChatbot.reserveError', 'Lỗi khi đặt chỗ sách'));
      emitToast({ tone: 'error', title: t('aiChatbot.reserveFailedTitle', 'Lỗi đặt chỗ'), message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-3 bg-surface-container/60 border border-surface-container-high p-3 rounded-xl max-w-sm animate-pulse my-2">
        <div className="w-16 h-24 bg-surface-container rounded-md shrink-0" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-3 bg-surface-container rounded w-3/4" />
          <div className="h-2.5 bg-surface-container rounded w-1/2" />
          <div className="h-5 bg-surface-container rounded w-1/3 mt-2" />
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-xs text-outline italic my-2">
        {t('aiChatbot.bookNotFound', 'Không tìm thấy thông tin cuốn sách #{{id}}', { id: bookId })}
      </div>
    );
  }

  return (
    <div 
      onClick={() => {
        window.location.href = `/catalog?book=${book.id}`;
      }}
      className="flex gap-3 bg-surface-bright border border-surface-container-high p-3 rounded-xl max-w-sm shadow-sm hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer my-2 text-on-surface"
    >
      <img
        src={book.cover}
        alt={book.title}
        onError={(event) => applyImageFallback(event.currentTarget)}
        className="w-16 h-24 object-cover rounded-md bg-surface-container shrink-0"
      />
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h4 className="text-xs font-bold text-on-surface line-clamp-2 leading-tight" title={book.title}>
            {book.title}
          </h4>
          <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{book.author}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {book.is_digital ? t('aiChatbot.digitalBook', 'Tài liệu số') : t('aiChatbot.paperBook', 'Sách vật lý')}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-white ${book.is_available ? 'bg-green-600' : 'bg-red-500'}`}>
              {book.is_available ? t('aiChatbot.inStock', 'Còn sách') : t('aiChatbot.outOfStock', 'Hết sách')}
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {book.is_digital ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/catalog?book=${book.id}`;
              }}
              className="text-[10px] bg-primary hover:bg-primary/95 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer"
            >
              {t('aiChatbot.readOnline', 'Đọc online')}
            </button>
          ) : book.is_available ? (
            <button
              type="button"
              disabled={actionLoading || (role === 'student' && !isOutlookStudent)}
              onClick={handleBorrow}
              className="text-[10px] bg-primary hover:bg-primary/95 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={role === 'student' && !isOutlookStudent ? t('aiChatbot.outlookOnlyTooltip', 'Chỉ áp dụng cho email trường học') : undefined}
            >
              {actionLoading ? t('aiChatbot.submitting', 'Đang gửi...') : t('aiChatbot.borrowNow', 'Mượn ngay')}
            </button>
          ) : (
            <button
              type="button"
              disabled={actionLoading || (role === 'student' && !isOutlookStudent)}
              onClick={handleReserve}
              className="text-[10px] bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={role === 'student' && !isOutlookStudent ? t('aiChatbot.outlookOnlyTooltip', 'Chỉ áp dụng cho email trường học') : undefined}
            >
              {actionLoading ? t('aiChatbot.submitting', 'Đang gửi...') : t('aiChatbot.reserveNow', 'Đặt chỗ trước')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AiChatbot() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'ai',
      text: 'Xin chào! Tôi là **Thủ thư AI** của Thư viện HCMUE. 🤖\n\nTôi có thể giúp bạn tìm kiếm tài liệu, giải đáp các thắc mắc về quy trình mượn trả hoặc tính năng đặt chỗ trước.\n\nHôm nay bạn cần trợ giúp gì nào?',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setSearchParams] = useSearchParams();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 1200);
    };

    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) {
      return;
    }

    const userMsg: ChatMessage = { sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // Append an empty placeholder for the incoming AI message
    setMessages((prev) => [...prev, { sender: 'ai', text: '' }]);

    let accumulatedText = '';

    try {
      const activeHistory = [...messages, userMsg].slice(-10); // Keep last 10 messages
      await streamChatMessage(text, activeHistory, (chunk) => {
        accumulatedText += chunk;
        setMessages((prev) => {
          const next = [...prev];
          if (next.length > 0) {
            next[next.length - 1] = { sender: 'ai', text: accumulatedText };
          }
          return next;
        });
      });
    } catch (error: unknown) {
      // Remove empty placeholder if nothing generated
      setMessages((prev) => {
        const next = [...prev];
        if (next.length > 0 && next[next.length - 1].text === '') {
          next.pop();
        }
        return next;
      });

      const message = getErrorMessage(error, t('aiChatbot.apiError', 'Đã xảy ra sự cố khi kết nối với AI.'));
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: t('aiChatbot.apiConnectionFailed', '⚠️ *Xin lỗi bạn, kết nối của tôi tới hệ thống AI đang bị gián đoạn. Bạn vui lòng thử lại sau ít phút nhé!*'),
        },
      ]);
      emitToast({ tone: 'error', title: t('aiChatbot.chatErrorTitle', 'Lỗi chatbot AI'), message });
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;

      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        content = parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return <strong key={pIdx} className="font-bold text-primary">{part}</strong>;
          }
          return part;
        });
      }

      const idRegex = /\[ID:\s*(\d+)\]/g;
      const hasId = idRegex.test(line);

      if (hasId) {
        const matches = [...line.matchAll(idRegex)];
        
        return (
          <div key={idx} className="my-2 flex flex-col space-y-1.5">
            <p className="text-sm leading-relaxed">{content}</p>
            <div className="flex flex-col space-y-2 mt-1">
              {matches.map((match, mIdx) => {
                const bookId = Number(match[1]);
                return <InlineBookCard key={mIdx} bookId={bookId} />;
              })}
            </div>
          </div>
        );
      }

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm leading-relaxed my-0.5">
            {content instanceof Array ? content : line.trim().substring(2)}
          </li>
        );
      }

      return (
        <p key={idx} className="text-sm leading-relaxed my-0.5 min-h-[0.5rem]">
          {content}
        </p>
      );
    });
  };

  const getDynamicSuggestedChips = (lastMessageText: string) => {
    const text = lastMessageText.toLowerCase();
    if (text.includes('mượn') || text.includes('trả') || text.includes('quy trình') || 
        text.includes('borrow') || text.includes('return') || text.includes('process') ||
        text.includes('借') || text.includes('还') || text.includes('貸') || text.includes('返') || text.includes('대출') || text.includes('반납')) {
      return [
        { label: t('aiChatbot.chipMaxLoanDuration', '⏰ Thời hạn mượn tối đa?'), query: t('aiChatbot.chipMaxLoanDurationQuery', 'Thời gian tối đa mượn một cuốn sách là bao lâu?') },
        { label: t('aiChatbot.chipLateFine', '💰 Trả sách trễ hạn bị phạt thế nào?'), query: t('aiChatbot.chipLateFineQuery', 'Mức phạt tiền quá hạn cụ thể như thế nào?') },
        { label: t('aiChatbot.chipHowToRenew', '🔄 Cách gia hạn mượn sách?'), query: t('aiChatbot.chipHowToRenewQuery', 'Quy trình gia hạn mượn sách ra sao?') }
      ];
    }
    if (text.includes('đặt chỗ') || text.includes('hàng đợi') || text.includes('hết sách') ||
        text.includes('reserve') || text.includes('queue') || text.includes('out of stock') ||
        text.includes('预约') || text.includes('排队') || text.includes('予約') || text.includes('대기') || text.includes('예약')) {
      return [
        { label: t('aiChatbot.chipCancelReserve', '❌ Cách hủy đặt chỗ trước?'), query: t('aiChatbot.chipCancelReserveQuery', 'Tôi muốn hủy đăng ký đặt chỗ trước sách') },
        { label: t('aiChatbot.chipViewReservations', '📈 Xem danh sách đặt chỗ của tôi?'), query: t('aiChatbot.chipViewReservationsQuery', 'Tôi xem danh sách đặt chỗ ở đâu?') }
      ];
    }
    if (text.includes('phòng tự học') || text.includes('đặt phòng') || text.includes('học nhóm') ||
        text.includes('study room') || text.includes('group study') ||
        text.includes('自习室') || text.includes('自習室') || text.includes('스터디룸') || text.includes('자습실')) {
      return [
        { label: t('aiChatbot.chipCheckinRoom', '🔑 Check-in nhận phòng tự học?'), query: t('aiChatbot.chipCheckinRoomQuery', 'Hướng dẫn check-in phòng tự học khi tới giờ') },
        { label: t('aiChatbot.chipCancelRoom', '🚫 Cách hủy phòng tự học đã đặt?'), query: t('aiChatbot.chipCancelRoomQuery', 'Hủy lịch đặt phòng đã đặt nhóm thế nào?') }
      ];
    }
    return [
      { label: t('aiChatbot.chipFindWebDevBook', '🔍 Tìm sách lập trình Web'), query: t('aiChatbot.chipFindWebDevBookQuery', 'Tìm cho tôi sách về lập trình Web') },
      { label: t('aiChatbot.chipBorrowProcedure', '📋 Quy trình mượn sách'), query: t('aiChatbot.chipBorrowProcedureQuery', 'Quy trình mượn trả sách như thế nào?') },
      { label: t('aiChatbot.chipReserveFeature', 'Đặt chỗ trước khi hết sách'), query: t('aiChatbot.chipReserveFeatureQuery', 'Tính năng đặt chỗ trước hoạt động ra sao?') }
    ];
  };

  const lastAiMessage = [...messages].reverse().find(m => m.sender === 'ai' && m.text.trim() !== '');
  const suggestedChips = lastAiMessage ? getDynamicSuggestedChips(lastAiMessage.text) : [];

  return (
    <>
      <motion.button
        type="button"
        drag
        dragConstraints={{
          top: typeof window !== 'undefined' ? -window.innerHeight + 120 : -600,
          bottom: 20,
          left: typeof window !== 'undefined' ? -window.innerWidth + 80 : -350,
          right: 20
        }}
        dragElastic={0.1}
        dragMomentum={false}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('aiChatbot.robotAssistant', 'Trợ lý AI')}
        className={`fixed z-40 flex items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 active:scale-95 cursor-pointer glow-pulse touch-none transition-all duration-300
          bottom-28 right-4 h-12 w-12 md:bottom-6 md:right-6 md:h-14 md:w-14
          \${isScrolling ? 'opacity-20 scale-75 pointer-events-none md:opacity-100 md:scale-100 md:pointer-events-auto' : 'opacity-100 scale-100'}`}
      >
        <span className="material-symbols-outlined text-2xl md:text-3xl animate-pulse">smart_toy</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-surface-container-high bg-surface-bright shadow-2xl sm:max-w-md"
          >
            <header className="flex h-16 items-center justify-between border-b border-surface-container-high px-6 bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">smart_toy</span>
                <div>
                  <h2 className="text-sm font-bold text-on-surface">{t('aiChatbot.headerTitle', 'Thủ thư AI HCMUE')}</h2>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-ping" />
                    {t('aiChatbot.headerSubtitle', 'Trực tuyến 24/7')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex \${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm scholar-shadow relative group \${
                      msg.sender === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-surface-container text-on-surface rounded-tl-none border border-surface-container-high'
                    }`}
                  >
                    {renderMessageContent(index === 0 && msg.sender === 'ai' ? t('aiChatbot.initialGreeting', msg.text) : msg.text)}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.text === '' && (
                <div className="flex justify-start animate-pulse">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none p-4 text-sm bg-surface-container border border-surface-container-high">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="h-1.5 w-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs font-semibold ml-1">{t('aiChatbot.composing', 'AI đang soạn tin nhắn...')}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-surface-container-high bg-surface p-4">
              {suggestedChips.length > 0 && !isLoading && (
                <div className="mb-3 flex flex-col gap-1.5 animate-fade-in">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline px-1">{t('aiChatbot.quickSuggestions', 'Gợi ý câu hỏi nhanh:')}</p>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 snap-x snap-mandatory">
                    {suggestedChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.query)}
                        className="rounded-full bg-surface-bright border border-surface-container-high px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface cursor-pointer whitespace-nowrap snap-start shrink-0"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSendMessage(inputText);
                }}
                className="flex items-center gap-2 bg-surface-bright rounded-xl border border-surface-container-high px-3 py-2 shadow-inner focus-within:ring-2 focus-within:ring-primary/20"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder={t('aiChatbot.inputPlaceholder', 'Hỏi Thủ thư AI...')}
                  className="flex-1 bg-transparent text-sm text-on-surface outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

