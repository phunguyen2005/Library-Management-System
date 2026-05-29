import React, { useEffect, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { echoClient } from '../../lib/echo';
import { 
  fetchRooms, 
  createRoom, 
  updateRoom, 
  deleteRoom,
  fetchAllRoomBookings, 
  approveRoomBooking, 
  rejectRoomBooking, 
  adminCheckInRoomBooking, 
  adminCheckOutRoomBooking,
  checkInRoomBooking,
  fetchRoomBookingStats,
  createRoomBooking
} from '../../api/roomBookingApi';
import { getAllMembers } from '../../api/userApi';
import { MemberApiRecord } from '../../types/member';
import { Room, RoomBooking, RoomBookingStats, RoomStatus } from '../../types/roomBooking';
import { getErrorMessage } from '../../lib/errors';
import { emitToast } from '../../notifications/events';

export default function AdminRoomBookings() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'requests' | 'stats'>('rooms');

  // Rooms CRUD States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    name: '',
    capacity: 6,
    location: '',
    description: '',
    status: 'active' as RoomStatus,
    amenities: [] as string[]
  });

  // Bookings List States
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<RoomBooking | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Statistics
  const [stats, setStats] = useState<RoomBookingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsStartDate, setStatsStartDate] = useState('');
  const [statsEndDate, setStatsEndDate] = useState('');

  // Quick Check-in code state
  const [checkInCode, setCheckInCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Admin Walk-in Booking States
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinStudentSearch, setWalkinStudentSearch] = useState('');
  const [walkinMembersList, setWalkinMembersList] = useState<MemberApiRecord[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [walkinSelectedMember, setWalkinSelectedMember] = useState<MemberApiRecord | null>(null);
  const [walkinSelectedRoomId, setWalkinSelectedRoomId] = useState<number | ''>('');
  const [walkinDuration, setWalkinDuration] = useState(60);
  const [walkinGroupSize, setWalkinGroupSize] = useState(1);
  const [walkinPurpose, setWalkinPurpose] = useState('');
  const [submittingWalkin, setSubmittingWalkin] = useState(false);

  useEffect(() => {
    if (showWalkinModal && walkinStudentSearch.trim()) {
      const delayDebounce = setTimeout(async () => {
        try {
          setLoadingMembers(true);
          const res = await getAllMembers(1, walkinStudentSearch.trim());
          setWalkinMembersList(res.data || []);
        } catch (e) {
          // Ignore
        } finally {
          setLoadingMembers(false);
        }
      }, 300);
      return () => clearTimeout(delayDebounce);
    } else {
      setWalkinMembersList([]);
    }
  }, [walkinStudentSearch, showWalkinModal]);

  // Load Rooms
  const loadRooms = async () => {
    try {
      setLoadingRooms(true);
      const res = await fetchRooms();
      setRooms(res);
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Lỗi', message: getErrorMessage(e, 'Không thể tải phòng.') });
    } finally {
      setLoadingRooms(false);
    }
  };

  // Load Bookings (Admin list)
  const loadBookings = async (page = 1) => {
    try {
      setLoadingBookings(true);
      const res = await fetchAllRoomBookings({
        page,
        per_page: 8,
        status: statusFilter || undefined,
        search: searchQuery.trim() || undefined,
        date: dateFilter || undefined,
      });
      setBookings(res.data || []);
      setTotalPages(res.meta ? res.meta.last_page : ((res as any).last_page ?? 1));
      setCurrentPage(res.meta ? res.meta.current_page : ((res as any).current_page ?? 1));
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Lỗi', message: getErrorMessage(e, 'Không thể tải lượt đặt phòng.') });
    } finally {
      setLoadingBookings(false);
    }
  };

  // Load Stats
  const [lastStatsController, setLastStatsController] = useState<AbortController | null>(null);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetchRoomBookingStats(statsStartDate || undefined, statsEndDate || undefined);
      setStats(res);
    } catch (e: any) {
      // Ignore
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rooms') {
      void loadRooms();
    } else if (activeTab === 'requests') {
      void loadBookings(1);
    } else if (activeTab === 'stats') {
      void loadStats();
    }
  }, [activeTab, statusFilter, dateFilter, statsStartDate, statsEndDate]);

  // Real-time WebSocket listener for room booking state updates
  useEffect(() => {
    const channel = echoClient.channel('room-bookings');

    channel.listen('.room.booking.updated', (event: any) => {
      if (activeTab === 'requests') {
        void loadBookings(currentPage);
      } else if (activeTab === 'stats') {
        void loadStats();
      }
    });

    return () => {
      echoClient.leave('room-bookings');
    };
  }, [activeTab, currentPage]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadBookings(1);
  };

  // Handle quick check-in by code (Admin)
  const handleQuickCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInCode.trim()) return;

    try {
      setCheckingIn(true);
      const res = await checkInRoomBooking(checkInCode.trim().toUpperCase());
      emitToast({ tone: 'success', title: 'Check-in thành công', message: res.message });
      setCheckInCode('');
      void loadBookings(1);
    } catch (err: any) {
      emitToast({ tone: 'error', title: 'Check-in thất bại', message: getErrorMessage(err, 'Mã không hợp lệ.') });
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle Admin walk-in booking on behalf of student
  const handleAdminWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinSelectedRoomId || !walkinSelectedMember) {
      emitToast({ tone: 'error', title: 'Lỗi', message: 'Vui lòng điền đầy đủ thông tin phòng và sinh viên.' });
      return;
    }

    try {
      setSubmittingWalkin(true);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const end = new Date(now.getTime() + walkinDuration * 60 * 1000);
      const endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

      await createRoomBooking({
        room_id: Number(walkinSelectedRoomId),
        member_id: walkinSelectedMember.member_id,
        is_walkin: true,
        date: now.toISOString().split('T')[0],
        start_time: timeStr,
        end_time: endStr,
        group_size: walkinGroupSize,
        purpose: walkinPurpose.trim() || undefined,
      });

      emitToast({ tone: 'success', title: 'Thành công', message: 'Đăng ký phòng Walk-in cho sinh viên thành công!' });
      setShowWalkinModal(false);
      setWalkinStudentSearch('');
      setWalkinSelectedMember(null);
      setWalkinSelectedRoomId('');
      setWalkinPurpose('');
      setWalkinGroupSize(1);
      void loadBookings(1);
    } catch (err: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(err, 'Đã xảy ra lỗi.') });
    } finally {
      setSubmittingWalkin(false);
    }
  };

  // Create or Update Room submit
  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRoom) {
        // Update
        await updateRoom(editingRoom.room_id, {
          name: roomForm.name.trim(),
          capacity: roomForm.capacity,
          location: roomForm.location.trim(),
          description: roomForm.description.trim(),
          status: roomForm.status,
          amenities: roomForm.amenities,
        });
        emitToast({ tone: 'success', title: 'Thành công', message: 'Đã cập nhật phòng thành công!' });
      } else {
        // Create
        await createRoom({
          name: roomForm.name.trim(),
          capacity: roomForm.capacity,
          location: roomForm.location.trim(),
          description: roomForm.description.trim(),
          status: roomForm.status,
          amenities: roomForm.amenities,
        });
        emitToast({ tone: 'success', title: 'Thành công', message: 'Đã thêm phòng mới thành công!' });
      }

      setShowRoomModal(false);
      setEditingRoom(null);
      setRoomForm({ name: '', capacity: 6, location: '', description: '', status: 'active', amenities: [] });
      void loadRooms();
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Có lỗi xảy ra.') });
    }
  };

  // Edit Room Trigger
  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      capacity: room.capacity,
      location: room.location,
      description: room.description || '',
      status: room.status,
      amenities: room.amenities || []
    });
    setShowRoomModal(true);
  };

  // Toggle room status
  const handleToggleRoomActive = async (room: Room) => {
    try {
      const updated = await updateRoom(room.room_id, {
        is_active: !room.is_active
      });
      emitToast({ 
        tone: 'success', 
        title: 'Thành công', 
        message: `Đã ${updated.is_active ? 'bật' : 'tắt'} phòng ${room.name} thành công!` 
      });
      setRooms(prev => prev.map(r => r.room_id === room.room_id ? updated : r));
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Không thể cập nhật.') });
    }
  };

  // Delete Room
  const handleDeleteRoom = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng học này?')) return;
    try {
      const res = await deleteRoom(id);
      emitToast({ tone: 'success', title: 'Thành công', message: res.message });
      void loadRooms();
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Không thể xóa phòng.') });
    }
  };

  // Approve Booking
  const handleApprove = async (id: number) => {
    try {
      await approveRoomBooking(id);
      emitToast({ tone: 'success', title: 'Đã duyệt', message: 'Đã duyệt lượt đặt phòng thành công!' });
      void loadBookings(currentPage);
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Có lỗi xảy ra.') });
    }
  };

  // Reject Booking Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRejectModal || !rejectReason.trim()) return;

    try {
      await rejectRoomBooking(showRejectModal.booking_id, rejectReason.trim());
      emitToast({ tone: 'success', title: 'Thành công', message: 'Đã từ chối lượt đặt phòng.' });
      setShowRejectModal(null);
      setRejectReason('');
      void loadBookings(currentPage);
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Có lỗi xảy ra.') });
    }
  };

  // Admin check-in on behalf
  const handleAdminCheckIn = async (id: number) => {
    try {
      const res = await adminCheckInRoomBooking(id);
      emitToast({ tone: 'success', title: 'Check-in thành công', message: res.message });
      void loadBookings(currentPage);
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Có lỗi xảy ra.') });
    }
  };

  // Admin check-out on behalf
  const handleAdminCheckOut = async (id: number) => {
    try {
      const res = await adminCheckOutRoomBooking(id);
      emitToast({ tone: 'success', title: 'Check-out thành công', message: res.message });
      void loadBookings(currentPage);
    } catch (e: any) {
      emitToast({ tone: 'error', title: 'Thất bại', message: getErrorMessage(e, 'Có lỗi xảy ra.') });
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

  // Toggle amenities array
  const handleAmenityCheck = (amenity: string) => {
    setRoomForm(prev => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists 
          ? prev.amenities.filter(a => a !== amenity)
          : [...prev.amenities, amenity]
      };
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Quản lý phòng học nhóm</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Duyệt lịch đặt phòng của sinh viên, thống kê hiệu suất sử dụng và quản lý danh sách phòng.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'rooms' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quản lý phòng
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'requests' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Duyệt yêu cầu
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'stats' ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Báo cáo thống kê
          </button>
        </div>
      </div>

      {activeTab === 'rooms' ? (
        /* TAB 1: ROOMS MANAGEMENT LIST */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
            <span className="text-sm font-semibold text-slate-700">Tổng số phòng: {rooms.length} phòng</span>
            <button
              onClick={() => {
                setEditingRoom(null);
                setRoomForm({ name: '', capacity: 6, location: '', description: '', status: 'active', amenities: [] });
                setShowRoomModal(true);
              }}
              className="bg-primary text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-xs transition-all hover:bg-opacity-90 flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Thêm phòng mới
            </button>
          </div>

          {loadingRooms ? (
            <div className="text-center py-12 text-sm text-slate-500">Đang tải danh sách phòng...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
              Chưa có phòng nào được tạo. Nhấp "Thêm phòng mới" để bắt đầu.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-container overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Tên phòng</th>
                    <th className="px-6 py-4">Vị trí</th>
                    <th className="px-6 py-4">Sức chứa</th>
                    <th className="px-6 py-4">Tiện ích</th>
                    <th className="px-6 py-4">Trạng thái vận hành</th>
                    <th className="px-6 py-4">Bật/Tắt đặt</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rooms.map((room) => (
                    <tr key={room.room_id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-slate-800">{room.name}</td>
                      <td className="px-6 py-4 text-slate-600">{room.location}</td>
                      <td className="px-6 py-4">{room.capacity} người</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {room.amenities?.map((am) => (
                            <span key={am} className="bg-slate-100 text-[10px] text-slate-600 px-2 py-0.5 rounded border border-slate-200/50">
                              {am === 'projector' ? 'Máy chiếu' : am === 'whiteboard' ? 'Bảng' : am === 'tv' ? 'TV' : am}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          room.status === 'active' ? 'bg-green-100 text-green-800' :
                          room.status === 'maintenance' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {room.status === 'active' ? 'Hoạt động' : room.status === 'maintenance' ? 'Bảo trì' : 'Đóng cửa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleRoomActive(room)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            room.is_active ? 'bg-primary' : 'bg-slate-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              room.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditRoom(room)}
                          className="text-xs font-bold text-primary hover:underline cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.room_id)}
                          className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'requests' ? (
        /* TAB 2: REQUEST APPROVAL LIST */
        <div className="space-y-6">
          {/* Quick Check-in Form */}
          <div className="rounded-2xl border border-primary/20 bg-blue-50/20 p-6 scholar-shadow">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              Xác nhận Check-in tại quầy bằng Mã Đặt Phòng (Booking Code)
            </h3>
            <form onSubmit={handleQuickCheckIn} className="flex flex-wrap gap-4 items-center max-w-2xl">
              <input
                type="text"
                maxLength={6}
                placeholder="Nhập mã đặt phòng (6 ký tự)"
                value={checkInCode}
                onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={checkingIn || !checkInCode.trim()}
                className="bg-primary text-white text-sm font-medium px-6 py-2.5 rounded-xl transition-all shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">login</span>
                {checkingIn ? 'Đang xử lý...' : 'Xác nhận Check-in'}
              </button>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                Quét mã QR Check-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWalkinModal(true);
                  void loadRooms();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">bolt</span>
                Đăng ký Walk-in cho SV
              </button>
            </form>
          </div>

          {/* Filters Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mã/Tên sinh viên</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày đặt phòng</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="no_show">No-show (Vắng)</option>
                  <option value="rejected">Bị từ chối</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-xl shadow-xs transition-all hover:bg-opacity-95 hover:shadow-md cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">search</span>
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>

          {loadingBookings ? (
            <div className="text-center py-12 text-sm text-slate-500">Đang tải danh sách đặt phòng...</div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-slate-500">
              Không tìm thấy kết quả đặt phòng nào trùng khớp.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-container overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Sinh viên</th>
                    <th className="px-6 py-4">Phòng</th>
                    <th className="px-6 py-4">Thời gian</th>
                    <th className="px-6 py-4">Mã Check-in</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4 text-right">Duyệt thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => {
                    const badge = getStatusLabel(b.status);
                    const isPending = b.status === 'pending';
                    const isApproved = b.status === 'approved';
                    const timeLabel = `${b.start_time.substring(0, 5)} - ${b.end_time.substring(0, 5)}`;
                    
                    return (
                      <tr key={b.booking_id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{b.member?.name}</div>
                          <div className="text-xs text-slate-500">{b.member?.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-700">{b.room?.name}</div>
                          <div className="text-xs text-slate-500">{b.room?.location}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div>{new Date(b.date).toLocaleDateString('vi-VN')}</div>
                          <div className="text-xs text-slate-500 font-bold">{timeLabel}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600 tracking-wider">
                            {b.booking_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(b.booking_id)}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => setShowRejectModal(b)}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {isApproved && !b.check_in_at && (
                            <button
                              onClick={() => handleAdminCheckIn(b.booking_id)}
                              className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 cursor-pointer"
                            >
                              Check-in
                            </button>
                          )}

                          {isApproved && b.check_in_at && !b.check_out_at && (
                            <button
                              onClick={() => handleAdminCheckOut(b.booking_id)}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              Check-out
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 py-4 bg-slate-50 border-t border-slate-100">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => void loadBookings(currentPage - 1)}
                    className="border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-slate-500 font-medium">Trang {currentPage} / {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => void loadBookings(currentPage + 1)}
                    className="border border-slate-200 rounded-lg px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: STATISTICS & CSS-ONLY CHARTS */
        <div className="space-y-8">
          {/* Stats Filters Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Từ ngày</span>
                <input
                  type="date"
                  value={statsStartDate}
                  onChange={(e) => setStatsStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Đến ngày</span>
                <input
                  type="date"
                  value={statsEndDate}
                  onChange={(e) => setStatsEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div>
                <button
                  onClick={() => {
                    setStatsStartDate('');
                    setStatsEndDate('');
                  }}
                  className="w-full border border-slate-200 text-slate-600 text-sm font-semibold py-2.5 rounded-xl transition-all hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">clear_all</span>
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          </div>

          {loadingStats ? (
            <div className="text-center py-12 text-sm text-slate-500">Đang tải dữ liệu báo cáo...</div>
          ) : !stats ? (
            <div className="text-center py-12 text-sm text-slate-500">Không thể tải số liệu thống kê.</div>
          ) : (
            <>
              {/* Quick Stat Cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tổng lượt đặt phòng</span>
                  <span className="text-3xl font-black text-slate-800 block">{stats.total_bookings}</span>
                  <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[12px]">trending_up</span>
                    Kể từ khi kích hoạt
                  </span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Yêu cầu chờ duyệt</span>
                  <span className="text-3xl font-black text-amber-600 block">{stats.pending_count}</span>
                  <span className="text-[10px] text-slate-500 block">Cần xử lý phê duyệt</span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Lượt bỏ phòng (No-show)</span>
                  <span className="text-3xl font-black text-rose-600 block">{stats.no_show_count}</span>
                  <span className="text-[10px] text-rose-500 block">Tỷ lệ: {stats.total_bookings > 0 ? round((stats.no_show_count / stats.total_bookings) * 100) : 0}%</span>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tỷ lệ check-in thành công</span>
                  <span className="text-3xl font-black text-blue-600 block">{stats.usage_rate}%</span>
                  <span className="text-[10px] text-slate-500 block">Tính trên số lượt được duyệt</span>
                </div>
              </div>

              {/* Popular room detail */}
              {stats.most_popular_room && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl border border-blue-200 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px] filled">star</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Phòng được yêu thích nhất</h4>
                      <p className="text-sm text-slate-600 mt-0.5">
                        <span className="font-semibold text-primary">{stats.most_popular_room.name}</span> với tổng cộng <span className="font-semibold">{stats.most_popular_room.count} lượt đặt</span>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CSS-Only Chart Visualizer */}
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xs space-y-6">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">bar_chart</span>
                  Biểu đồ phân phối trạng thái lượt đặt phòng
                </h3>
                
                <div className="space-y-4">
                  {[
                    { label: 'Hoàn thành sử dụng', count: stats.completed_count, color: 'bg-blue-500' },
                    { label: 'Đã duyệt (Chưa sử dụng)', count: stats.approved_count, color: 'bg-green-500' },
                    { label: 'Chờ thủ thư duyệt', count: stats.pending_count, color: 'bg-amber-500' },
                    { label: 'No-show (Bỏ phòng)', count: stats.no_show_count, color: 'bg-rose-500' },
                    { label: 'Sinh viên hủy lịch', count: stats.cancelled_count, color: 'bg-slate-400' },
                  ].map((item) => {
                    const pct = stats.total_bookings > 0 ? (item.count / stats.total_bookings) * 100 : 0;
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                          <span>{item.label}</span>
                          <span>{item.count} lượt ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div 
                            className={`${item.color} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT ROOM MODAL */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl scholar-shadow p-8 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold text-slate-800">
                {editingRoom ? 'Chỉnh sửa phòng học' : 'Thêm phòng học mới'}
              </h3>
              <button
                onClick={() => {
                  setShowRoomModal(false);
                  setEditingRoom(null);
                }}
                className="text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} className="space-y-4">
              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tên phòng học</span>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng A1"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1 block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Sức chứa tối đa (người)</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <label className="space-y-1 block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Vận hành</span>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Hoạt động bình thường</option>
                    <option value="maintenance">Đang bảo trì thiết bị</option>
                    <option value="closed">Đóng cửa tạm thời</option>
                  </select>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Vị trí / Tầng</span>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tầng 2, Khu A"
                  value={roomForm.location}
                  onChange={(e) => setRoomForm({ ...roomForm, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {/* Amenities checkboxes */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tiện ích trong phòng</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {[
                    { key: 'projector', val: 'Máy chiếu' },
                    { key: 'whiteboard', val: 'Bảng viết' },
                    { key: 'power_outlets', val: 'Ổ cắm điện' },
                    { key: 'tv', val: 'Màn hình TV' },
                    { key: 'microphone', val: 'Thiết bị micro' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={roomForm.amenities.includes(item.key)}
                        onChange={() => handleAmenityCheck(item.key)}
                        className="h-4 w-4 rounded border-slate-300 text-primary"
                      />
                      {item.val}
                    </label>
                  ))}
                </div>
              </div>

              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mô tả chi tiết phòng</span>
                <textarea
                  placeholder="Phòng trang bị đầy đủ máy chiếu không dây..."
                  rows={3}
                  value={roomForm.description}
                  onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomModal(false);
                    setEditingRoom(null);
                  }}
                  className="border border-slate-200 text-slate-600 text-sm font-bold px-5 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="bg-primary text-white text-sm font-bold px-6 py-2 rounded-xl shadow-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  Lưu thiết lập
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT REQUEST MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl scholar-shadow p-8 space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold text-slate-800">Từ chối đặt phòng</h3>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                className="text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Bạn đang từ chối yêu cầu của sinh viên <span className="font-bold">{showRejectModal.member?.name}</span> cho phòng <span className="font-bold">{showRejectModal.room?.name}</span>.
              </div>

              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Lý do từ chối</span>
                <textarea
                  required
                  placeholder="Lý do từ chối (ví dụ: Trùng lịch sự kiện đột xuất của trường, phòng đang sửa...)"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className="border border-slate-200 text-slate-600 text-sm font-bold px-5 py-2 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-6 py-2 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Quét mã QR Check-in phòng</h3>
              <button 
                onClick={() => setShowScanner(false)} 
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="relative aspect-square w-full bg-black">
              <Scanner
                onScan={async (result) => {
                  if (result && result.length > 0) {
                    const scannedCode = result[0].rawValue.trim().toUpperCase();
                    setShowScanner(false);
                    
                    emitToast({
                      tone: 'info',
                      title: 'Đang xử lý',
                      message: `Đang check-in cho mã: ${scannedCode}...`,
                    });

                    try {
                      const res = await checkInRoomBooking(scannedCode);
                      emitToast({ tone: 'success', title: 'Check-in thành công', message: res.message });
                      void loadBookings(1);
                    } catch (err: any) {
                      emitToast({
                        tone: 'error',
                        title: 'Check-in thất bại',
                        message: getErrorMessage(err, 'Mã không hợp lệ hoặc đã hết hạn.'),
                      });
                    }
                  }
                }}
                components={{ finder: true }}
              />
            </div>
            <div className="bg-slate-50 p-4 text-center text-xs text-slate-500">
              Đưa mã QR trên lịch hẹn đặt phòng của sinh viên vào khung camera để check-in tự động.
            </div>
          </div>
        </div>
      )}
      {/* Walk-in Booking Modal for Admin */}
      {showWalkinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl scholar-shadow p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Đăng ký Walk-in cho Sinh viên</h3>
                <p className="text-xs text-slate-500 mt-1">Đăng ký và check-in ngay lập tức cho sinh viên tại quầy.</p>
              </div>
              <button
                onClick={() => {
                  setShowWalkinModal(false);
                  setWalkinStudentSearch('');
                  setWalkinSelectedMember(null);
                  setWalkinSelectedRoomId('');
                  setWalkinPurpose('');
                }}
                className="text-slate-400 hover:text-slate-600 border border-slate-200 rounded-full p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAdminWalkinSubmit} className="space-y-4">
              {/* Member Search */}
              <div className="space-y-2 relative">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Tìm kiếm sinh viên</span>
                {walkinSelectedMember ? (
                  <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50/50 rounded-xl p-3">
                    <div>
                      <div className="font-bold text-sm text-slate-800">{walkinSelectedMember.name}</div>
                      <div className="text-xs text-slate-500">Mã SV: {walkinSelectedMember.member_id} | {walkinSelectedMember.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWalkinSelectedMember(null)}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Thay đổi
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Tìm theo tên hoặc email..."
                      value={walkinStudentSearch}
                      onChange={(e) => setWalkinStudentSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    {loadingMembers && (
                      <div className="absolute right-3 top-9 text-xs text-slate-400">Đang tìm...</div>
                    )}
                    {walkinMembersList.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {walkinMembersList.map((m) => (
                          <div
                            key={m.member_id}
                            onClick={() => {
                              setWalkinSelectedMember(m);
                              setWalkinStudentSearch('');
                              setWalkinMembersList([]);
                            }}
                            className="p-3 hover:bg-slate-50 cursor-pointer transition-colors text-left"
                          >
                            <div className="font-semibold text-sm text-slate-800">{m.name}</div>
                            <div className="text-xs text-slate-500">Mã: {m.member_id} | {m.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Room Selection */}
              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Chọn phòng học</span>
                <select
                  required
                  value={walkinSelectedRoomId}
                  onChange={(e) => setWalkinSelectedRoomId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                >
                  <option value="">Chọn phòng trống...</option>
                  {rooms.filter(r => r.status === 'active' && r.is_active).map((r) => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.name} ({r.location} - Sức chứa: {r.capacity})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Duration */}
                <label className="space-y-1 block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Thời lượng sử dụng</span>
                  <select
                    value={walkinDuration}
                    onChange={(e) => setWalkinDuration(Number(e.target.value))}
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
                <label className="space-y-1 block">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Số lượng thành viên</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={walkinGroupSize}
                    onChange={(e) => setWalkinGroupSize(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              {/* Purpose */}
              <label className="space-y-1 block">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Mục đích sử dụng</span>
                <textarea
                  placeholder="Làm việc nhóm, tự học, thảo luận..."
                  rows={2}
                  value={walkinPurpose}
                  onChange={(e) => setWalkinPurpose(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowWalkinModal(false);
                    setWalkinStudentSearch('');
                    setWalkinSelectedMember(null);
                    setWalkinSelectedRoomId('');
                    setWalkinPurpose('');
                  }}
                  className="border border-slate-200 text-slate-600 text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingWalkin || !walkinSelectedMember || !walkinSelectedRoomId}
                  className="bg-primary text-white text-sm font-bold px-8 py-2.5 rounded-xl shadow-md transition-all hover:bg-opacity-90 disabled:opacity-60 cursor-pointer"
                >
                  {submittingWalkin ? 'Đang đăng ký...' : 'Xác nhận đặt phòng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function round(val: number) {
    return Math.round(val);
  }
}
