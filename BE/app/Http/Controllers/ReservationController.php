<?php

namespace App\Http\Controllers;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Reservation;
use App\Models\LibrarySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Exceptions\HttpResponseException;

class ReservationController extends Controller
{
    public function me(Request $request)
    {
        $member = $request->user();

        $reservations = Reservation::query()
            ->where('member_id', $member->member_id)
            ->where('status', Reservation::STATUS_WAITING)
            ->with(['book'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($reservations);
    }

    public function reserve(Request $request, int $bookId)
    {
        $member = $request->user();

        $reservation = DB::transaction(function () use ($member, $bookId) {
            $emailLower = strtolower(trim($member->email));
            $isOutlookStudent = str_ends_with($emailLower, '@student.hcmue.edu.vn') || str_ends_with($emailLower, '@hcmue.edu.vn');
            if (!$isOutlookStudent) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Quyền đặt chỗ sách chỉ dành cho sinh viên sử dụng tài khoản Outlook trường (@student.hcmue.edu.vn hoặc @hcmue.edu.vn). Khách vãng lai chỉ được xem tài liệu.',
                ], 403));
            }

            $settings = LibrarySetting::singleton();
            if ($member->borrow_suspended_until && now()->lt($member->borrow_suspended_until)) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Quyền đặt chỗ sách của bạn đang bị tạm khóa đến ' . 
                        \Carbon\Carbon::parse($member->borrow_suspended_until)->format('d/m/Y H:i') . 
                        ' do vi phạm quá hạn nhận sách quá ' . ($settings->max_missed_pickups ?? 3) . ' lần trong 2 tuần.',
                ], 422));
            }

            $book = Book::query()->lockForUpdate()->findOrFail($bookId);

            if ($book->is_digital) {
                throw new HttpResponseException(response()->json(['message' => 'Tài liệu số không thể đặt chỗ.'], 422));
            }

            if ($book->available_quantity > 0) {
                throw new HttpResponseException(response()->json(['message' => 'Sách hiện vẫn còn bản sẵn sàng để mượn.'], 422));
            }

            // Check if active borrowing or active reservation exists for this book/member
            $activeLoan = Borrowing::query()
                ->where('member_id', $member->member_id)
                ->where('book_id', $book->book_id)
                ->whereIn('status', [Borrowing::STATUS_PENDING, Borrowing::STATUS_APPROVED, Borrowing::STATUS_BORROWED])
                ->lockForUpdate()
                ->exists();

            if ($activeLoan) {
                throw new HttpResponseException(response()->json(['message' => 'Bạn đã có một yêu cầu hoặc phiếu mượn hoạt động cho cuốn sách này.'], 422));
            }

            $activeReservation = Reservation::query()
                ->where('member_id', $member->member_id)
                ->where('book_id', $book->book_id)
                ->where('status', Reservation::STATUS_WAITING)
                ->lockForUpdate()
                ->exists();

            if ($activeReservation) {
                throw new HttpResponseException(response()->json(['message' => 'Bạn đã đặt chỗ cho cuốn sách này rồi.'], 422));
            }

            // Validate active limit (loans + reservations)
            $settings = LibrarySetting::singleton();
            $maxActiveLoans = max(1, (int) $settings->max_active_loans);
            
            $activeLoanCount = Borrowing::query()
                ->where('member_id', $member->member_id)
                ->whereIn('status', [Borrowing::STATUS_PENDING, Borrowing::STATUS_APPROVED, Borrowing::STATUS_BORROWED])
                ->lockForUpdate()
                ->count();

            $activeReservationCount = Reservation::query()
                ->where('member_id', $member->member_id)
                ->where('status', Reservation::STATUS_WAITING)
                ->lockForUpdate()
                ->count();

            if (($activeLoanCount + $activeReservationCount) >= $maxActiveLoans) {
                throw new HttpResponseException(response()->json([
                    'message' => "Bạn đã đạt giới hạn tối đa {$maxActiveLoans} lượt mượn và đặt chỗ đang hoạt động.",
                ], 422));
            }

            $position = Reservation::where('book_id', $book->book_id)
                ->where('status', Reservation::STATUS_WAITING)
                ->lockForUpdate()
                ->count() + 1;

            return Reservation::create([
                'member_id' => $member->member_id,
                'book_id' => $book->book_id,
                'position' => $position,
                'status' => Reservation::STATUS_WAITING,
            ]);
        });

        return response()->json([
            'message' => "Đặt chỗ thành công! Bạn đang ở vị trí số {$reservation->position} trong hàng đợi.",
            'reservation' => $reservation->load('book'),
        ], 201);
    }

    public function cancel(Request $request, int $reservationId)
    {
        $member = $request->user();

        DB::transaction(function () use ($member, $reservationId) {
            $reservation = Reservation::query()
                ->where('reservation_id', $reservationId)
                ->where('member_id', $member->member_id)
                ->lockForUpdate()
                ->first();

            if (!$reservation) {
                throw new HttpResponseException(response()->json(['message' => 'Không tìm thấy lượt đặt chỗ.'], 404));
            }

            if ($reservation->status !== Reservation::STATUS_WAITING) {
                throw new HttpResponseException(response()->json(['message' => 'Chỉ có thể hủy lượt đặt chỗ đang trong trạng thái chờ.'], 422));
            }

            $position = $reservation->position;
            $reservation->status = Reservation::STATUS_CANCELLED;
            $reservation->save();

            // Shift positions of other waiting reservations
            Reservation::where('book_id', $reservation->book_id)
                ->where('status', Reservation::STATUS_WAITING)
                ->where('position', '>', $position)
                ->decrement('position');
        });

        return response()->json([
            'message' => 'Đã hủy đặt chỗ thành công.',
        ]);
    }
}
