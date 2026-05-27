<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoomBookingRejectRequest;
use App\Http\Requests\RoomBookingStoreRequest;
use App\Models\LibrarySetting;
use App\Models\Librarian;
use App\Models\Member;
use App\Models\Room;
use App\Models\RoomBooking;
use App\Notifications\NewRoomBookingRequestNotification;
use App\Notifications\RoomBookingStatusNotification;
use App\Services\AuditLoggerService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoomBookingController extends Controller
{
    /**
     * Store a new room booking (Student).
     */
    public function store(RoomBookingStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $settings = LibrarySetting::singleton();

        // Check if librarian is booking on behalf of a student
        if ($user instanceof \App\Models\Librarian) {
            if (!$user->hasPermission('manage_rooms')) {
                return response()->json([
                    'message' => 'Bạn không có quyền đăng ký phòng học.'
                ], 403);
            }
            $memberId = $validated['member_id'] ?? null;
            if (!$memberId) {
                return response()->json([
                    'message' => 'Thủ thư phải cung cấp ID sinh viên (member_id) để đặt phòng.'
                ], 422);
            }
            $member = Member::findOrFail($memberId);
        } else {
            $member = $user;
        }

        $roomId = (int) $validated['room_id'];
        $dateStr = $validated['date'];
        $startTimeStr = $validated['start_time'];
        $endTimeStr = $validated['end_time'];
        $isWalkin = filter_var($validated['is_walkin'] ?? false, FILTER_VALIDATE_BOOLEAN);

        // 1. Verify room exists and is bookable
        $room = Room::bookable()->findOrFail($roomId);

        // 2. Validate time limits (Library open/close times)
        $openTime = $settings->room_open_time ?? LibrarySetting::DEFAULT_ROOM_OPEN_TIME;
        $closeTime = $settings->room_close_time ?? LibrarySetting::DEFAULT_ROOM_CLOSE_TIME;
        if ($startTimeStr < $openTime || $endTimeStr > $closeTime) {
            return response()->json([
                'message' => "Thời gian đặt phòng phải nằm trong khung giờ hoạt động của thư viện ({$openTime} - {$closeTime})."
            ], 422);
        }

        // 3. Validate group size (Bypass for walk-in)
        $minGroupSize = $isWalkin ? 1 : (int) ($settings->room_min_group_size ?? LibrarySetting::DEFAULT_ROOM_MIN_GROUP_SIZE);
        if ($validated['group_size'] < $minGroupSize) {
            return response()->json([
                'message' => "Số lượng người đăng ký tối thiểu cho phòng học nhóm là {$minGroupSize} người."
            ], 422);
        }
        if ($validated['group_size'] > $room->capacity) {
            return response()->json([
                'message' => "Sức chứa tối đa của phòng {$room->name} là {$room->capacity} người."
            ], 422);
        }

        // 4. Validate duration (hours)
        $start = Carbon::parse($dateStr . ' ' . $startTimeStr);
        $end = Carbon::parse($dateStr . ' ' . $endTimeStr);
        $durationHours = $start->diffInMinutes($end) / 60.0;
        $maxHours = (float) ($settings->room_max_hours_per_booking ?? LibrarySetting::DEFAULT_ROOM_MAX_HOURS_PER_BOOKING);
        if ($durationHours > $maxHours) {
            return response()->json([
                'message' => "Thời gian sử dụng tối đa mỗi lần đặt là {$maxHours} tiếng."
            ], 422);
        }

        // 5. Validate advance booking window (Bypass for walk-in)
        if (!$isWalkin) {
            $advanceDays = (int) ($settings->room_advance_booking_days ?? LibrarySetting::DEFAULT_ROOM_ADVANCE_BOOKING_DAYS);
            $maxDate = now()->addDays($advanceDays)->format('Y-m-d');
            if ($dateStr > $maxDate) {
                return response()->json([
                    'message' => "Bạn chỉ được đặt phòng trước tối đa {$advanceDays} ngày."
                ], 422);
            }
        }

        return DB::transaction(function () use ($roomId, $member, $user, $dateStr, $startTimeStr, $endTimeStr, $durationHours, $isWalkin, $validated, $settings) {
            $roomLocked = Room::query()->bookable()->lockForUpdate()->findOrFail($roomId);
            $memberLocked = Member::query()->lockForUpdate()->findOrFail($member->member_id);

            if ($validated['group_size'] > $roomLocked->capacity) {
                return response()->json([
                    'message' => "Sức chứa tối đa của phòng {$roomLocked->name} là {$roomLocked->capacity} người."
                ], 422);
            }

            // 6. Check student daily limit
            $maxBookingsPerDay = (int) ($settings->room_max_bookings_per_day ?? LibrarySetting::DEFAULT_ROOM_MAX_BOOKINGS_PER_DAY);
            $studentBookingsCount = RoomBooking::where('member_id', $memberLocked->member_id)
                ->where('date', $dateStr)
                ->whereIn('status', [RoomBooking::STATUS_APPROVED, RoomBooking::STATUS_PENDING, RoomBooking::STATUS_COMPLETED])
                ->lockForUpdate()
                ->count();

            if ($studentBookingsCount >= $maxBookingsPerDay) {
                return response()->json([
                    'message' => "Mỗi sinh viên chỉ được đặt tối đa {$maxBookingsPerDay} lượt phòng mỗi ngày."
                ], 422);
            }

            // 6.5 Check student weekly quota (max hours per week)
            $startOfWeek = Carbon::parse($dateStr)->startOfWeek()->format('Y-m-d');
            $endOfWeek = Carbon::parse($dateStr)->endOfWeek()->format('Y-m-d');
            
            $weeklyBookings = RoomBooking::where('member_id', $memberLocked->member_id)
                ->whereBetween('date', [$startOfWeek, $endOfWeek])
                ->whereIn('status', [RoomBooking::STATUS_APPROVED, RoomBooking::STATUS_PENDING, RoomBooking::STATUS_COMPLETED])
                ->lockForUpdate()
                ->get();
                
            $weeklyHours = 0.0;
            foreach ($weeklyBookings as $wb) {
                $wbDateStr = $wb->date instanceof \DateTimeInterface ? $wb->date->format('Y-m-d') : $wb->date;
                $wbStart = Carbon::parse($wbDateStr . ' ' . $wb->start_time);
                $wbEnd = Carbon::parse($wbDateStr . ' ' . $wb->end_time);
                $weeklyHours += $wbStart->diffInMinutes($wbEnd) / 60.0;
            }
            
            $maxHoursPerWeek = (float) ($settings->room_max_hours_per_week ?? 4);
            if ($weeklyHours + $durationHours > $maxHoursPerWeek) {
                return response()->json([
                    'message' => "Tổng thời gian đặt phòng trong tuần này của bạn vượt quá hạn ngạch cho phép là {$maxHoursPerWeek} tiếng (Đã đặt: {$weeklyHours} tiếng, Đăng ký thêm: {$durationHours} tiếng)."
                ], 422);
            }

            // 7. Check overlap conflicts
            $hasConflict = RoomBooking::hasConflict($roomLocked->room_id, $dateStr, $startTimeStr, $endTimeStr);
            if ($hasConflict) {
                return response()->json([
                    'message' => 'Khoảng thời gian này đã có người đặt trước. Vui lòng chọn giờ khác.'
                ], 422);
            }

            // 8. Create booking
            $requiresApproval = (bool) ($settings->room_booking_requires_approval ?? LibrarySetting::DEFAULT_ROOM_BOOKING_REQUIRES_APPROVAL);
            $status = $isWalkin ? RoomBooking::STATUS_APPROVED : ($requiresApproval ? RoomBooking::STATUS_PENDING : RoomBooking::STATUS_APPROVED);

            $bookingData = [
                'room_id' => $roomLocked->room_id,
                'member_id' => $memberLocked->member_id,
                'date' => $dateStr,
                'start_time' => $startTimeStr,
                'end_time' => $endTimeStr,
                'purpose' => $validated['purpose'] ?? null,
                'group_size' => $validated['group_size'],
                'status' => $status,
                'booking_code' => RoomBooking::generateBookingCode(),
                'is_walkin' => $isWalkin,
            ];

            if ($isWalkin) {
                $bookingData['check_in_at'] = now();
            }

            $booking = RoomBooking::create($bookingData);

            $logDesc = $isWalkin
                ? 'Đã đặt phòng walk-in ' . $roomLocked->name . ' và check-in ngay lập tức (' . substr($startTimeStr, 0, 5) . '-' . substr($endTimeStr, 0, 5) . ')'
                : 'Đã đăng ký đặt phòng ' . $roomLocked->name . ' vào ngày ' . $dateStr . ' (' . substr($startTimeStr, 0, 5) . '-' . substr($endTimeStr, 0, 5) . ')';
                
            AuditLoggerService::log(
                'room_booking_create',
                $logDesc,
                $user
            );

            // Send notification to member
            try {
                $memberLocked->notify(new RoomBookingStatusNotification($booking, $status));
            } catch (\Exception $e) {
                // Ignore
            }

            // If requires approval and not walkin, notify admins
            if ($requiresApproval && !$isWalkin) {
                try {
                    Librarian::all()->each(fn($lib) => $lib->notify(new NewRoomBookingRequestNotification($booking)));
                } catch (\Exception $e) {
                    // Ignore
                }
            }

            return response()->json($booking, 201);
        });
    }

    /**
     * List current student's bookings.
     */
    public function myBookings(Request $request): JsonResponse
    {
        $member = $request->user();
        
        $query = RoomBooking::where('member_id', $member->member_id)
            ->with('room')
            ->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $bookings = $query->paginate((int) $request->input('per_page', 10));

        return response()->json($bookings);
    }

    /**
     * Cancel a room booking (Student).
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $member = $request->user();

        return DB::transaction(function () use ($id, $member) {
            $booking = RoomBooking::where('member_id', $member->member_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if (! in_array($booking->status, [RoomBooking::STATUS_PENDING, RoomBooking::STATUS_APPROVED])) {
                return response()->json([
                    'message' => 'Chỉ có thể hủy lịch đặt phòng ở trạng thái chờ duyệt hoặc đã duyệt.'
                ], 422);
            }

            $settings = LibrarySetting::singleton();
            $cancelDeadlineHours = (int) ($settings->room_cancel_deadline_hours ?? LibrarySetting::DEFAULT_ROOM_CANCEL_DEADLINE_HOURS);
            
            $bookingDateStr = $booking->date instanceof \DateTimeInterface 
                ? $booking->date->format('Y-m-d') 
                : $booking->date;
            $startDateTime = Carbon::parse($bookingDateStr . ' ' . $booking->start_time);
            
            $isViolation = false;
            if (now()->addHours($cancelDeadlineHours)->greaterThan($startDateTime)) {
                $isViolation = true;
            }

            $booking->status = RoomBooking::STATUS_CANCELLED;
            $booking->rejection_reason = $isViolation 
                ? "Hủy sát giờ đặt (trễ hạn hủy miễn phạt dưới {$cancelDeadlineHours} tiếng)." 
                : "Sinh viên tự hủy lịch.";
            $booking->save();

            $action = $isViolation ? 'room_booking_cancel_violation' : 'room_booking_cancel';
            $desc = $isViolation 
                ? 'Hủy đặt phòng trễ hạn (vi phạm): phòng ' . $booking->room?->name . ' (Mã: ' . $booking->booking_code . ')'
                : 'Đã hủy lịch đặt phòng ' . $booking->room?->name . ' (Mã: ' . $booking->booking_code . ')';

            AuditLoggerService::log($action, $desc, $member);

            try {
                $member->notify(new RoomBookingStatusNotification($booking, 'cancelled'));
            } catch (\Exception $e) {
                // Ignore
            }

            return response()->json([
                'message' => 'Đã hủy lịch đặt phòng thành công.',
                'booking' => $booking
            ]);
        });
    }

    /**
     * Admin check-in to room booking by booking code (Admin).
     */
    public function adminCheckInCode(Request $request): JsonResponse
    {
        $request->validate([
            'booking_code' => 'required|string|size:6'
        ]);

        $code = strtoupper(trim($request->input('booking_code')));
        $admin = $request->user();

        return DB::transaction(function () use ($code, $admin) {
            $booking = RoomBooking::where('booking_code', $code)
                ->lockForUpdate()
                ->first();

            if (! $booking) {
                return response()->json(['message' => 'Mã đặt phòng không hợp lệ.'], 404);
            }

            if ($booking->status !== RoomBooking::STATUS_APPROVED) {
                return response()->json(['message' => 'Lượt đặt phòng này không ở trạng thái sẵn sàng để check-in.'], 422);
            }

            if (! is_null($booking->check_in_at)) {
                return response()->json(['message' => 'Lượt đặt phòng này đã check-in trước đó.'], 422);
            }

            $settings = LibrarySetting::singleton();
            $windowMinutes = (int) ($settings->room_checkin_window_minutes ?? LibrarySetting::DEFAULT_ROOM_CHECKIN_WINDOW_MINUTES);
            
            $bookingDateStr = $booking->date instanceof \DateTimeInterface 
                ? $booking->date->format('Y-m-d') 
                : $booking->date;
            $startDateTime = Carbon::parse($bookingDateStr . ' ' . $booking->start_time);
            
            $earliest = $startDateTime->copy()->subMinutes(10);
            $latest = $startDateTime->copy()->addMinutes($windowMinutes);

            if (now()->lessThan($earliest)) {
                return response()->json([
                    'message' => 'Chưa đến thời gian check-in của lượt đặt này (chỉ cho phép trước 10 phút).'
                ], 422);
            }

            if (now()->greaterThan($latest)) {
                return response()->json([
                    'message' => 'Lượt đặt này đã quá hạn thời gian check-in.'
                ], 422);
            }

            $booking->check_in_at = now();
            $booking->save();

            // Award check-in XP and Points
            if ($booking->member) {
                app(\App\Services\GamifyService::class)->awardXpAndPoints(
                    $booking->member,
                    40,
                    10,
                    'room_checkin',
                    'Check-in phòng học nhóm: ' . ($booking->room?->name ?? 'Phòng tự học')
                );
            }

            AuditLoggerService::log(
                'room_booking_admin_checkin_code',
                'Thủ thư check-in hộ phòng ' . $booking->room?->name . ' cho ' . $booking->member?->name . ' bằng mã ' . $code,
                $admin
            );

            return response()->json([
                'message' => 'Check-in phòng học nhóm thành công!',
                'booking' => $booking
            ]);
        });
    }

    /**
     * Check-out from room booking (Student).
     */
    public function checkOut(Request $request, int $id): JsonResponse
    {
        $member = $request->user();

        return DB::transaction(function () use ($id, $member) {
            $booking = RoomBooking::where('member_id', $member->member_id)
                ->lockForUpdate()
                ->findOrFail($id);

            if ($booking->status !== RoomBooking::STATUS_APPROVED || is_null($booking->check_in_at)) {
                return response()->json(['message' => 'Lượt đặt phòng chưa được check-in.'], 422);
            }

            if (! is_null($booking->check_out_at)) {
                return response()->json(['message' => 'Lượt đặt phòng đã check-out.'], 422);
            }

            $booking->status = RoomBooking::STATUS_COMPLETED;
            $booking->check_out_at = now();
            $booking->save();

            AuditLoggerService::log(
                'room_booking_checkout',
                'Check-out phòng ' . $booking->room?->name,
                $member
            );

            try {
                $member->notify(new RoomBookingStatusNotification($booking, 'completed'));
            } catch (\Exception $e) {
                // Ignore
            }

            return response()->json([
                'message' => 'Check-out thành công. Cảm ơn bạn!',
                'booking' => $booking
            ]);
        });
    }

    /**
     * List all bookings (Admin).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = RoomBooking::with(['room', 'member']);

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('room_id')) {
            $query->where('room_id', $request->input('room_id'));
        }

        if ($request->has('date')) {
            $query->where('date', $request->input('date'));
        }

        if ($request->has('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->whereHas('member', function ($q) use ($search) {
                $q->where('name', 'like', $search)
                  ->orWhere('email', 'like', $search);
            });
        }

        $bookings = $query->orderBy('date', 'desc')
            ->orderBy('start_time', 'desc')
            ->paginate((int) $request->input('per_page', 10));

        return response()->json($bookings);
    }

    /**
     * Approve room booking (Admin).
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        return DB::transaction(function () use ($id, $admin) {
            $booking = RoomBooking::lockForUpdate()->findOrFail($id);

            if ($booking->status !== RoomBooking::STATUS_PENDING) {
                return response()->json(['message' => 'Lượt đặt phòng này không ở trạng thái chờ duyệt.'], 422);
            }

            Room::query()->lockForUpdate()->findOrFail($booking->room_id);

            // Check conflicts again at the moment of approval
            $bookingDateStr = $booking->date instanceof \DateTimeInterface 
                ? $booking->date->format('Y-m-d') 
                : $booking->date;
            $hasConflict = RoomBooking::hasConflict($booking->room_id, $bookingDateStr, $booking->start_time, $booking->end_time, $booking->booking_id);
            if ($hasConflict) {
                return response()->json([
                    'message' => 'Không thể duyệt vì khoảng thời gian này đã bị trùng lịch với một yêu cầu khác vừa được duyệt.'
                ], 422);
            }

            $booking->status = RoomBooking::STATUS_APPROVED;
            $booking->approved_by = $admin->librarian_id;
            $booking->save();

            AuditLoggerService::log(
                'room_booking_approve',
                'Đã duyệt đặt phòng ' . $booking->room?->name . ' của sinh viên ' . $booking->member?->name,
                $admin
            );

            try {
                $booking->member?->notify(new RoomBookingStatusNotification($booking, 'approved'));
            } catch (\Exception $e) {
                // Ignore
            }

            return response()->json($booking);
        });
    }

    /**
     * Reject room booking (Admin).
     */
    public function reject(RoomBookingRejectRequest $request, int $id): JsonResponse
    {
        $admin = $request->user();
        $validated = $request->validated();

        return DB::transaction(function () use ($id, $validated, $admin) {
            $booking = RoomBooking::lockForUpdate()->findOrFail($id);

            if ($booking->status !== RoomBooking::STATUS_PENDING) {
                return response()->json(['message' => 'Lượt đặt phòng này không ở trạng thái chờ duyệt.'], 422);
            }

            $booking->status = RoomBooking::STATUS_REJECTED;
            $booking->rejection_reason = $validated['reason'];
            $booking->save();

            AuditLoggerService::log(
                'room_booking_reject',
                'Đã từ chối đặt phòng ' . $booking->room?->name . ' của ' . $booking->member?->name . '. Lý do: ' . $validated['reason'],
                $admin
            );

            try {
                $booking->member?->notify(new RoomBookingStatusNotification($booking, 'rejected', $validated['reason']));
            } catch (\Exception $e) {
                // Ignore
            }

            return response()->json($booking);
        });
    }

    /**
     * Admin check-in on behalf of student (Admin).
     */
    public function adminCheckIn(Request $request, int $id): JsonResponse
    {
        $admin = $request->user();

        return DB::transaction(function () use ($id, $admin) {
            $booking = RoomBooking::lockForUpdate()->findOrFail($id);

            if ($booking->status !== RoomBooking::STATUS_APPROVED) {
                return response()->json(['message' => 'Lượt đặt phòng chưa được duyệt hoặc không khả dụng để check-in.'], 422);
            }

            if (! is_null($booking->check_in_at)) {
                return response()->json(['message' => 'Lượt đặt phòng này đã check-in.'], 422);
            }

            $booking->check_in_at = now();
            $booking->save();

            // Award check-in XP and Points
            if ($booking->member) {
                app(\App\Services\GamifyService::class)->awardXpAndPoints(
                    $booking->member,
                    40,
                    10,
                    'room_checkin',
                    'Check-in phòng học nhóm: ' . ($booking->room?->name ?? 'Phòng tự học')
                );
            }

            AuditLoggerService::log(
                'room_booking_admin_checkin',
                'Thủ thư check-in hộ phòng ' . $booking->room?->name . ' của ' . $booking->member?->name,
                $admin
            );

            return response()->json([
                'message' => 'Đã check-in hộ thành công.',
                'booking' => $booking
            ]);
        });
    }

    /**
     * Statistics for Room Bookings.
     */
    public function statistics(Request $request): JsonResponse
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $baseQuery = RoomBooking::query();
        if ($startDate) {
            $baseQuery->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $baseQuery->where('date', '<=', $endDate);
        }

        $total = (clone $baseQuery)->count();
        $pending = (clone $baseQuery)->where('status', RoomBooking::STATUS_PENDING)->count();
        $approved = (clone $baseQuery)->where('status', RoomBooking::STATUS_APPROVED)->count();
        $completed = (clone $baseQuery)->where('status', RoomBooking::STATUS_COMPLETED)->count();
        $noShow = (clone $baseQuery)->where('status', RoomBooking::STATUS_NO_SHOW)->count();
        $cancelled = (clone $baseQuery)->where('status', RoomBooking::STATUS_CANCELLED)->count();

        // Most popular room
        $popular = (clone $baseQuery)->select('room_id', DB::raw('count(*) as count'))
            ->groupBy('room_id')
            ->orderBy('count', 'desc')
            ->first();

        $popularRoom = null;
        if ($popular) {
            $room = Room::find($popular->room_id);
            if ($room) {
                $popularRoom = [
                    'room_id' => $room->room_id,
                    'name' => $room->name,
                    'count' => $popular->count,
                ];
            }
        }

        // Usage rate calculations
        $completedOrShow = (clone $baseQuery)->where(function ($q) {
            $q->where('status', RoomBooking::STATUS_COMPLETED)
              ->orWhere(function ($sub) {
                  $sub->where('status', RoomBooking::STATUS_APPROVED)->whereNotNull('check_in_at');
              });
        })->count();

        $denominator = $completedOrShow + $noShow;
        $usageRate = $denominator > 0 ? round(($completedOrShow / $denominator) * 100, 1) : 0;

        return response()->json([
            'total_bookings' => $total,
            'pending_count' => $pending,
            'approved_count' => $approved,
            'completed_count' => $completed,
            'no_show_count' => $noShow,
            'cancelled_count' => $cancelled,
            'most_popular_room' => $popularRoom,
            'usage_rate' => $usageRate,
        ]);
    }
}
