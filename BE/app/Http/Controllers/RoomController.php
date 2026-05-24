<?php

namespace App\Http\Controllers;

use App\Http\Requests\RoomStoreRequest;
use App\Http\Requests\RoomUpdateRequest;
use App\Models\Room;
use App\Models\RoomBooking;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoomController extends Controller
{
    /**
     * Display a listing of rooms.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        // If student, only show bookable/active rooms
        if ($request->user() && $request->user()->getRoleName() === 'student') {
            $query->bookable();
        } else {
            // Admin filters
            if ($request->has('status')) {
                $query->where('status', $request->input('status'));
            }
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }
        }

        if ($request->has('capacity')) {
            $query->where('capacity', '>=', (int) $request->input('capacity'));
        }

        $rooms = $query->orderBy('name')->get();

        return response()->json($rooms);
    }

    /**
     * Display the specified room.
     */
    public function show(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);
        return response()->json($room);
    }

    /**
     * Store a newly created room.
     */
    public function store(RoomStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();
        
        $room = Room::create([
            'name' => $validated['name'],
            'capacity' => $validated['capacity'],
            'location' => $validated['location'],
            'amenities' => $validated['amenities'] ?? [],
            'status' => $validated['status'] ?? Room::STATUS_ACTIVE,
            'is_active' => true,
            'description' => $validated['description'] ?? null,
        ]);

        AuditLoggerService::log(
            'room_create', 
            'Đã tạo phòng học nhóm mới: ' . $room->name . ' (Sức chứa: ' . $room->capacity . ' người)'
        );

        return response()->json($room, 201);
    }

    /**
     * Update the specified room.
     */
    public function update(RoomUpdateRequest $request, int $id): JsonResponse
    {
        $room = Room::findOrFail($id);
        $validated = $request->validated();

        $room->update($validated);

        AuditLoggerService::log(
            'room_update', 
            'Đã cập nhật thông tin phòng học nhóm: ' . $room->name
        );

        return response()->json($room);
    }

    /**
     * Remove the specified room.
     */
    public function destroy(int $id): JsonResponse
    {
        $room = Room::findOrFail($id);

        // Check if there are any future pending or approved bookings
        $hasBookings = RoomBooking::where('room_id', $id)
            ->where('date', '>=', now()->format('Y-m-d'))
            ->whereIn('status', [RoomBooking::STATUS_PENDING, RoomBooking::STATUS_APPROVED])
            ->exists();

        if ($hasBookings) {
            return response()->json([
                'message' => 'Không thể xóa phòng đang có lịch đặt chờ duyệt hoặc đã duyệt trong tương lai.'
            ], 422);
        }

        $room->delete();

        AuditLoggerService::log(
            'room_delete', 
            'Đã xóa phòng học nhóm: ' . $room->name
        );

        return response()->json(['message' => 'Đã xóa phòng thành công.']);
    }

    /**
     * Get bookings schedule for a room on a specific date range.
     */
    public function schedule(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to', $dateFrom);

        $bookings = RoomBooking::where('room_id', $id)
            ->whereBetween('date', [$dateFrom, $dateTo])
            ->whereIn('status', [RoomBooking::STATUS_APPROVED, RoomBooking::STATUS_PENDING])
            ->select('booking_id', 'start_time', 'end_time', 'status', 'date')
            ->orderBy('start_time')
            ->get();

        return response()->json($bookings);
    }
}
