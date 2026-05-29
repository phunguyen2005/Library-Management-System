import React, { useEffect, useState } from 'react';
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

export default function RoomBookingPage() {
  const { user } = useAuth();
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
      emitToast({ tone: 'error', title: 'Lỗi', message: getErrorMessage(e, 'Không thể tải danh sách phòng.') });
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
      emitToast({ tone: 'error', title: 'Lỗi', message: getErrorMessage(e, 'Không thể tải lịch đặt phòng của bạn.') });
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
          emitToast({ tone: 'error', title: 'Lỗi', message: 'Không thể tải lịch bận của phòng.' });
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
            title: 'Đặt phòng được duyệt',
            message: `Lịch đặt phòng "${event.room_name}" lúc ${event.start_time.substring(0, 5)} đã được phê duyệt!`,
          });
        } else if (event.status === 'rejected') {
          emitToast({
            tone: 'warning',
            title: 'Đặt phòng bị từ chối',
            message: `Lịch đặt phòng "${event.room_name}" đã bị từ chối.`,
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
  }, [user, activeTab, selectedRoom, bookingDate, currentPage]);

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
        title: 'Thành công', 
        message: res.status === 'pending' 
          ? 'Đã gửi yêu cầu đặt phòng, vui lòng chờ duyệt!' 
          : (isWalkinBooking ? 'Đặt phòng Walk-in thành công và đã check-in!' : 'Đặt phòng học nhóm thành công!') 
      });

      setSelectedRoom(null);
      setPurpose('');
      setActiveTab('my-bookings');
    } catch (err: any) {
      emitToast({ tone: 'error', title: 'Đặt phòng thất bại', message: getErrorMessage(err, 'Đã xảy ra lỗi.') });
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Handle cancellation
  const handleCancelBooking = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn hủy lượt đặt phòng này?')) return;
    try {
      const res = await cancelRoomBooking(id);
      emitToast({ tone: 'success', title: 'Thành công', message: res.message });
      void loadMyBookings(currentPage);
      if (activeDetail && activeDetail.booking_id === id) {
        setActiveDetail(null);
      }
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Lỗi', message: getErrorMessage(e, 'Không thể hủy lượt đặt.') });
    }
  };
  // Handle checkout
  const handleCheckOut = async (id: number) => {
    try {
      const res = await checkOutRoomBooking(id);
      emitToast({ tone: 'success', title: 'Thành công', message: res.message });
      void loadMyBookings(currentPage);
      if (activeDetail && activeDetail.booking_id === id) {
        setActiveDetail(null);
      }
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Lỗi', message: getErrorMessage(e, 'Không thể check-out.') });
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'Chờ duyệt', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'approved': return { text: 'Đã duyệt', color: 'bg-green-100 text-green-800 border-green-200' };
      case 'rejected': return { text: 'Bị từ chối', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'cancelled': return { text: 'Đã hủy', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'completed': return { text: 'Hoàn thành', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'no_show': return { text: 'No-show (Vắng)', color: 'bg-rose-100 text-rose-800 border-rose-200' };
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
            Đặt phòng học nhóm
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Không gian học tập nhóm hiện đại, đầy đủ tiện nghi, hỗ trợ học tập và nghiên cứu tốt nhất.
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
            Danh sách phòng
          </button>
          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'my-bookings'
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lịch đặt của tôi
          </button>
        </div>
      </div>

      {activeTab === 'rooms' ? (
        /* TAB 1: ROOMS GRID */
        <div className="space-y-6">
          {loadingRooms ? (
            <div className="text-center py-12 text-sm text-slate-500">Đang tải danh sách phòng...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
              Hiện tại không có phòng nào khả dụng.
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
                        Sức chứa: {room.capacity} người
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {room.location}
                    </p>

                    <p className="text-sm text-slate-600 line-clamp-3">
                      {room.description || 'Không có mô tả thêm.'}
                    </p>

                    {/* Amenities list */}
                    {room.amenities && room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {room.amenities.map((am) => (
                          <span 
                            key={am} 
                            className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/50 uppercase"
                          >
                            {am === 'projector' ? 'Máy chiếu' : 
                             am === 'whiteboard' ? 'Bảng viết' : 
                             am === 'power_outlets' ? 'Ổ cắm điện' : 
                             am === 'tv' ? 'Màn hình TV' : 
                             am === 'microphone' ? 'Micro' : am}
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
                      Đặt trước
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
            <div className="text-center py-12 text-sm text-slate-500">Đang tải lịch sử đặt phòng...</div>
          ) : myBookings.length === 0 ? (
            <div className="text-center py-16 border border-slate-100 rounded-2xl bg-white shadow-xs">
              <span className="material-symbols-outlined text-[48px] text-slate-300">event_busy</span>
              <p className="mt-2 text-sm text-slate-500 font-medium">Bạn chưa có lịch đặt phòng nào.</p>
              <button 
                onClick={() => setActiveTab('rooms')} 
                className="mt-4 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Đặt phòng ngay
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
                        <span className="font-bold text-slate-800 text-base">{b.room?.name || 'Phòng học'}</span>
                        <span className={`border text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      
                      <div className="text-xs text-slate-500 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                          <span>Ngày {new Date(b.date).toLocaleDateString('vi-VN')} ({timeLabel})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">group</span>
                          <span>Số người dự kiến: {b.group_size} người</span>
                        </div>
                        {b.purpose && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">info</span>
                            <span>Mục đích: {b.purpose}</span>
                          </div>
                        )}
                        {b.status === 'rejected' && b.rejection_reason && (
                          <div className="text-red-600 font-medium">Lý do từ chối: {b.rejection_reason}</div>
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
                          Mã check-in
                        </button>
                      )}
                      
                      {isApproved && b.check_in_at && !b.check_out_at && (
                        <button
                          onClick={() => handleCheckOut(b.booking_id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">logout</span>
                          Check-out
                        </button>
                      )}

                      {(isPending || isApproved) && (
                        <button
                          onClick={() => handleCancelBooking(b.booking_id)}
                          className="border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          Hủy lịch
                        </button>
                      )}
                      
                      <button
                        onClick={() => setActiveDetail(b)}
                        className="border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Chi tiết
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
                    Trước
                  </button>
                  <span className="text-xs text-slate-500 font-medium">Trang {currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => void loadMyBookings(currentPage + 1)}
                    className="border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    Sau
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
                  {isWalkinBooking ? 'Đặt phòng nhanh (Walk-in)' : 'Đăng ký đặt phòng'}
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
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày sử dụng</span>
                    <input
                      type="date"
                      readOnly
                      value={bookingDate}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed"
                    />
                  </label>

                  {/* Start time (ReadOnly now) */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Giờ bắt đầu</span>
                    <input
                      type="text"
                      readOnly
                      value={startTime}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none text-slate-500 cursor-not-allowed"
                    />
                  </label>

                  {/* Duration Selection */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Thời gian sử dụng</span>
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
                      <option value={30}>30 phút</option>
                      <option value={60}>1 tiếng</option>
                      <option value={90}>1.5 tiếng</option>
                      <option value={120}>2 tiếng</option>
                      <option value={150}>2.5 tiếng</option>
                      <option value={180}>3 tiếng</option>
                    </select>
                  </label>

                  {/* Group size */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Số lượng thành viên</span>
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
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày đặt phòng</span>
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
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Số lượng thành viên</span>
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
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tình trạng bận của phòng (Timeline)</span>
                {loadingSchedule ? (
                  <div className="text-xs text-slate-400 py-3">Đang tải lịch biểu...</div>
                ) : (
                  <div>
                    {/* Visual timetable */}
                    <div className="flex overflow-x-auto gap-1 py-3 px-1 border border-slate-100 rounded-xl bg-slate-50 custom-scrollbar">
                      {generateSlots().map((time) => {
                        const isBooked = isSlotBooked(time);
                        return (
                          <div 
                            key={time} 
                            title={isBooked ? `Đã bận lúc ${time}` : `Còn trống lúc ${time}`}
                            className={`flex-1 min-w-[50px] text-center text-[10px] font-bold py-2 rounded-lg border transition-all ${
                              isBooked 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-green-50 text-green-700 border-green-200'
                            }`}
                          >
                            <div>{time}</div>
                            <div className="mt-0.5 text-[8px] uppercase">{isBooked ? 'Bận' : 'Trống'}</div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      ⚠️ Lưu ý: Đảm bảo thời gian bạn chọn không trùng với các ô màu Đỏ (Bận) ở trên.
                    </p>
                  </div>
                )}
              </div>

              {!isWalkinBooking && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Start Time Selection */}
                  <label className="space-y-2 block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Giờ bắt đầu</span>
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
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Giờ kết thúc</span>
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
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mục đích sử dụng</span>
                <textarea
                  placeholder="Nhóm tự học, thảo luận đồ án môn học..."
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking || loadingSchedule}
                  className="bg-primary text-white text-sm font-bold px-8 py-2.5 rounded-xl shadow-md transition-all hover:bg-opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {submittingBooking ? 'Đang gửi đăng ký...' : 'Xác nhận đặt phòng'}
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
                <h3 className="text-xl font-bold text-slate-800">Chi tiết đặt phòng</h3>
                <p className="text-xs text-slate-500 mt-1">Mã lịch đặt: #{activeDetail.booking_id}</p>
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
                  <span className="text-slate-500 font-medium">Phòng:</span>
                  <span className="font-semibold text-slate-800">{activeDetail.room?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Vị trí:</span>
                  <span className="font-semibold text-slate-800">{activeDetail.room?.location}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Ngày đặt:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(activeDetail.date).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Khung giờ:</span>
                  <span className="font-semibold text-slate-800">
                    {activeDetail.start_time.substring(0, 5)} - {activeDetail.end_time.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Trạng thái:</span>
                  <span className="font-semibold text-slate-800 uppercase text-xs">
                    {getStatusLabel(activeDetail.status).text}
                  </span>
                </div>
              </div>

              {/* Show check-in credentials if approved */}
              {activeDetail.status === 'approved' && (
                <div className="flex flex-col items-center justify-center space-y-4 py-4 border border-dashed border-primary/30 rounded-2xl bg-blue-50/30">
                  <div className="text-center">
                    <span className="block text-xs font-bold uppercase tracking-wider text-primary">Mã Check-in</span>
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
                    Đưa mã này cho thủ thư tại quầy để bắt đầu sử dụng phòng học nhóm.
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
                  Check-out phòng
                </button>
              )}
              {activeDetail.status === 'approved' && !activeDetail.check_in_at && (
                <button
                  onClick={() => void handleCancelBooking(activeDetail.booking_id)}
                  className="w-full border border-red-200 text-red-600 font-bold text-sm py-2.5 rounded-xl hover:bg-red-50 transition-all cursor-pointer"
                >
                  Hủy lịch đặt
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
