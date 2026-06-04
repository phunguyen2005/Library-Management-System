import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
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
import { getIntlLocale } from '../i18n';

const TRANSLATIONS = {
  vi: {
    failedTitle: 'Thất bại',
    loadError: 'Không thể tải dữ liệu gamification của thành viên.',
    badgeUpdateError: 'Không thể cập nhật huy hiệu.',
    successTitle: 'Thành công',
    grantSuccess: 'Đã cấp vé quà tặng cho sinh viên.',
    grantError: 'Không thể cấp vé quà tặng.',
    statusChangedMsg: 'Đã thay đổi trạng thái vé thành: ',
    statusActive: 'Hoạt động',
    statusUsed: 'Đã dùng',
    statusExpired: 'Hết hạn',
    changeStatusError: 'Không thể đổi trạng thái vé.',
    confirmRevokeTicket: 'Bạn có chắc chắn muốn thu hồi vé quà tặng này?',
    revokeSuccess: 'Đã thu hồi vé quà tặng.',
    revokeError: 'Không thể thu hồi vé.',
    modalTitle: 'Hồ sơ thành tích:',
    modalSubtitle: 'Quản lý huy hiệu, cấp vé đặc quyền và chỉ số cá nhân.',
    syncing: 'Đang đồng bộ dữ liệu...',
    loadFailed: 'Không thể hiển thị thông tin học giả.',
    scholarStats: 'Chỉ số học giả',
    currentLevel: 'Cấp độ hiện tại',
    wealthLabel: 'Tài sản (Xu)',
    streakLabel: 'Chuỗi: {{streak}} ngày',
    badgeCollection: 'Bộ sưu tập huy hiệu',
    grantPrivilege: 'Phát hành đặc quyền',
    selectRewardLabel: 'Chọn gói phần thưởng',
    selectRewardPlaceholder: '-- Lựa chọn phần quà --',
    expiryDateLabel: 'Hạn sử dụng (Tùy chọn)',
    grantBtn: 'Phát hành ngay',
    walletTitle: 'Ví vé hiện có',
    walletCount: '{{count}} vé',
    walletEmpty: 'Chưa có vé nào trong ví',
    unknownGift: 'Quà tặng không xác định',
    ticketActive: 'Đang kích hoạt',
    ticketUsed: 'Đã sử dụng',
    ticketExpired: 'Hết hạn',
    clickToChangeStatus: 'Nhấn để đổi trạng thái',
    issuedAt: 'Cấp:',
    expiresAt: 'Hạn:',
    revokeTicketTooltip: 'Thu hồi vé'
  },
  en: {
    failedTitle: 'Failed',
    loadError: 'Could not load scholar gamification details.',
    badgeUpdateError: 'Could not update badge.',
    successTitle: 'Success',
    grantSuccess: 'Reward ticket granted to student.',
    grantError: 'Could not grant reward ticket.',
    statusChangedMsg: 'Ticket status changed to: ',
    statusActive: 'Active',
    statusUsed: 'Used',
    statusExpired: 'Expired',
    changeStatusError: 'Could not update ticket status.',
    confirmRevokeTicket: 'Are you sure you want to revoke this reward ticket?',
    revokeSuccess: 'Reward ticket revoked.',
    revokeError: 'Could not revoke ticket.',
    modalTitle: 'Achievement Profile:',
    modalSubtitle: 'Manage student badges, grant privilege tickets, and metrics.',
    syncing: 'Syncing scholar profile...',
    loadFailed: 'Could not display scholar information.',
    scholarStats: 'Scholar Metrics',
    currentLevel: 'Current Level',
    wealthLabel: 'Wealth (Coins)',
    streakLabel: 'Streak: {{streak}} days',
    badgeCollection: 'Badge Collection',
    grantPrivilege: 'Issue Privilege Ticket',
    selectRewardLabel: 'Select Reward Package',
    selectRewardPlaceholder: '-- Select Reward --',
    expiryDateLabel: 'Expiration Date (Optional)',
    grantBtn: 'Issue Now',
    walletTitle: 'Available Tickets',
    walletCount: '{{count}} tickets',
    walletEmpty: 'No tickets in wallet',
    unknownGift: 'Unknown Reward',
    ticketActive: 'Active',
    ticketUsed: 'Used',
    ticketExpired: 'Expired',
    clickToChangeStatus: 'Click to change status',
    issuedAt: 'Issued:',
    expiresAt: 'Expires:',
    revokeTicketTooltip: 'Revoke Ticket'
  },
  zh: {
    failedTitle: '失败',
    loadError: '无法加载会员学业成就数据。',
    badgeUpdateError: '无法更新徽章。',
    successTitle: '成功',
    grantSuccess: '已向学生发放礼券。',
    grantError: '无法发放礼券。',
    statusChangedMsg: '已将礼券状态更改为：',
    statusActive: '活动中',
    statusUsed: '已使用',
    statusExpired: '已过期',
    changeStatusError: '无法更改礼券状态。',
    confirmRevokeTicket: '您确定要收回此礼券吗？',
    revokeSuccess: '已收回礼券。',
    revokeError: '无法收回礼券。',
    modalTitle: '成就档案：',
    modalSubtitle: '管理徽章、发放特权礼券和个人指标。',
    syncing: '正在同步数据...',
    loadFailed: '无法显示会员信息。',
    scholarStats: '学者指标',
    currentLevel: '当前等级',
    wealthLabel: '资产 (金币)',
    streakLabel: '连续: {{streak}} 天',
    badgeCollection: '徽章收藏',
    grantPrivilege: '发放特权',
    selectRewardLabel: '选择奖励包',
    selectRewardPlaceholder: '-- 选择奖励物品 --',
    expiryDateLabel: '有效期 (可选)',
    grantBtn: '立即发放',
    walletTitle: '现有礼券钱包',
    walletCount: '{{count}} 张礼券',
    walletEmpty: '钱包中尚无礼券',
    unknownGift: '未知礼品',
    ticketActive: '活动中',
    ticketUsed: '已使用',
    ticketExpired: '已过期',
    clickToChangeStatus: '点击更改状态',
    issuedAt: '发放:',
    expiresAt: '有效期至:',
    revokeTicketTooltip: '收回礼券'
  },
  ja: {
    failedTitle: '失敗',
    loadError: 'メンバーのゲーミフィケーションデータをロードできませんでした。',
    badgeUpdateError: 'バッジを更新できませんでした。',
    successTitle: '成功',
    grantSuccess: '学生に特典チケットを発行しました。',
    grantError: '特典チケットを発行できませんでした。',
    statusChangedMsg: 'チケットのステータスを以下に変更しました：',
    statusActive: 'アクトブ',
    statusUsed: '使用済み',
    statusExpired: '期限切れ',
    changeStatusError: 'チケットのステータスを変更できませんでした。',
    confirmRevokeTicket: 'この特典チケットを回収してもよろしいですか？',
    revokeSuccess: '特典チケットを回収しました。',
    revokeError: 'チケットを回収できませんでした。',
    modalTitle: '実績プロフィール：',
    modalSubtitle: 'バッジ管理、特権チケット発行、個人指標。',
    syncing: 'データを同期中...',
    loadFailed: '学者情報を表示できません。',
    scholarStats: '学者指標',
    currentLevel: '現在のレベル',
    wealthLabel: '資産 (コイン)',
    streakLabel: '継続: {{streak}} 日',
    badgeCollection: 'バッジコレクション',
    grantPrivilege: '特権を発行する',
    selectRewardLabel: '特典パッケージを選択',
    selectRewardPlaceholder: '-- 特典の選択 --',
    expiryDateLabel: '有効期限 (任意)',
    grantBtn: '今すぐ発行',
    walletTitle: 'チケットウォレット',
    walletCount: '{{count}} 枚',
    walletEmpty: 'ウォレットにチケットはありません',
    unknownGift: '不明なギフト',
    ticketActive: '有効',
    ticketUsed: '使用済み',
    ticketExpired: '期限切れ',
    clickToChangeStatus: 'クリックしてステータスを変更',
    issuedAt: '発行日:',
    expiresAt: '有効期限:',
    revokeTicketTooltip: 'チケットを回収'
  },
  ko: {
    failedTitle: '실패',
    loadError: '회원의 학업 성취 데이터를 불러올 수 없습니다.',
    badgeUpdateError: '배지를 업데이트할 수 없습니다.',
    successTitle: '성공',
    grantSuccess: '학생에게 우대 티켓을 발급했습니다.',
    grantError: '티켓을 발급할 수 없습니다.',
    statusChangedMsg: '티켓 상태를 다음으로 변경했습니다: ',
    statusActive: '활성',
    statusUsed: '사용됨',
    statusExpired: '만료됨',
    changeStatusError: '티켓 상태를 변경할 수 없습니다.',
    confirmRevokeTicket: '이 우대 티켓을 회수하시겠습니까?',
    revokeSuccess: '우대 티켓을 회수했습니다.',
    revokeError: '티켓을 회수할 수 없습니다.',
    modalTitle: '업적 프로필:',
    modalSubtitle: '배지 관리, 특권 티켓 발급 및 개인 지표 관리.',
    syncing: '데이터 동기화 중...',
    loadFailed: '학자 정보를 표시할 수 없습니다.',
    scholarStats: '학자 지표',
    currentLevel: '현재 레벨',
    wealthLabel: '보유 자산 (코인)',
    streakLabel: '연속: {{streak}} 일',
    badgeCollection: '배지 컬렉션',
    grantPrivilege: '특권 티켓 발급',
    selectRewardLabel: '보상 패키지 선택',
    selectRewardPlaceholder: '-- 보상 선택 --',
    expiryDateLabel: '유효기간 (선택 사항)',
    grantBtn: '즉시 발급',
    walletTitle: '보유 티켓 지갑',
    walletCount: '{{count}}장',
    walletEmpty: '지갑에 티켓이 없습니다',
    unknownGift: '알 수 없는 보상',
    ticketActive: '활성화됨',
    ticketUsed: '사용됨',
    ticketExpired: '만료됨',
    clickToChangeStatus: '클릭하여 상태 변경',
    issuedAt: '발급:',
    expiresAt: '만료:',
    revokeTicketTooltip: '티켓 회수'
  }
};


