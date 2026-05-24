import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sendChatMessage, type ChatMessage } from '../api/aiApi';
import { getErrorMessage } from '../lib/errors';
import { emitToast } from '../notifications/events';
import { motion, AnimatePresence } from 'motion/react';

export default function AiChatbot() {
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

    try {
      const activeHistory = messages.slice(-10); // Keep last 10 messages for context
      const response = await sendChatMessage(text, activeHistory);
      
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: response.response },
      ]);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Đã xảy ra sự cố khi kết nối với AI.');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '⚠️ *Xin lỗi bạn, kết nối của tôi tới hệ thống AI đang bị gián đoạn. Bạn vui lòng thử lại sau ít phút nhé!*',
        },
      ]);
      emitToast({ tone: 'error', title: 'Lỗi chatbot AI', message });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse message text and render custom elements (like book links [ID: 5])
  const renderMessageContent = (text: string) => {
    // Basic Markdown bullet points, bold text
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;

      // Replace bold text **bold**
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

      // Detect [ID: X] pattern
      const idRegex = /\[ID:\s*(\d+)\]/g;
      const hasId = idRegex.test(line);

      if (hasId) {
        // Find all matches
        const matches = [...line.matchAll(idRegex)];
        
        return (
          <div key={idx} className="my-1.5 flex flex-col space-y-1">
            <p className="text-sm leading-relaxed">{content}</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {matches.map((match, mIdx) => {
                const bookId = Number(match[1]);
                return (
                  <button
                    key={mIdx}
                    type="button"
                    onClick={() => {
                      setSearchParams({ book: String(bookId) });
                      // If user is not on Catalog, suggest redirection or handle locally
                      if (window.location.pathname !== '/catalog') {
                        window.location.href = `/catalog?book=${bookId}`;
                      }
                    }}
                    className="inline-flex max-w-fit items-center gap-1.5 rounded-xl bg-surface-bright border border-surface-container-high px-3 py-1.5 text-xs font-medium text-primary shadow-sm transition-all hover:bg-surface hover:text-primary focus:ring-2 focus:ring-primary/20 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    <span>Xem chi tiết sách #{bookId}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // Render standard list item
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

  const SUGGESTED_CHIPS = [
    { label: '🔍 Tìm sách lập trình Web', query: 'Tìm cho tôi sách về lập trình Web' },
    { label: '📋 Quy trình mượn sách', query: 'Quy trình mượn trả sách như thế nào?' },
    { label: 'Đặt chỗ trước khi hết sách', query: 'Tính năng đặt chỗ trước hoạt động ra sao?' },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Trợ lý AI"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95 cursor-pointer glow-pulse"
      >
        <span className="material-symbols-outlined text-3xl animate-pulse">smart_toy</span>
      </button>

      {/* Slide-in Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-surface-container-high bg-surface-bright shadow-2xl sm:max-w-md"
          >
            {/* Header */}
            <header className="flex h-16 items-center justify-between border-b border-surface-container-high px-6 bg-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">smart_toy</span>
                <div>
                  <h2 className="text-sm font-bold text-on-surface">Thủ thư AI HCMUE</h2>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-ping" />
                    Trực tuyến 24/7
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

            {/* Message Thread */}
            <div className="custom-scrollbar flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm scholar-shadow ${
                      msg.sender === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-surface-container text-on-surface rounded-tl-none border border-surface-container-high'
                    }`}
                  >
                    {renderMessageContent(msg.text)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-none p-4 text-sm bg-surface-container border border-surface-container-high">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="h-1.5 w-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-1.5 w-1.5 bg-on-surface-variant rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs font-semibold ml-1">AI đang suy nghĩ...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-surface-container-high bg-surface p-4">
              {messages.length === 1 && (
                <div className="mb-4 flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-outline">Gợi ý câu hỏi nhanh:</p>
                  <div className="flex flex-col gap-1.5">
                    {SUGGESTED_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip.query)}
                        className="rounded-lg bg-surface-bright border border-surface-container-high px-3 py-2 text-left text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface cursor-pointer"
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
                  placeholder="Hỏi Thủ thư AI..."
                  className="flex-1 bg-transparent text-sm text-on-surface outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
