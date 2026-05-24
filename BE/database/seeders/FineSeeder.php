<?php

namespace Database\Seeders;

use App\Models\Member;
use App\Models\Fine;
use App\Models\FinePayment;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FineSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        // 1. Xóa các thanh toán phạt và khoản phạt hiện có để tránh trùng lặp hoặc lỗi unique constraint
        DB::table('fine_payments')->delete();
        DB::table('fines')->delete();

        // 2. Xóa các lượt mượn giả lập đã tạo ngoài seeder gốc (nếu có, ví dụ loan_id > 3)
        DB::table('borrowing')->where('loan_id', '>', 3)->delete();

        // 3. Lấy toàn bộ độc giả (members)
        $members = Member::all();

        // Lấy danh sách sách có sẵn từ database
        $bookIds = DB::table('books')->pluck('book_id')->toArray();
        if (empty($bookIds)) {
            $bookIds = [1, 4, 5, 6, 8, 9, 10, 11, 13, 14];
        }

        $librarianId = DB::table('librarians')->value('librarian_id') ?? 1;

        $bookIndex = 0;

        foreach ($members as $member) {
            // --- KHOẢN PHẠT 1: Overdue (unpaid) ---
            $loanId1 = null;
            if ($member->member_id === 1) {
                // Thành viên 1 đã có loan_id = 1 (trạng thái 'borrowed', đã quá hạn)
                $loanId1 = 1;
            } else {
                $bookId = $bookIds[$bookIndex % count($bookIds)];
                $bookIndex++;
                $loanId1 = DB::table('borrowing')->insertGetId([
                    'book_id' => $bookId,
                    'member_id' => $member->member_id,
                    'librarian_id' => $librarianId,
                    'status' => 'borrowed',
                    'borrow_date' => now()->subDays(30)->toDateString(),
                    'due_date' => now()->subDays(15)->toDateString(),
                    'return_date' => null,
                ]);
            }

            Fine::create([
                'loan_id' => $loanId1,
                'member_id' => $member->member_id,
                'amount' => 75000,
                'reason' => Fine::REASON_OVERDUE,
                'status' => Fine::STATUS_UNPAID,
            ]);

            // --- KHOẢN PHẠT 2: Damaged (unpaid) ---
            $bookId = $bookIds[$bookIndex % count($bookIds)];
            $bookIndex++;
            $loanId2 = DB::table('borrowing')->insertGetId([
                'book_id' => $bookId,
                'member_id' => $member->member_id,
                'librarian_id' => $librarianId,
                'status' => 'returned',
                'borrow_date' => now()->subDays(20)->toDateString(),
                'due_date' => now()->subDays(10)->toDateString(),
                'return_date' => now()->subDays(10)->toDateString(),
            ]);

            Fine::create([
                'loan_id' => $loanId2,
                'member_id' => $member->member_id,
                'amount' => 50000,
                'reason' => Fine::REASON_DAMAGED,
                'status' => Fine::STATUS_UNPAID,
            ]);

            // --- KHOẢN PHẠT 3: Lost (unpaid) ---
            $bookId = $bookIds[$bookIndex % count($bookIds)];
            $bookIndex++;
            $loanId3 = DB::table('borrowing')->insertGetId([
                'book_id' => $bookId,
                'member_id' => $member->member_id,
                'librarian_id' => $librarianId,
                'status' => 'borrowed',
                'borrow_date' => now()->subDays(25)->toDateString(),
                'due_date' => now()->subDays(11)->toDateString(),
                'return_date' => null,
            ]);

            Fine::create([
                'loan_id' => $loanId3,
                'member_id' => $member->member_id,
                'amount' => 200000,
                'reason' => Fine::REASON_LOST,
                'status' => Fine::STATUS_UNPAID,
            ]);

            // --- KHOẢN PHẠT 4: Overdue (paid) ---
            $loanId4 = null;
            if ($member->member_id === 1) {
                // Thành viên 1 đã có loan_id = 3 (trạng thái 'returned', đã quá hạn)
                $loanId4 = 3;
            } else {
                $bookId = $bookIds[$bookIndex % count($bookIds)];
                $bookIndex++;
                $loanId4 = DB::table('borrowing')->insertGetId([
                    'book_id' => $bookId,
                    'member_id' => $member->member_id,
                    'librarian_id' => $librarianId,
                    'status' => 'returned',
                    'borrow_date' => now()->subDays(40)->toDateString(),
                    'due_date' => now()->subDays(25)->toDateString(),
                    'return_date' => now()->subDays(25)->toDateString(),
                ]);
            }

            $fine4 = Fine::create([
                'loan_id' => $loanId4,
                'member_id' => $member->member_id,
                'amount' => 100000,
                'reason' => Fine::REASON_OVERDUE,
                'status' => Fine::STATUS_PAID,
                'paid_at' => now()->subDays(5),
            ]);

            FinePayment::create([
                'fine_id' => $fine4->fine_id,
                'amount_paid' => 100000,
                'method' => FinePayment::METHOD_CASH,
                'transaction_ref' => 'REF_' . strtoupper(uniqid()),
                'status' => FinePayment::STATUS_COMPLETED,
                'collected_by' => $librarianId,
            ]);

            // --- KHOẢN PHẠT 5: Damaged (waived) ---
            $bookId = $bookIds[$bookIndex % count($bookIds)];
            $bookIndex++;
            $loanId5 = DB::table('borrowing')->insertGetId([
                'book_id' => $bookId,
                'member_id' => $member->member_id,
                'librarian_id' => $librarianId,
                'status' => 'returned',
                'borrow_date' => now()->subDays(35)->toDateString(),
                'due_date' => now()->subDays(20)->toDateString(),
                'return_date' => now()->subDays(20)->toDateString(),
            ]);

            Fine::create([
                'loan_id' => $loanId5,
                'member_id' => $member->member_id,
                'amount' => 50000,
                'reason' => Fine::REASON_DAMAGED,
                'status' => Fine::STATUS_WAIVED,
                'waived_by' => $librarianId,
                'waived_reason' => 'Độc giả gặp hoàn cảnh khó khăn, có đơn xác nhận của khoa.',
            ]);
        }
    }
}