interface MemberGamifyModalProps {
  isOpen: boolean;
  member: MemberListItem | null;
  onClose: () => void;
  onRefreshList: () => void;
}

export default function MemberGamifyModal({ isOpen, member, onClose, onRefreshList }: MemberGamifyModalProps) {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'vi').startsWith('en') ? 'en' :
                      (i18n.language || 'vi').startsWith('zh') ? 'zh' :
                      (i18n.language || 'vi').startsWith('ja') ? 'ja' :
                      (i18n.language || 'vi').startsWith('ko') ? 'ko' : 'vi';
  const localT = TRANSLATIONS[currentLang];

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
        title: localT.failedTitle,
        message: getErrorMessage(err, localT.loadError),
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
        title: localT.failedTitle,
        message: getErrorMessage(err, localT.badgeUpdateError),
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
        title: localT.successTitle,
        message: localT.grantSuccess,
      });
      setSelectedRewardId('');
      setTicketExpiry('');
      await loadMemberGamifyData(false);
      onRefreshList();
    } catch (err) {
      emitToast({
        tone: 'error',
        title: localT.failedTitle,
        message: getErrorMessage(err, localT.grantError),
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
        title: localT.successTitle,
        message: `${localT.statusChangedMsg}${
          nextStatus === 'active' ? localT.statusActive : nextStatus === 'used' ? localT.statusUsed : localT.statusExpired
        }`,
      });
      await loadMemberGamifyData(false);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: localT.failedTitle,
        message: getErrorMessage(err, localT.changeStatusError),
      });
    }
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm(localT.confirmRevokeTicket)) return;
    try {
      await deleteMemberReward(ticketId);
      emitToast({
        tone: 'success',
        title: localT.successTitle,
        message: localT.revokeSuccess,
      });
      await loadMemberGamifyData(false);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: localT.failedTitle,
        message: getErrorMessage(err, localT.revokeError),
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
                    {localT.modalTitle} <span className="text-indigo-600">{member?.name}</span>
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5 font-medium">
                    {localT.modalSubtitle}
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
                <span className="text-sm font-medium">{localT.syncing}</span>
              </div>
            ) : !details ? (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-medium">
                {localT.loadFailed}
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50/30">
                {/* Left Column: Stats & Badges */}
                <div className="w-full md:w-[55%] border-r border-slate-100 p-6 flex flex-col gap-8 overflow-y-auto">
                  {/* Stats Overview */}
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-500 text-[20px]">monitoring</span>
                      {localT.scholarStats}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50 relative overflow-hidden group">
                        <div className="absolute right-[-10px] top-[-10px] opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                          <span className="material-symbols-outlined text-[100px]">military_tech</span>
                        </div>
                        <div className="relative z-10">
                          <span className="text-xs uppercase font-bold text-indigo-100 tracking-wider">{localT.currentLevel}</span>
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
                          <span className="text-xs uppercase font-bold text-amber-100 tracking-wider">{localT.wealthLabel}</span>
                          <strong className="text-3xl font-black block mt-1 mb-0.5">{details.points.toLocaleString()}</strong>
                          <span className="text-sm font-medium text-amber-100 bg-black/10 px-2.5 py-1 rounded-full inline-block mt-2 flex items-center gap-1 w-fit">
                            <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                            {localT.streakLabel.replace('{{streak}}', String(details.daily_streak))}
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
                        {localT.badgeCollection}
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
                      {localT.grantPrivilege}
                    </h4>
                    
                    <form onSubmit={handleGrantReward} className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4 shadow-sm">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">{localT.selectRewardLabel}</label>
                        <div className="relative">
                          <select
                            required
                            value={selectedRewardId}
                            onChange={(e) => setSelectedRewardId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                          >
                            <option value="">{localT.selectRewardPlaceholder}</option>
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
                        <label className="block text-xs font-bold text-slate-600 mb-2">{localT.expiryDateLabel}</label>
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
                            {localT.grantBtn}
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
                        {localT.walletTitle}
                      </h4>
                      <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">
                        {localT.walletCount.replace('{{count}}', String(details.tickets.length))}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {details.tickets.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 opacity-60">
                          <span className="material-symbols-outlined text-[48px]">confirmation_number</span>
                          <span className="text-sm font-medium">{localT.walletEmpty}</span>
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
                                  {ticket.reward?.name || localT.unknownGift}
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
                                  title={localT.clickToChangeStatus}
                                >
                                  {ticket.status === 'active' ? localT.ticketActive : ticket.status === 'used' ? localT.ticketUsed : localT.ticketExpired}
                                </button>
                              </div>
                              <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">event_available</span>
                                  {localT.issuedAt} {new Date(ticket.redeemed_at).toLocaleDateString(getIntlLocale())}
                                </span>
                                {ticket.expires_at && (
                                  <span className="flex items-center gap-1.5 text-amber-600/80">
                                    <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                    {localT.expiresAt} {new Date(ticket.expires_at).toLocaleDateString(getIntlLocale())}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title={localT.revokeTicketTooltip}
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
