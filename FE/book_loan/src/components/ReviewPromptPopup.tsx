import React, { useState } from 'react';
import { motion } from 'framer-motion';
import StarRating from './StarRating';
import { submitBookReview } from '../api/reviewApi';
import { emitToast } from '../notifications/events';
import { getErrorMessage } from '../lib/errors';
import type { MemberBorrowRequest } from '../types/request';

interface ReviewPromptPopupProps {
  loan: MemberBorrowRequest;
  onClose: () => void;
  onSubmitSuccess: (loanId: number) => void;
}

export default function ReviewPromptPopup({
  loan,
  onClose,
  onSubmitSuccess,
}: ReviewPromptPopupProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!loan.book_id) return;
    setIsSubmitting(true);

    try {
      const response = await submitBookReview(
        loan.book_id,
        rating,
        comment.trim() || null,
        loan.id
      );

      emitToast({
        tone: 'success',
        title: 'Đánh giá thành công',
        message: response.message || 'Cảm ơn đóng góp của bạn!',
      });

      onSubmitSuccess(loan.id);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Không thể gửi đánh giá.');
      emitToast({
        tone: 'error',
        title: 'Gửi đánh giá thất bại',
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Backdrop overlay click wrapper */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      {/* Modal content */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md rounded-2xl border border-surface-container-high bg-surface-bright shadow-2xl p-6 flex flex-col items-center overflow-hidden z-10"
      >
        {/* Glowing header strip */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-tertiary to-primary" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-on-surface-variant hover:bg-surface-container rounded-full p-1 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Animated icon container */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shadow-inner mb-4 mt-2">
          <span className="material-symbols-outlined text-3xl font-semibold">rate_review</span>
        </div>

        {/* Text content */}
        <h3 className="text-lg font-extrabold text-on-surface leading-tight text-center px-4">
          Chúc mừng bạn đã trả sách thành công! 🎉
        </h3>
        
        <p className="text-xs text-on-surface-variant mt-2 text-center px-2 leading-relaxed">
          Bạn vừa hoàn thành việc trả cuốn sách <strong className="text-on-surface font-bold">"{loan.bookTitle}"</strong>. Hãy dành 3 giây chia sẻ cảm nhận để tích lũy điểm thưởng và kinh nghiệm nhé!
        </p>

        {/* Gamification Indicator */}
        <div className="my-4 w-full bg-primary/5 border border-primary/10 rounded-xl p-3 flex justify-around items-center">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-500 fill-amber-500 font-variation-fill text-base">star</span>
            <span className="text-xs font-bold text-slate-700 dark:text-stone-300">+30 XP Kinh nghiệm</span>
          </div>
          <div className="h-4 w-px bg-outline-variant" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">monetization_on</span>
            <span className="text-xs font-bold text-slate-700 dark:text-stone-300">+10 Điểm thưởng</span>
          </div>
        </div>

        {/* Form controls */}
        <div className="w-full space-y-4">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-outline">Đánh giá của bạn:</span>
            <StarRating rating={rating} onChange={setRating} interactive={true} size="lg" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-outline">Bình luận cảm nhận (tùy chọn)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nghĩ của bạn về sách (nội dung, chất lượng bản in...)"
              rows={3}
              maxLength={1000}
              className="w-full rounded-xl border border-surface-container-high bg-white p-3 text-xs outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-outline/60 transition-all duration-200 resize-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="w-full mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold rounded-xl border border-surface-container-high text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            Để sau
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá (+10 Điểm)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
