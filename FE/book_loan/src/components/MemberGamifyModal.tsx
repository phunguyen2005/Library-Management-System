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

  const loadMemberGamifyData = async () => {
    if (!member) return;
    setIsLoading(true);
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
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && member) {
      void loadMemberGamifyData();
      setSelectedRewardId('');
      setTicketExpiry('');
    }
  }, [isOpen, member]);

  const handleToggleBadge = async (badgeId: number, currentlyEarned: boolean) => {
    if (!details || !member) return;
    
    // Optimistic UI update
    const nextBadgeIds = details.badges
      .filter((b) => (b.id === badgeId ? !currentlyEarned : b.is_earned))
      .map((b) => b.id);

    try {
      await syncMemberBadges(member.id, nextBadgeIds);
      emitToast({
        tone: 'success',
        title: 'Thành công',
        message: 'Đã cập nhật danh sách huy hiệu.',
      });
      // Reload
      await loadMemberGamifyData();
      onRefreshList();
    } catch (err) {
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
      await loadMemberGamifyData();
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
      await loadMemberGamifyData();
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
      await loadMemberGamifyData();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] md:h-[80vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500">workspace_premium</span>
                  Thiết lập Gamify & Quà tặng: <span className="text-indigo-600 font-extrabold">{member?.name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý huy hiệu, cấp phát quà tặng thủ công hoặc thu hồi đặc quyền của thành viên.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content Body */}
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Đang tải dữ liệu gamification...
              </div>
            ) : !details ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                Không thể hiển thị thông tin học giả.
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Left Column: Stats & Badges */}
                <div className="w-full md:w-1/2 border-r border-slate-100 p-6 overflow-y-auto flex flex-col gap-6">
                  {/* Stats Overview */}
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3">Chỉ số học giả</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50/50 border border-indigo-100/60 rounded-xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cấp độ / XP</span>
                        <strong className="text-indigo-600 text-lg font-extrabold block mt-0.5">Lvl {details.level}</strong>
                        <span className="text-xs text-indigo-500 font-bold">{details.xp} XP</span>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-100/60 rounded-xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Số xu tích lũy</span>
                        <strong className="text-amber-600 text-lg font-extrabold block mt-0.5">🪙 {details.points} xu</strong>
                        <span className="text-xs text-slate-500">Chuỗi: {details.daily_streak} ngày 🔥</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges Toggle */}
                  <div className="flex-1 flex flex-col">
                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3">Huy hiệu danh giá ({details.badges.filter(b => b.is_earned).length}/{details.badges.length})</h4>
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 max-h-[250px] md:max-h-[none] pr-1">
                      {details.badges.map((badge) => (
                        <button
                          key={badge.id}
                          type="button"
                          onClick={() => handleToggleBadge(badge.id, badge.is_earned)}
                          className={`border rounded-xl p-3 text-left transition-all hover:scale-[1.02] flex gap-2.5 items-start ${
                            badge.is_earned
                              ? 'border-indigo-100 bg-indigo-50/10 shadow-sm'
                              : 'border-slate-100 bg-slate-50/50 grayscale opacity-50'
                          }`}
                        >
                          <span className="text-2xl mt-0.5">{badge.icon || '🏅'}</span>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800 text-xs">{badge.name}</span>
                              {badge.is_earned && (
                                <span className="material-symbols-outlined text-indigo-600 text-xs font-extrabold">check_circle</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {badge.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Tickets & Rewards */}
                <div className="w-full md:w-1/2 p-6 flex flex-col gap-6 overflow-hidden bg-slate-50/10">
                  {/* Grant Manual Reward */}
                  <div className="bg-gradient-to-r from-indigo-50 to-blue-50/30 border border-indigo-100/50 rounded-xl p-4">
                    <h4 className="font-bold text-xs uppercase text-indigo-900 tracking-wider mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">add_card</span>
                      Cấp vé thưởng thủ công
                    </h4>
                    
                    <form onSubmit={handleGrantReward} className="space-y-3">
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-3xs font-bold uppercase text-slate-500 mb-1">Chọn quà tặng</label>
                          <select
                            required
                            value={selectedRewardId}
                            onChange={(e) => setSelectedRewardId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">-- Chọn phần quà --</option>
                            {availableRewards.map((reward) => (
                              <option key={reward.id} value={reward.id}>
                                {reward.name} (🪙 {reward.points_cost})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full md:w-[130px]">
                          <label className="block text-3xs font-bold uppercase text-slate-500 mb-1">Ngày hết hạn</label>
                          <input
                            type="date"
                            value={ticketExpiry}
                            onChange={(e) => setTicketExpiry(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isSaving || !selectedRewardId}
                          className="rounded-lg bg-indigo-600 text-white px-4 py-1.5 text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1"
                        >
                          {isSaving ? 'Đang cấp...' : 'Cấp vé quà tặng'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* List of active/used tickets */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-3">Ví vé quà tặng hiện có ({details.tickets.length})</h4>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                      {details.tickets.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-400">
                          Thành viên chưa có vé quà tặng nào.
                        </div>
                      ) : (
                        details.tickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="border border-slate-100 bg-white rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition-shadow"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-xs">
                                  {ticket.reward?.name || 'Quà tặng không tên'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateTicketStatus(ticket.id, ticket.status)}
                                  className={`text-3xs px-2 py-0.5 rounded-full font-bold uppercase transition-all ${
                                    ticket.status === 'active'
                                      ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                      : ticket.status === 'used'
                                      ? 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                      : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                  }`}
                                  title="Click để đổi trạng thái"
                                >
                                  {ticket.status === 'active' ? 'Hoạt động' : ticket.status === 'used' ? 'Đã dùng' : 'Hết hạn'}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-400">
                                Nhận: {new Date(ticket.redeemed_at).toLocaleDateString('vi-VN')}
                                {ticket.expires_at && ` - Hạn: ${new Date(ticket.expires_at).toLocaleDateString('vi-VN')}`}
                                {ticket.used_at && ` - Dùng lúc: ${new Date(ticket.used_at).toLocaleDateString('vi-VN')}`}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 shrink-0 transition-colors"
                              title="Thu hồi/Xóa vé"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
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
