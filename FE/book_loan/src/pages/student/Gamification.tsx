import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchGamifyProfile,
  submitDailyCheckIn,
  fetchAllBadges,
  fetchRedeemableRewards,
  redeemReward,
  fetchLeaderboard,
  type GamifyProfile,
  type BadgeRecord,
  type RewardRecord,
  type LeaderboardEntry,
} from '../../api/gamifyApi';
import { emitToast } from '../../notifications/events';
import { getErrorMessage } from '../../lib/errors';
import PageLoader from '../../components/PageLoader';

export default function Gamification() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<GamifyProfile | null>(null);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [rewards, setRewards] = useState<RewardRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, setIsActionPending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const loadData = async () => {
    try {
      const [profileData, badgesData, rewardsData, leaderboardData] = await Promise.all([
        fetchGamifyProfile(),
        fetchAllBadges(),
        fetchRedeemableRewards(),
        fetchLeaderboard(),
      ]);
      setProfile(profileData);
      setBadges(badgesData);
      setRewards(rewardsData);
      setLeaderboard(leaderboardData);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: t('common.error'),
        message: getErrorMessage(err, 'Không thể tải dữ liệu gamification.'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCheckIn = async () => {
    if (isActionPending) return;
    setIsActionPending(true);

    try {
      const res = await submitDailyCheckIn();
      emitToast({
        tone: 'success',
        title: t('common.success'),
        message: t('gamify.checkInSuccess', { xp: res.xp_gained, points: res.points_gained }),
      });
      // Reload profile & leaderboard
      await loadData();
      setShowSuccessModal(true);
    } catch (err) {
      emitToast({
        tone: 'error',
        title: t('common.error'),
        message: getErrorMessage(err, 'Điểm danh thất bại.'),
      });
    } finally {
      setIsActionPending(false);
    }
  };

  const handleRedeem = async (rewardId: number, rewardName: string) => {
    if (isActionPending) return;
    setIsActionPending(true);

    try {
      const res = await redeemReward(rewardId);
      emitToast({
        tone: 'success',
        title: t('common.success'),
        message: t('gamify.storeRedeemedSuccess', { name: rewardName }),
      });
      // Reload profile & leaderboard
      await loadData();
    } catch (err) {
      emitToast({
        tone: 'error',
        title: t('common.error'),
        message: getErrorMessage(err, 'Đổi phần thưởng thất bại.'),
      });
    } finally {
      setIsActionPending(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // Calculate XP in current level
  const currentXp = profile?.xp ?? 0;
  const level = profile?.level ?? 1;
  const xpInCurrentLevel = currentXp % 200;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / 200) * 100));

  // Check if already checked in today
  const lastCheckIn = profile?.last_check_in_at;
  let isCheckedInToday = false;
  if (lastCheckIn) {
    const todayStr = new Date().toDateString();
    const lastCheckInStr = new Date(lastCheckIn).toDateString();
    isCheckedInToday = todayStr === lastCheckInStr;
  }

  // 7-day progress calculation
  const todayStreak = profile?.daily_streak ?? 0;
  const currentDayOfCycle = todayStreak > 0 ? ((todayStreak - 1) % 7) + 1 : 1;

  const daysOfJourney = Array.from({ length: 7 }, (_, i) => {
    const dayNum = i + 1;
    const isCompleted = dayNum < currentDayOfCycle;
    const isToday = dayNum === currentDayOfCycle;
    const isFuture = dayNum > currentDayOfCycle;

    // Rewards info
    let points = 10;
    if (dayNum === 5) points = 25; // standard 10 + 15 streak bonus
    
    return {
      dayNum,
      isCompleted,
      isToday,
      isFuture,
      points,
    };
  });

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">
          {t('gamify.title')}
        </h2>
        <p className="text-sm text-on-surface-variant max-w-3xl">
          {t('gamify.subtitle')}
        </p>
      </div>

      {/* Overview, Streak & active tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Level Up Progress */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-2xl border border-surface-container-high bg-surface-bright scholar-shadow p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            {/* Background glowing gradients */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start z-10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  {t('gamify.level')} {level}
                </span>
                <h3 className="text-2xl font-bold mt-2 text-on-surface">
                  {profile?.daily_streak ? `${t('gamify.streak')}: ${profile.daily_streak} 🔥` : t('gamify.streak')}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-primary">{profile?.points} 🪙</p>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{t('gamify.points')}</p>
              </div>
            </div>

            {/* Progress bar to next level */}
            <div className="space-y-2 mt-6 z-10">
              <div className="flex justify-between text-xs font-semibold text-on-surface-variant">
                <span>{xpInCurrentLevel} / 200 XP</span>
                <span>{progressPercent}% đến Lvl {level + 1}</span>
              </div>
              <div className="h-3 w-full bg-surface-container-high rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Check-in Actions */}
            <div className="mt-6 flex flex-wrap gap-4 items-center justify-between z-10">
              <p className="text-xs text-on-surface-variant italic">
                {isCheckedInToday ? t('gamify.alreadyCheckedIn') : 'Hãy điểm danh ngay hôm nay để duy trì streak!'}
              </p>
              <button
                type="button"
                disabled={isActionPending}
                onClick={isCheckedInToday ? () => setShowSuccessModal(true) : handleCheckIn}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 ${
                  isCheckedInToday
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-primary text-white hover:bg-primary-hover hover:shadow-lg'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {isCheckedInToday ? 'check_circle' : 'calendar_today'}
                </span>
                {isCheckedInToday ? 'Đã điểm danh (Xem chi tiết)' : t('gamify.checkInButton')}
              </button>
            </div>
          </div>

          {/* Active Boosters */}
          <div className="rounded-2xl border border-surface-container-high bg-surface-bright scholar-shadow p-6">
            <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">local_activity</span>
              {t('gamify.activeBoosters')}
            </h3>

            {profile?.active_tickets && profile.active_tickets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.active_tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="border border-primary-container bg-primary/5 rounded-xl p-4 flex gap-3 items-start"
                  >
                    <span className="material-symbols-outlined text-2xl text-primary bg-primary/10 p-2 rounded-lg shrink-0">
                      {ticket.reward?.benefit_type === 'loan_limit' ? 'library_add' : 'hourglass_top'}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-on-surface">
                        {ticket.reward?.name}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {ticket.reward?.description}
                      </p>
                      <span className="inline-block text-[10px] font-bold text-primary mt-2 uppercase tracking-wide bg-primary/10 px-2 py-0.5 rounded-md">
                        {ticket.expires_at
                          ? t('gamify.ticketExpiresAt', {
                              date: new Date(ticket.expires_at).toLocaleDateString('vi-VN'),
                            })
                          : t('gamify.ticketActive')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-on-surface-variant text-center py-6 border border-dashed border-surface-container-high rounded-xl">
                {t('gamify.activeBoostersEmpty')}
              </p>
            )}
          </div>
        </div>

        {/* Scholar Leaderboard */}
        <div className="rounded-2xl border border-surface-container-high bg-surface-bright scholar-shadow p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 animate-bounce">emoji_events</span>
              {t('gamify.leaderboardTitle')}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">
              {t('gamify.leaderboardSubtitle')}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px] custom-scrollbar">
            {leaderboard.map((student) => {
              const isCurrentUser = student.member_id === profile?.history?.[0]?.member_id; // mock detection or match name
              return (
                <div
                  key={student.member_id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrentUser
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-surface-container-high bg-surface-container-low hover:border-outline'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full font-black text-sm">
                      {student.rank === 1 ? (
                        <span className="text-2xl">🥇</span>
                      ) : student.rank === 2 ? (
                        <span className="text-2xl">🥈</span>
                      ) : student.rank === 3 ? (
                        <span className="text-2xl">🥉</span>
                      ) : (
                        <span className="text-on-surface-variant">#{student.rank}</span>
                      )}
                    </div>
                    {/* Student Info */}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-on-surface truncate">
                        {student.name}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">
                        Lvl {student.level} • {student.badges_count} 🏅
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary">{student.xp} XP</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievements / Badges Grid */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-on-surface">
            {t('gamify.badgesTitle')}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {t('gamify.badgesSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge) => {
            const earnDate = badge.earned_at
              ? new Date(badge.earned_at).toLocaleDateString('vi-VN')
              : null;
            return (
              <motion.div
                key={badge.id}
                whileHover={{ y: -4 }}
                className={`rounded-2xl border p-4 text-center flex flex-col items-center justify-between scholar-shadow min-h-[190px] relative overflow-hidden transition-all ${
                  badge.is_earned
                    ? 'border-primary bg-primary/5 text-on-surface'
                    : 'border-surface-container-high bg-surface-container-low/60 text-on-surface-variant filter grayscale'
                }`}
              >
                {/* Glow for earned badges */}
                {badge.is_earned && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-tertiary to-primary" />
                )}

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-primary shadow-xs mb-3">
                  <span className="material-symbols-outlined text-3xl font-semibold">
                    {badge.icon}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-on-surface">
                    {badge.name}
                  </h4>
                  <p className="text-[10px] text-on-surface-variant mt-1.5 leading-snug line-clamp-3">
                    {badge.description}
                  </p>
                </div>

                <span className="text-[9px] font-black uppercase tracking-wider mt-3 px-2 py-0.5 rounded bg-surface-container-high">
                  {badge.is_earned ? t('gamify.badgesEarnedAt', { date: earnDate }) : t('gamify.badgesLocked')}
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Redemption Store */}
      <section className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-on-surface">
            {t('gamify.storeTitle')}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {t('gamify.storeSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rewards.map((reward) => {
            const hasEnoughPoints = (profile?.points ?? 0) >= reward.points_cost;
            return (
              <div
                key={reward.id}
                className="rounded-2xl border border-surface-container-high bg-surface-bright scholar-shadow p-5 flex flex-col justify-between relative overflow-hidden group min-h-[220px]"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="material-symbols-outlined text-3xl text-primary bg-primary/10 p-2.5 rounded-xl">
                      {reward.code === 'extra_loan_slot'
                        ? 'library_add'
                        : reward.code === 'extend_loan_days'
                        ? 'alarm_add'
                        : 'price_check'}
                    </span>
                    <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                      {reward.points_cost} 🪙
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-on-surface mt-4 group-hover:text-primary transition-colors">
                    {reward.name}
                  </h4>
                  <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                    {reward.description}
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    disabled={!hasEnoughPoints || isActionPending}
                    onClick={() => handleRedeem(reward.id, reward.name)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      hasEnoughPoints
                        ? 'bg-primary text-white hover:bg-primary-hover hover:shadow-md'
                        : 'bg-surface-container text-on-surface-variant cursor-not-allowed border border-surface-container-high'
                    }`}
                  >
                    {isActionPending
                      ? t('gamify.storeRedeeming')
                      : hasEnoughPoints
                      ? t('gamify.storeRedeem')
                      : 'Không đủ điểm 🪙'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* History logs */}
      <section className="rounded-2xl border border-surface-container-high bg-surface-bright scholar-shadow p-6">
        <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">history</span>
          {t('gamify.historyTitle')}
        </h3>

        {profile?.history && profile.history.length > 0 ? (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {profile.history.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b border-surface-container pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <h4 className="text-sm font-bold text-on-surface">{log.description}</h4>
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="text-right font-bold text-xs shrink-0">
                  {log.xp_gained > 0 && (
                    <span className="text-green-600 block">+{log.xp_gained} XP</span>
                  )}
                  {log.points_changed !== 0 && (
                    <span
                      className={log.points_changed > 0 ? 'text-primary block' : 'text-red-500 block'}
                    >
                      {log.points_changed > 0 ? '+' : ''}
                      {log.points_changed} 🪙
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant text-center py-6">
            {t('gamify.historyEmpty')}
          </p>
        )}
      </section>

      {/* Check-in Success Modal Popup */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent"
              onClick={() => setShowSuccessModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-t-3xl rounded-b-none md:rounded-2xl border border-surface-container-high bg-surface-bright shadow-2xl p-5 md:p-6 flex flex-col items-center text-center overflow-hidden z-10 animate-in slide-in-from-bottom duration-300 md:animate-none"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-tertiary to-primary" />
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="absolute top-3 right-3 text-on-surface-variant hover:bg-surface-container rounded-full p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 text-green-600 shadow-inner mb-5">
                <span className="material-symbols-outlined text-4xl font-semibold">emoji_events</span>
              </div>

              <h3 className="text-xl font-extrabold text-green-600 leading-tight">
                {isCheckedInToday ? 'Thông tin điểm danh' : 'Điểm danh thành công! 🎉'}
              </h3>
              <p className="text-sm text-on-surface-variant mt-2 px-1">
                {isCheckedInToday 
                  ? 'Hôm nay bạn đã hoàn thành điểm danh chuyên cần.' 
                  : 'Hệ thống đã ghi nhận lịch trình điểm danh chuyên cần của bạn ngày hôm nay.'}
              </p>

              <div className="mt-4 flex flex-col gap-1 items-center justify-center">
                <p className="text-sm font-bold text-green-600">+20 XP Kinh nghiệm</p>
                <p className="text-sm font-bold text-primary">
                  +{profile?.history?.find(log => log.event_type === 'check_in')?.points_changed || 10} Điểm thưởng 🪙
                </p>
              </div>

              {/* 7-day Progress Journey Map */}
              <div className="mt-4 w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3">
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-2 text-left">Hành trình 7 ngày</p>
                <div className="flex justify-between items-center gap-1">
                  {daysOfJourney.map((day) => {
                    const isDayDone = day.isCompleted || day.isToday;
                    return (
                      <div key={day.dayNum} className="flex flex-col items-center shrink-0 min-w-[36px]">
                        <span className="text-[9px] font-bold text-on-surface-variant mb-1">N{day.dayNum}</span>
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all relative ${
                            isDayDone
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {isDayDone ? (
                            <span className="material-symbols-outlined text-[10px] font-black">check</span>
                          ) : day.dayNum === 5 || day.dayNum === 7 ? (
                            <span className="material-symbols-outlined text-xs">redeem</span>
                          ) : (
                            <span>+{day.points}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {profile?.daily_streak !== undefined && (
                <p className="mt-4 text-xs font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full border border-surface-container-high">
                  Chuỗi hiện tại: <strong className="text-primary">{profile.daily_streak} ngày 🔥</strong>
                </p>
              )}

              <div className="w-full mt-6">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
