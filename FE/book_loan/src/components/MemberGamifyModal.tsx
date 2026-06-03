import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getMemberGamifyInfo,
  syncMemberBadges,
  grantMemberReward,
  updateMemberReward,
  deleteMemberReward,
  getAdminRewards,
} from '../api/adminGamifyApi';
import type { RewardRecord } from '../api/gamifyApi';
import type { MemberGamifyDetails } from '../api/adminGamifyApi';
import type { MemberListItem } from '../types/member';
import { emitToast } from '../notifications/events';
import { getErrorMessage } from '../lib/errors';

interface MemberGamifyModalProps {
  isOpen: boolean;
  member: MemberListItem | null;
  onClose: () => void;
  onRefreshList: () => void;
}

export default function MemberGamifyModal({ isOpen, member, onClose, onRefreshList }: MemberGamifyModalProps) {
  const [details, setDetails] = useState<MemberGamifyDetails | null>(null);
  const [availableRewards, setAvailableRewards] = useState<RewardRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Ticket State
  const [selectedRewardId, setSelectedRewardId] = useState<number | ''>('');
  const [ticketExpiry, setTicketExpiry] = useState('');

  const loadMemberGamifyData = async (isInitialLoad = true) => {
    if (!member) return;
    if (isInitialLoad) setIsLoading(true);
    try {
      const [gamifyData, rewardsData] = await Promise.all([
        getMemberGamifyInfo(member.id),
        getAdminRewards(),
      ]);
      setDetails(gamifyData);
      setAvailableRewards(rewardsData.filter((r) => r.is_active));
    } catch (err) {
      emitToast({
        tone: 'error',
        title: 'Thất bại',
        message: getErrorMessage(err, 'Không thể tải dữ liệu gamification của thành viên.'),
      });
      if (isInitialLoad) onClose();
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && member) {
      void loadMemberGamifyData(true);
      setSelectedRewardId('');
      setTicketExpiry('');
    }
  }, [isOpen, member]);

  const handleToggleBadge = async (badgeId: number, currentlyEarned: boolean) => {
    if (!details || !member) return;
    
    // Proper Optimistic UI update
    const updatedBadges = details.badges.map(b => 
      b.id === badgeId ? { ...b, is_earned: !currentlyEarned } : b
    );
    setDetails({ ...details, badges: updatedBadges });
    
    const nextBadgeIds = updatedBadges.filter(b => b.is_earned).map(b => b.id);

    try {
      await syncMemberBadges(member.id, nextBadgeIds);
      // Background reload
      await loadMemberGamifyData(false);
      onRefreshList();
    } catch (err) {
      // Revert optimistic update on error
      await loadMemberGamifyData(false);
      emitToast({
        tone: 'error',
        title: 'Thất bại',
        message: getErrorMessage(err, 'Không thể cập nhật huy hiệu.'),
      });
    }
  };

  const handleGrantReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedRewardId) return;

    setIsSaving(true);
    try {
      await grantMemberReward(member.id, {
        reward_id: Number(selectedRewardId),
        expires_at: ticketExpiry || null,
      });
      emitToast({
        tone: 'success',
        title: 'Thành công',
        message: 'Đã cấp vé quà tặng cho sinh viên.',
      });
      setSelectedRewardId('');
      setTicketExpiry('');
      await loadMemberGamifyData(false);
      onRefreshList();
    } catch (err) {
      emitToast({
        tone: 'error',
        title: 'Thất bại',
        message: getErrorMessage(err, 'Không thể cấp vé quà tặng.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, currentStatus: 'active' | 'used' | 'expired') => {
    const statuses: ('active' | 'used' | 'expired')[] = ['active', 'used', 'expired'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    try {
      await updateMemberReward(ticketId, { status: nextStatus });
      emitToast({
        tone: 'success',
        title: 'Thành công',
        message: `Đã thay đổi trạng thái vé thành: ${
          nextStatus === 'active' ? 'Hoạt động' : nextStatus === 'used' ? 'Đã dùng' : 'Hết hạn'
        }`,
      });
      await loadMemberGamifyData(false);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: 'Thất bại',
        message: getErrorMessage(err, 'Không thể đổi trạng thái vé.'),
      });
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm('Bạn có chắc chắn muốn thu hồi vé quà tặng này?')) return;
    try {
      await deleteMemberReward(ticketId);
      emitToast({
        tone: 'success',
        title: 'Thành công',
        message: 'Đã thu hồi vé quà tặng.',
      });
      await loadMemberGamifyData(false);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: 'Thất bại',
        message: getErrorMessage(err, 'Không thể thu hồi vé.'),
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="relative bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-xl px-6 py-5 z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                  <span className="material-symbols-outlined text-[28px]">workspace_premium</span>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    Hồ sơ thành tích: <span className="text-indigo-600">{member?.name}</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 font-medium">
                    Quản lý huy hiệu, cấp vé đặc quyền và chỉ số cá nhân.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content Body */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Đang đồng bộ dữ liệu...</span>
              </div>
            ) : !details ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-medium">
                Không thể hiển thị thông tin học giả.
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/30">
                {/* Left Column: Stats & Badges */}
                <div className="w-full md:w-[55%] border-r border-slate-100 p-6 flex flex-col gap-8 overflow-y-auto">
                  {/* Stats Overview */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-500 text-[20px]">monitoring</span>
                      Chỉ số học giả
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                          <span className="material-symbols-outlined text-[100px]">military_tech</span>
                        </div>
                        <div className="relative z-10">
                          <span className="text-xs uppercase font-bold text-indigo-100 tracking-wider">Cấp độ hiện tại</span>
                          <strong className="text-3xl font-black block mt-1 mb-0.5">Lvl {details.level}</strong>
                          <span className="text-sm font-medium text-indigo-100 bg-black/10 px-2.5 py-1 rounded-full inline-block mt-2">
                            {details.xp.toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-200/50 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                          <span className="material-symbols-outlined text-[100px]">monetization_on</span>
                        </div>
                        <div className="relative z-10">
                          <span className="text-xs uppercase font-bold text-amber-100 tracking-wider">Tài sản (Xu)</span>
                          <strong className="text-3xl font-black block mt-1 mb-0.5">{details.points.toLocaleString()}</strong>
                          <span className="text-sm font-medium text-amber-100 bg-black/10 px-2.5 py-1 rounded-full inline-block mt-2 flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                            Chuỗi: {details.daily_streak} ngày
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badges Toggle */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-[20px]">award_star</span>
                        Bộ sưu tập huy hiệu
                      </h4>
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {details.badges.filter(b => b.is_earned).length} / {details.badges.length}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {details.badges.map((badge) => {
                        const isMaterialIcon = badge.icon && badge.icon.length > 2;
                        return (
                          <button
                            key={badge.id}
                            type="button"
                            onClick={() => handleToggleBadge(badge.id, badge.is_earned)}
                            className={`relative border rounded-2xl p-4 text-left transition-all duration-300 flex items-start gap-3 overflow-hidden ${
                              badge.is_earned
                                ? 'border-indigo-200 bg-indigo-50/50 shadow-sm hover:shadow-md hover:border-indigo-300'
                                : 'border-slate-200 bg-white hover:bg-slate-50 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'
                            }`}
                          >
                            {badge.is_earned && (
                              <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden rounded-tr-2xl pointer-events-none">
                                <div className="absolute top-[-10px] right-[-10px] w-8 h-8 bg-indigo-500 rounded-full blur-xl opacity-30"></div>
                              </div>
                            )}
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${badge.is_earned ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-slate-100 text-slate-500'}`}>
                              {isMaterialIcon ? (
                                <span className="material-symbols-outlined text-[24px]">{badge.icon}</span>
                              ) : (
                                <span className="text-[24px]">{badge.icon || '🏅'}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-slate-800 text-sm truncate">{badge.name}</span>
                                {badge.is_earned && (
                                  <span className="material-symbols-outlined text-indigo-600 text-[18px] shrink-0">check_circle</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {badge.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Tickets & Rewards */}
                <div className="w-full md:w-[45%] flex flex-col overflow-hidden bg-white">
                  {/* Grant Manual Reward */}
                  <div className="p-6 border-b border-slate-100">
                    <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-500 text-[20px]">redeem</span>
                      Phát hành đặc quyền
                    </h4>
                    
                    <form onSubmit={handleGrantReward} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 shadow-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Chọn gói phần thưởng</label>
                        <div className="relative">
                          <select
                            required
                            value={selectedRewardId}
                            onChange={(e) => setSelectedRewardId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                          >
                            <option value="">-- Lựa chọn phần quà --</option>
                            {availableRewards.map((reward) => (
                              <option key={reward.id} value={reward.id}>
                                {reward.name} (🪙 {reward.points_cost})
                              </option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">Hạn sử dụng (Tùy chọn)</label>
                        <input
                          type="date"
                          value={ticketExpiry}
                          onChange={(e) => setTicketExpiry(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isSaving || !selectedRewardId}
                        className="w-full rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-bold hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-none transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                      >
                        {isSaving ? (
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            Phát hành ngay
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* List of active/used tickets */}
                  <div className="flex-1 flex flex-col overflow-hidden p-6 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-[20px]">local_activity</span>
                        Ví vé hiện có
                      </h4>
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                        {details.tickets.length} vé
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {details.tickets.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                          <span className="material-symbols-outlined text-[48px]">confirmation_number</span>
                          <span className="text-sm font-medium">Chưa có vé nào trong ví</span>
                        </div>
                      ) : (
                        details.tickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="group border border-slate-100 bg-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1.5">
                                <span className="font-bold text-slate-800 text-sm truncate">
                                  {ticket.reward?.name || 'Quà tặng không xác định'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTicketStatus(ticket.id, ticket.status)}
                                  className={`shrink-0 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide transition-all ${
                                    ticket.status === 'active'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                                      : ticket.status === 'used'
                                      ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                      : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                  title="Nhấn để đổi trạng thái"
                                >
                                  {ticket.status === 'active' ? 'Đang kích hoạt' : ticket.status === 'used' ? 'Đã sử dụng' : 'Hết hạn'}
                                </button>
                              </div>
                              <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">event_available</span>
                                  Cấp: {new Date(ticket.redeemed_at).toLocaleDateString('vi-VN')}
                                </span>
                                {ticket.expires_at && (
                                  <span className="flex items-center gap-1.5 text-amber-600/80">
                                    <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                    Hạn: {new Date(ticket.expires_at).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Thu hồi vé"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
