import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import StarRating from './StarRating';
import { submitBookReview } from '../api/reviewApi';
import { emitToast } from '../notifications/events';
import { getErrorMessage } from '../lib/errors';
import type { MemberBorrowRequest } from '../types/request';

const TRANSLATIONS = {
  vi: {
    successTitle: 'Đánh giá thành công',
    successMsg: 'Cảm ơn đóng góp của bạn!',
    submitError: 'Không thể gửi đánh giá.',
    failedTitle: 'Gửi đánh giá thất bại',
    congratsTitle: 'Chúc mừng bạn đã trả sách thành công! 🎉',
    bodyMessage: 'Bạn vừa hoàn thành việc trả cuốn sách "{{title}}". Hãy dành 3 giây chia sẻ cảm nhận để tích lũy điểm thưởng và kinh nghiệm nhé!',
    xpLabel: '+30 XP Kinh nghiệm',
    pointsLabel: '+10 Điểm thưởng',
    yourRatingLabel: 'Đánh giá của bạn:',
    commentLabel: 'Bình luận cảm nhận (tùy chọn)',
    commentPlaceholder: 'Chia sẻ cảm nghĩ của bạn về sách (nội dung, chất lượng bản in...)',
    skipBtn: 'Để sau',
    submitting: 'Đang gửi...',
    submitBtn: 'Gửi đánh giá (+10 Điểm)'
  },
  en: {
    successTitle: 'Review submitted',
    successMsg: 'Thank you for your feedback!',
    submitError: 'Could not submit review.',
    failedTitle: 'Failed to submit review',
    congratsTitle: 'Book returned successfully! 🎉',
    bodyMessage: 'You have just returned "{{title}}". Take 3 seconds to review and earn reward points & XP!',
    xpLabel: '+30 XP Experience',
    pointsLabel: '+10 Reward Points',
    yourRatingLabel: 'Your rating:',
    commentLabel: 'Comment / Feedback (optional)',
    commentPlaceholder: 'Share your thoughts about this book (content, print quality...)',
    skipBtn: 'Later',
    submitting: 'Submitting...',
    submitBtn: 'Submit review (+10 pts)'
  },
  zh: {
    successTitle: '评价成功',
    successMsg: '感谢您的反馈！',
    submitError: '无法提交评价。',
    failedTitle: '提交评价失败',
    congratsTitle: '恭喜您成功还书！ 🎉',
    bodyMessage: '您刚刚完成了图书《{{title}}》的归还。花 3 秒分享您的看法，即可累积积分和经验值！',
    xpLabel: '+30 XP 经验值',
    pointsLabel: '+10 奖励积分',
    yourRatingLabel: '您的评分：',
    commentLabel: '评论感想 (可选)',
    commentPlaceholder: '分享您对本书的想法 (内容、印刷质量等...)',
    skipBtn: '以后再说',
    submitting: '正在提交...',
    submitBtn: '提交评价 (+10 积分)'
  },
  ja: {
    successTitle: 'レビューの送信完了',
    successMsg: 'ご意見ありがとうございました！',
    submitError: 'レビューを送信できませんでした。',
    failedTitle: 'レビューの送信に失敗しました',
    congratsTitle: '本の返却が完了しました！ 🎉',
    bodyMessage: '『{{title}}』の返却が完了しました。3秒で感想をシェアして、報酬ポイントと経験値を獲得しましょう！',
    xpLabel: '+30 XP 経験値',
    pointsLabel: '+10 報酬ポイント',
    yourRatingLabel: 'あなたの評価：',
    commentLabel: '感想・コメント（任意）',
    commentPlaceholder: '本に関する感想を共有してください (内容、印刷品質など...)',
    skipBtn: '後で',
    submitting: '送信中...',
    submitBtn: 'レビューを送信 (+10 P)'
  },
  ko: {
    successTitle: '리뷰 등록 완료',
    successMsg: '피드백해 주셔서 감사합니다!',
    submitError: '리뷰를 등록할 수 없습니다.',
    failedTitle: '리뷰 등록 실패',
    congratsTitle: '도서 반납 완료! 🎉',
    bodyMessage: '"{{title}}" 반납이 완료되었습니다. 3초간 평가를 남기고 보상 포인트와 경험치를 획득해 보세요!',
    xpLabel: '+30 XP 경험치',
    pointsLabel: '+10 보상 포인트',
    yourRatingLabel: '내 평가:',
    commentLabel: '의견 및 코멘트 (선택 사항)',
    commentPlaceholder: '도서에 대한 의견을 나누어 주세요 (내용, 인쇄 상태 등...)',
    skipBtn: '나중에',
    submitting: '제출 중...',
    submitBtn: '리뷰 제출 (+10점)'
  }
};


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
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'vi').startsWith('en') ? 'en' :
                      (i18n.language || 'vi').startsWith('zh') ? 'zh' :
                      (i18n.language || 'vi').startsWith('ja') ? 'ja' :
                      (i18n.language || 'vi').startsWith('ko') ? 'ko' : 'vi';
  const localT = TRANSLATIONS[currentLang];

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
        title: localT.successTitle,
        message: response.message || localT.successMsg,
      });

      onSubmitSuccess(loan.id);
    } catch (error: unknown) {
      const message = getErrorMessage(error, localT.submitError);
      emitToast({
        tone: 'error',
        title: localT.failedTitle,
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
          {localT.congratsTitle}
        </h3>
        
        <p className="text-xs text-on-surface-variant mt-2 text-center px-2 leading-relaxed">
          {localT.bodyMessage.replace('{{title}}', loan.bookTitle || '')}
        </p>

        {/* Gamification Indicator */}
        <div className="my-4 w-full bg-primary/5 border border-primary/10 rounded-xl p-3 flex justify-around items-center">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-500 fill-amber-500 font-variation-fill text-base">star</span>
            <span className="text-xs font-bold text-slate-700 dark:text-stone-300">{localT.xpLabel}</span>
          </div>
          <div className="h-4 w-px bg-outline-variant" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">monetization_on</span>
            <span className="text-xs font-bold text-slate-700 dark:text-stone-300">{localT.pointsLabel}</span>
          </div>
        </div>

        {/* Form controls */}
        <div className="w-full space-y-4">
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-bold text-outline">{localT.yourRatingLabel}</span>
            <StarRating rating={rating} onChange={setRating} interactive={true} size="lg" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-outline">{localT.commentLabel}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={localT.commentPlaceholder}
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
            {localT.skipBtn}
          </button>
          
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex-1 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {isSubmitting ? localT.submitting : localT.submitBtn}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
