import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import AiChatbot from '../components/AiChatbot';
import LibraryMapModal from '../components/LibraryMapModal';
import { useAuth } from '../auth/AuthContext';
import { submitDailyCheckIn } from '../api/gamifyApi';
import { emitToast } from '../notifications/events';
import { getErrorMessage } from '../lib/errors';

const bottomNavItems = [
  { path: '/home', icon: 'home', labelKey: 'nav.home' },
  { path: '/catalog', icon: 'search', labelKey: 'nav.catalog' },
  { path: '/digital', icon: 'menu_book', labelKey: 'nav.digital' },
  { path: '/my-books', icon: 'library_books', labelKey: 'nav.myBooks' },
  { path: '/gamify', icon: 'emoji_events', labelKey: 'nav.gamify' },
];

export default function UserLayout() {
  const { t } = useTranslation();
  const { user, role, updateUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  // Daily check-in modal state
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [pointsGained, setPointsGained] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOutlookStudent = !!(user?.email && (
    user.email.toLowerCase().endsWith('@student.hcmue.edu.vn') || 
    user.email.toLowerCase().endsWith('@hcmue.edu.vn')
  ));

  useEffect(() => {
    if (role !== 'student' || !user) {
      return;
    }

    const todayStr = new Date().toDateString();
    
    // Check if they already dismissed or completed check-in during this browser session
    const sessionDismissed = sessionStorage.getItem('dismissed_checkin_today');
    if (sessionDismissed === todayStr) {
      return;
    }

    // Check if the user has already checked in today in database
    const lastCheckIn = user.last_check_in_at;
    let checkedInToday = false;
    if (lastCheckIn) {
      const lastCheckInStr = new Date(lastCheckIn).toDateString();
      checkedInToday = todayStr === lastCheckInStr;
    }

    if (!checkedInToday) {
      // Delay slightly for a smoother entry transition
      const timer = setTimeout(() => {
        setShowCheckIn(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [role, user]);

  const handleCheckIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await submitDailyCheckIn();
      setPointsGained(res.points_gained);
      setIsCheckedIn(true);
      
      // Update global user details
      if (user) {
        updateUser({
          ...user,
          xp: res.xp,
          points: res.points,
          level: res.level,
          daily_streak: res.daily_streak,
          last_check_in_at: res.last_check_in_at,
        });
      }

      sessionStorage.setItem('dismissed_checkin_today', new Date().toDateString());
    } catch (err) {
      emitToast({
        tone: 'error',
        title: 'Điểm danh thất bại',
        message: getErrorMessage(err, 'Không thể thực hiện điểm danh.'),
      });
      // Also close modal to not annoy the user
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowCheckIn(false);
    sessionStorage.setItem('dismissed_checkin_today', new Date().toDateString());
  };

  // 7-day progress calculation
  const todayStreak = user?.daily_streak ?? 0;
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
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onOpenMap={() => setIsMapOpen(true)} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          onOpenMap={() => setIsMapOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-16 border-t border-surface-container-high bg-surface-bright shadow-lg md:hidden">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[22px] ${isActive ? 'filled' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px]">{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <AiChatbot />
      </div>

      {isMapOpen && (
        <LibraryMapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      {/* Daily Check-in Modal */}
      <AnimatePresence>
        {showCheckIn && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            {/* Modal Backdrop overlay click wrapper */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent"
              onClick={handleClose}
            />

            {/* Modal content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm rounded-2xl border border-surface-container-high bg-surface-bright shadow-2xl p-6 flex flex-col items-center text-center overflow-hidden z-10"
            >
              {/* Glowing header strip */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary via-tertiary to-primary" />

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-3 right-3 text-on-surface-variant hover:bg-surface-container rounded-full p-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>

              {/* Animated icon container */}
              <motion.div 
                animate={isCheckedIn ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-inner mb-5 ${
                  isCheckedIn ? 'bg-green-500/10 text-green-600' : 'bg-primary/10 text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-4xl font-semibold">
                  {isCheckedIn ? 'emoji_events' : 'calendar_today'}
                </span>
              </motion.div>

              {/* Text content */}
              {!isCheckedIn ? (
                <>
                  <h3 className="text-xl font-extrabold text-on-surface leading-tight">
                    Chào mừng bạn quay lại! 👋
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-2 px-1">
                    Hôm nay bạn chưa điểm danh. Hãy điểm danh ngay để nhận điểm thưởng học thuật và tích chuỗi nhé!
                  </p>
                  
                  {/* Streak widget */}
                  {user?.daily_streak !== undefined && (
                    <div className="mt-4 bg-surface-container-low px-4 py-2 rounded-xl border border-surface-container-high text-sm font-semibold text-on-surface flex items-center gap-1.5 justify-center">
                      <span>Chuỗi hiện tại:</span>
                      <span className="text-primary font-black">{user.daily_streak} ngày 🔥</span>
                    </div>
                  )}

                  {/* 7-day Progress Journey Map */}
                  <div className="mt-4 w-full bg-surface-container-low border border-surface-container-high rounded-xl p-3">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-2 text-left">Hành trình 7 ngày</p>
                    <div className="flex justify-between items-center gap-1">
                      {daysOfJourney.map((day) => (
                        <div key={day.dayNum} className="flex flex-col items-center shrink-0 min-w-[36px]">
                          <span className="text-[9px] font-bold text-on-surface-variant mb-1">N{day.dayNum}</span>
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all relative ${
                              day.isToday
                                ? 'bg-primary text-white ring-2 ring-primary/20 scale-105 animate-pulse'
                                : day.isCompleted
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {day.isCompleted ? (
                              <span className="material-symbols-outlined text-[10px] font-black">check</span>
                            ) : day.dayNum === 5 || day.dayNum === 7 ? (
                              <span className="material-symbols-outlined text-xs">redeem</span>
                            ) : (
                              <span>+{day.points}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full mt-6 flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleCheckIn}
                      className="w-full py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
                    >
                      {isSubmitting ? 'Đang điểm danh...' : 'Điểm danh (+20 XP)'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors py-1 hover:underline cursor-pointer"
                    >
                      Để sau
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-extrabold text-green-600 leading-tight">
                    Điểm danh thành công! 🎉
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-2 px-1">
                    Cảm ơn bạn! Hệ thống đã ghi nhận điểm danh học thuật hôm nay của bạn.
                  </p>

                  {/* Reward details */}
                  <div className="mt-4 flex flex-col gap-1 items-center justify-center">
                    <p className="text-sm font-bold text-green-600">+20 XP Kinh nghiệm</p>
                    <p className="text-sm font-bold text-primary">+{pointsGained} Điểm thưởng 🪙</p>
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

                  {user?.daily_streak !== undefined && (
                    <p className="mt-4 text-xs font-semibold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full border border-surface-container-high">
                      Chuỗi hiện tại: <strong className="text-primary">{user.daily_streak} ngày 🔥</strong>
                    </p>
                  )}

                  {/* Action */}
                  <div className="w-full mt-6">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5"
                    >
                      Tuyệt vời!
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
