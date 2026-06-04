import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthContext';
import { echoClient } from '../../lib/echo';
import { 
  fetchRooms, 
  fetchRoomSchedule, 
  createRoomBooking, 
  fetchMyRoomBookings, 
  cancelRoomBooking, 
  checkOutRoomBooking 
} from '../../api/roomBookingApi';
import { Room, RoomBooking as BookingRecord, RoomScheduleSlot } from '../../types/roomBooking';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';
import { QRCodeSVG } from 'qrcode.react';
import { getIntlLocale } from '../../i18n';

export default function RoomBookingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const getDurationLabel = (val: number) => {
    const isEn = i18n.language?.startsWith('en');
    const isZh = i18n.language?.startsWith('zh');
    const isJa = i18n.language?.startsWith('ja');
    const isKo = i18n.language?.startsWith('ko');
    
    if (val === 30) {
      if (isZh) return '30 分钟';
      if (isJa) return '30 分';
      if (isKo) return '30 분';
      if (isEn) return '30 minutes';
      return '30 phút';
    }
    
    const num = val / 60;
    if (num === 1) {
      if (isZh) return '1 小时';
      if (isJa) return '1 時間';
      if (isKo) return '1 시간';
      if (isEn) return '1 hour';
      return '1 tiếng';
    }
    
    if (isZh) return `${num} 小时`;
    if (isJa) return `${num} 時間`;
    if (isKo) return `${num} 시간`;
    if (isEn) return `${num} hours`;
    return `${num} tiếng`;
  };
  const [activeTab, setActiveTab] = useState<'rooms' | 'my-bookings'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myBookings, setMyBookings] = useState<BookingRecord[]>([]);
  
  // Loading & Error states
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Pagination for my bookings
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Booking Modal States
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(nowDateString());
  const [schedule, setSchedule] = useState<RoomScheduleSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [groupSize, setGroupSize] = useState(4);
  const [purpose, setPurpose] = useState('');
  const [isWalkinBooking, setIsWalkinBooking] = useState(false);
  const [walkinDuration, setWalkinDuration] = useState(60);

  // Detail Modal
  const [activeDetail, setActiveDetail] = useState<BookingRecord | null>(null);

  function nowDateString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Load Rooms
  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetchRooms({ is_active: true, status: 'active' });
      setRooms(res);
    } catch (e: any) {
      emitToast({ tone: 'error', title: t('common.error'), message: getErrorMessage(e, t('studentRoomBooking.toastErrorRooms')) });
    } finally {
      setLoadingRooms(false);
    }
  };

  // Load Bookings
  const loadMyBookings = async (page = 1) => {
    try {
      setLoadingMyBookings(true);
      const res = await fetchMyRoomBookings({ page, per_page: 5 });
      setMyBookings(res.data || []);
      setTotalPages(res.meta ? res.meta.last_page : ((res as any).last_page ?? 1));
      setCurrentPage(res.meta ? res.meta.current_page : ((res as any).current_page ?? 1));
    } catch (e: any) {
      emitToast({ tone: 'error', title: t('common.error'), message: getErrorMessage(e, t('studentRoomBooking.toastErrorBookings')) });
    } finally {
      setLoadingMyBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rooms') {
      void loadRooms();
    } else {
      void loadMyBookings(1);
    }
  }, [activeTab]);

  // Load schedule for room booking
  useEffect(() => {
    if (selectedRoom && bookingDate) {
      const loadSchedule = async () => {
        try {
          setLoadingSchedule(true);
          const res = await fetchRoomSchedule(selectedRoom.room_id, bookingDate);
          setSchedule(res);
        } catch (e: any) {
          emitToast({ tone: 'error', title: t('common.error'), message: t('studentRoomBooking.toastErrorTimeline') });
        } finally {
          setLoadingSchedule(false);
        }
      };
      void loadSchedule();
    }
  }, [selectedRoom, bookingDate]);

  // Real-time WebSocket listener for room bookings and timeline locks
  useEffect(() => {
    const channel = echoClient.channel('room-bookings');

    channel.listen('.room.booking.updated', (event: any) => {
      // 1. If this is a personal booking update, reload list and notify
      if (user && event.member_id === user.member_id) {
        void loadMyBookings(currentPage);
        
        // Dynamic toast chimes based on status shifts
        if (event.status === 'approved') {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(() => {});
          emitToast({
            tone: 'success',
            title: t('studentRoomBooking.toastNotificationApproved'),
            message: t('studentRoomBooking.toastNotificationApprovedMsg', { room_name: event.room_name, start_time: event.start_time.substring(0, 5) }),
          });
        } else if (event.status === 'rejected') {
          emitToast({
            tone: 'warning',
            title: t('studentRoomBooking.toastNotificationRejected'),
            message: t('studentRoomBooking.toastNotificationRejectedMsg', { room_name: event.room_name }),
          });
        }
      }

      // 2. If student has the booking modal open for the updated room and date, refresh the timeline slots immediately
      if (selectedRoom && selectedRoom.room_id === event.room_id && bookingDate === event.date) {
        const reloadSchedule = async () => {
          try {
            setLoadingSchedule(true);
            const res = await fetchRoomSchedule(selectedRoom.room_id, bookingDate);
            setSchedule(res);
          } catch (e) {
            // Ignore
          } finally {
            setLoadingSchedule(false);
          }
        };
        void reloadSchedule();
      }
    });

    return () => {
      echoClient.leave('room-bookings');
    };
  }, [user, activeTab, selectedRoom, bookingDate, currentPage, t]);

  // Handle booking submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    try {
      setSubmittingBooking(true);
      const res = await createRoomBooking({
        room_id: selectedRoom.room_id,
        date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        group_size: groupSize,
        purpose: purpose.trim() || undefined,
        is_walkin: isWalkinBooking,
      });

      emitToast({ 
        tone: 'success', 
        title: t('common.success'), 
        message: res.status === 'pending' 
          ? t('studentRoomBooking.bookingPending') 
          : (isWalkinBooking ? t('studentRoomBooking.walkinSuccess') : t('studentRoomBooking.bookingSuccess')) 
      });

      setSelectedRoom(null);
      setPurpose('');
      setActiveTab('my-bookings');
    } catch (err: any) {
      emitToast({ tone: 'error', title: t('studentRoomBooking.toastErrorCancel'), message: getErrorMessage(err, t('common.error')) });
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Handle cancellation
  const handleCancelBooking = async (id: number) => {
    if (!confirm(t('studentRoomBooking.cancelConfirm'))) return;
    try {
      const res = await cancelRoomBooking(id);
      emitToast({ tone: 'success', title: t('common.success'), message: res.message });
      void loadMyBookings(currentPage);
      if (activeDetail && activeDetail.booking_id === id) {
        setActiveDetail(null);
      }
    } catch (e: any) {
      emitToast({ tone: 'error', title: t('common.error'), message: getErrorMessage(e, t('studentRoomBooking.toastErrorCancel')) });
    }
  };
  // Handle checkout
  const handleCheckOut = async (id: number) => {
    try {
      const res = await checkOutRoomBooking(id);
      emitToast({ tone: 'success', title: t('common.success'), message: res.message });
      void loadMyBookings(currentPage);
      if (activeDetail && activeDetail.booking_id === id) {
        setActiveDetail(null);
      }
    } catch (e: any) {
      emitToast({ tone: 'error', title: t('common.error'), message: getErrorMessage(e, t('studentRoomBooking.toastErrorCheckout')) });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { text: t('studentRoomBooking.statusPending'), color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'approved': return { text: t('studentRoomBooking.statusApproved'), color: 'bg-green-100 text-green-800 border-green-200' };
      case 'rejected': return { text: t('studentRoomBooking.statusRejected'), color: 'bg-red-100 text-red-800 border-red-200' };
      case 'cancelled': return { text: t('studentRoomBooking.statusCancelled'), color: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'completed': return { text: t('studentRoomBooking.statusCompleted'), color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'no_show': return { text: t('studentRoomBooking.statusNoShow'), color: 'bg-rose-100 text-rose-800 border-rose-200' };
      default: return { text: status, color: 'bg-slate-100 text-slate-800' };
    }
  };

  // Helper to generate visual blocks for 30min slots from 07:00 to 21:00
  const generateSlots = () => {
    const slots = [];
    const startHour = 7;
    const endHour = 21;

    for (let h = startHour; h < endHour; h++) {
      const hStr = h.toString().padStart(2, '0');
      slots.push(`${hStr}:00`);
      slots.push(`${hStr}:30`);
    }
    return slots;
  };

  const isSlotBooked = (timeStr: string) => {
    return schedule.some(s => {
      const checkTime = timeStr + ':00';
      return s.start_time <= checkTime && s.end_time > checkTime;
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 md:space-y-8 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-primary">meeting_room</span>
            {t('studentRoomBooking.title')}
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            {t('studentRoomBooking.subtitle')}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('studentRoomBooking.tabRooms')}
          </button>
          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'my-bookings'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('studentRoomBooking.tabMyBookings')}
          </button>
        </div>
      </div>

      {activeTab === 'rooms' ? (
        /* TAB 1: ROOMS GRID */
        <div className="space-y-6">
          {loadingRooms ? (
            <div className="text-center py-12 text-sm text-slate-500">{t('studentRoomBooking.loadingRooms')}</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
              {t('studentRoomBooking.emptyRooms')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div 
                  key={room.room_id} 
                  className="rounded-2xl border border-surface-container-low bg-surface-bright p-6 scholar-shadow flex flex-col justify-between hover:shadow-lg transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-bold text-slate-800">{room.name}</h4>
                      <span className="bg-primary-container text-primary text-xs font-semibold px-2.5 py-1 rounded-lg">
                        {t('studentRoomBooking.capacity', { count: room.capacity })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {room.location}
                    </p>

                    <p className="text-sm text-slate-600 line-clamp-3">
                      {room.description || t('common.noData')}
                    </p>

                    {/* Amenities list */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {room.amenities.map((am) => (
                          <span 
                            key={am} 
                            className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/50 uppercase"
                          >
                            {am === 'projector' ? t('studentRoomBooking.amenityProjector') : 
                             am === 'whiteboard' ? t('studentRoomBooking.amenityWhiteboard') : 
                             am === 'power_outlets' ? t('studentRoomBooking.amenityPower') : 
                             am === 'tv' ? t('studentRoomBooking.amenityTv') : 
                             am === 'microphone' ? t('studentRoomBooking.amenityMicrophone') : am}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setBookingDate(nowDateString());
                        setIsWalkinBooking(false);
                        setStartTime('09:00');
                        setEndTime('11:00');
                        setGroupSize(2);
                      }}
                      className="w-full bg-primary text-white hover:bg-opacity-95 font-semibold py-2.5 rounded-xl transition-all text-xs cursor-pointer flex items-center justify-center gap-1 border border-transparent shadow-xs hover:shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">event_available</span>
                      {t('studentRoomBooking.btnPreBook')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* TAB 2: MY BOOKINGS */
        <div className="space-y-6">
          {loadingMyBookings ? (
            <div className="text-center py-12 text-sm text-slate-500">{t('studentRoomBooking.loadingMyBookings')}</div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-2xl bg-white shadow-xs">
              <span className="material-symbols-outlined text-[48px] text-slate-300">event_busy</span>
              <p className="mt-2 text-sm text-slate-500 font-medium">{t('studentRoomBooking.emptyMyBookings')}</p>
              <button 
                onClick={() => setActiveTab('rooms')} 
                className="mt-4 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {t('studentRoomBooking.btnBookNow')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((b) => {
                const badge = getStatusLabel(b.status);
                const timeLabel = `${b.start_time.substring(0, 5)} - ${b.end_time.substring(0, 5)}`;
                const isApproved = b.status === 'approved';
                const isPending = b.status === 'pending';

                return (
                  <div 
                    key={b.booking_id} 
                    className="rounded-2xl border border-surface-container bg-surface-bright p-5 scholar-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/20 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800 text-base">{b.room?.name || 'Room'}</span>
                        <span className={`border text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          <span>{t('studentRoomBooking.dateLabel')} {new Date(b.date).toLocaleDateString(getIntlLocale())} ({timeLabel})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">group</span>
                          <span>{t('studentRoomBooking.peopleCount', { count: b.group_size })}</span>
                        </div>
                        {b.purpose && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">info</span>
                            <span>{t('studentRoomBooking.purposeLabel')}: {b.purpose}</span>
                          </div>
                        )}
                        {b.status === 'rejected' && b.rejection_reason && (
                          <div className="text-red-600 font-medium">{t('studentRoomBooking.rejectionReason', { reason: b.rejection_reason })}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                      {isApproved && !b.check_in_at && (
                        <button
                          onClick={() => setActiveDetail(b)}
                          className="bg-primary-container text-primary font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-200 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">qr_code</span>
                          {t('studentRoomBooking.btnQrCheckin')}
                        </button>
                      )}
                      
                      {isApproved && b.check_in_at && !b.check_out_at && (
                        <button
                          onClick={() => handleCheckOut(b.booking_id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">logout</span>
                          {t('studentRoomBooking.btnCheckout')}
                        </button>
                      )}

                      {(isPending || isApproved) && (
                        <button
                          onClick={() => handleCancelBooking(b.booking_id)}
                          className="border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          {t('studentRoomBooking.btnCancel')}
                        </button>
                      )}
                      
                      <button
                        onClick={() => setActiveDetail(b)}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        {t('studentRoomBooking.btnDetails')}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 pt-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => void loadMyBookings(currentPage - 1)}
                    className="border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    {t('studentRoomBooking.paginatePrev')}
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    {t('studentRoomBooking.paginatePage', { current: currentPage, total: totalPages })}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => void loadMyBookings(currentPage + 1)}
                    className="border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    {t('studentRoomBooking.paginateNext')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: BOOKING MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl rounded-b-none md:rounded-3xl scholar-shadow p-5 md:p-8 space-y-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 md:animate-none">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {isWalkinBooking ? t('studentRoomBooking.modalTitleWalkin') : t('studentRoomBooking.modalTitleBook')}
                </h3>
                <p className="text-sm text-slate-500 mt-1">{selectedRoom.name} — {selectedRoom.location}</p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-6">
              {isWalkinBooking ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Date Selection (ReadOnly today) */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formDateUse')}</span>
                    <input
                      type="date"
                      readOnly
                      value={bookingDate}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed"
                    />
                  </label>

                  {/* Start time (ReadOnly now) */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formStartTime')}</span>
                    <input
                      type="text"
                      readOnly
                      value={startTime}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed"
                    />
                  </label>

                  {/* Duration Selection */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formDuration')}</span>
                    <select
                      value={walkinDuration}
                      onChange={(e) => {
                        const durationMin = Number(e.target.value);
                        setWalkinDuration(durationMin);
                        const [h, m] = startTime.split(':').map(Number);
                        const start = new Date();
                        start.setHours(h, m, 0, 0);
                        const end = new Date(start.getTime() + durationMin * 60 * 1000);
                        setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                    >
                      <option value={30}>{getDurationLabel(30)}</option>
                      <option value={60}>{getDurationLabel(60)}</option>
                      <option value={90}>{getDurationLabel(90)}</option>
                      <option value={120}>{getDurationLabel(120)}</option>
                      <option value={150}>{getDurationLabel(150)}</option>
                      <option value={180}>{getDurationLabel(180)}</option>
                    </select>
                  </label>

                  {/* Group size */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formGroupSize')}</span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedRoom.capacity}
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Date Selection */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formDate')}</span>
                    <input
                      type="date"
                      required
                      min={nowDateString()}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  {/* Group size */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formGroupSize')}</span>
                    <input
                      type="number"
                      required
                      min={1}
                      max={selectedRoom.capacity}
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}

              {/* Time selection schedule visualizer */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.timelineTitle')}</span>
                {loadingSchedule ? (
                  <div className="text-xs text-slate-400 py-3">{t('common.loading')}</div>
                ) : (
                  <div>
                    {/* Visual timetable */}
                    <div className="flex overflow-x-auto gap-1 py-3 px-1 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar">
                      {generateSlots().map((time) => {
                        const isBooked = isSlotBooked(time);
                        return (
                          <div 
                            key={time} 
                            title={isBooked ? `${t('studentRoomBooking.timelineBusy')} ${time}` : `${t('studentRoomBooking.timelineFree')} ${time}`}
                            className={`flex-1 min-w-[50px] text-center text-[10px] font-bold py-2 rounded-lg border transition-all ${
                              isBooked 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}
                          >
                            <div>{time}</div>
                            <div className="mt-0.5 text-[8px] uppercase">{isBooked ? t('studentRoomBooking.timelineBusy') : t('studentRoomBooking.timelineFree')}</div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {t('studentRoomBooking.timelineWarning')}
                    </p>
                  </div>
                )}
              </div>

              {!isWalkinBooking && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Start Time Selection */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formStartTime')}</span>
                    <input
                      type="time"
                      required
                      step={1800} // Snaps to 30 mins
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  {/* End Time Selection */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formEndTime')}</span>
                    <input
                      type="time"
                      required
                      step={1800}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                </div>
              )}

              {/* Purpose */}
              <label className="space-y-2 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{t('studentRoomBooking.formPurpose')}</span>
                <textarea
                  placeholder={t('studentRoomBooking.formPurposePlaceholder')}
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRoom(null)}
                  className="border border-slate-200 text-slate-600 text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  {t('studentRoomBooking.btnCancelForm')}
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking || loadingSchedule}
                  className="bg-primary text-white text-sm font-bold px-8 py-2.5 rounded-xl shadow-md transition-all hover:bg-opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {submittingBooking ? t('studentRoomBooking.submitting') : t('studentRoomBooking.btnSubmitForm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL & CHECK-IN QR MODAL */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-3xl rounded-b-none md:rounded-3xl scholar-shadow p-5 md:p-8 space-y-6 max-h-[85vh] md:max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 md:animate-none">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{t('studentRoomBooking.modalDetailTitle')}</h3>
                <p className="text-xs text-slate-500 mt-1">{t('studentRoomBooking.modalDetailCode', { id: activeDetail.booking_id })}</p>
              </div>
              <button
                onClick={() => setActiveDetail(null)}
                className="text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t('studentRoomBooking.tabRooms')}:</span>
                  <span className="font-semibold text-slate-800">{activeDetail.room?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t('studentRoomBooking.location', { location: '' }).replace(':', '').trim()}:</span>
                  <span className="font-semibold text-slate-800">{activeDetail.room?.location}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t('studentRoomBooking.dateLabel')}:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(activeDetail.date).toLocaleDateString(getIntlLocale())}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t('studentRoomBooking.formStartTime')} - {t('studentRoomBooking.formEndTime')}:</span>
                  <span className="font-semibold text-slate-800">
                    {activeDetail.start_time.substring(0, 5)} - {activeDetail.end_time.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{t('studentRoomBooking.statusLabel')}:</span>
                  <span className="font-semibold text-slate-800 uppercase text-xs">
                    {getStatusLabel(activeDetail.status).text}
                  </span>
                </div>
              </div>

              {/* Show check-in credentials if approved */}
              {activeDetail.status === 'approved' && (
                <div className="flex flex-col items-center justify-center space-y-4 py-4 border border-dashed border-primary/30 rounded-2xl bg-blue-50/30">
                  <div className="text-center">
                    <span className="block text-xs font-bold uppercase tracking-wider text-primary">{t('studentRoomBooking.bookingCode')}</span>
                    <span className="block text-3xl font-black text-slate-800 mt-1 tracking-widest">{activeDetail.booking_code}</span>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <QRCodeSVG 
                      value={activeDetail.booking_code} 
                      size={140}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  
                  <p className="text-[10px] text-center text-slate-400 max-w-[240px]">
                    {t('studentRoomBooking.modalDetailQrDesc')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {activeDetail.status === 'approved' && activeDetail.check_in_at && !activeDetail.check_out_at && (
                <button
                  onClick={() => void handleCheckOut(activeDetail.booking_id)}
                  className="w-full bg-amber-500 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-amber-600 transition-all cursor-pointer"
                >
                  {t('studentRoomBooking.btnCheckout')}
                </button>
              )}
              {activeDetail.status === 'approved' && !activeDetail.check_in_at && (
                <button
                  onClick={() => void handleCancelBooking(activeDetail.booking_id)}
                  className="w-full border border-red-200 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                >
                  {t('studentRoomBooking.btnCancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
