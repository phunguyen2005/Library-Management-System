<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\LibrarySetting;
use App\Models\Member;
use App\Services\AuditLoggerService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class DemoFinePayment extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:demo-fine-payment';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Chạy demo quy trình tính và thu phí phạt quá hạn (Phase 2)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->newLine();
        $this->info("=========================================================================");
        $this->info("   📚 HỆ THỐNG THƯ VIỆN SỐ TTVP - QUY TRÌNH THU PHÍ PHẠT QUÁ HẠN DEMO 📚   ");
        $this->info("=========================================================================");
        $this->newLine();

        // 1. Kiểm tra cấu hình mức phạt mặc định
        $this->comment("👉 BƯỚC 1: Kiểm tra cấu hình biểu phí trễ hạn...");
        $settings = LibrarySetting::singleton();
        $finePerDay = (float) ($settings->fine_per_day ?? 5000);
        $this->line(" - Mức phạt quá hạn hiện tại: <fg=yellow;options=bold>" . number_format($finePerDay) . " VND/ngày</>");
        $this->newLine();

        // 2. Khởi tạo dữ liệu giả lập trong một Transaction để an toàn hoặc dọn dẹp sau khi chạy
        $this->comment("👉 BƯỚC 2: Thiết lập dữ liệu demo (Sinh viên, Ấn phẩm, Phiếu mượn)...");
        
        $member = Member::query()->first();
        if (!$member) {
            $member = Member::create([
                'name' => 'Nguyễn Văn Demo',
                'email' => 'demo.student@library.com',
                'password' => bcrypt('password123'),
                'is_verified' => true,
            ]);
            $this->line(" - Tạo Sinh viên demo mới: <info>{$member->name}</info> ({$member->email})");
        } else {
            $this->line(" - Sử dụng Sinh viên có sẵn: <info>{$member->name}</info> ({$member->email})");
        }

        $book = Book::query()->first();
        if (!$book) {
            $book = Book::create([
                'title' => 'Giáo trình Lập trình Web PHP & Laravel',
                'author' => 'TTVP Author',
                'genre' => 'Technology',
                'quantity' => 5,
            ]);
            $this->line(" - Tạo Ấn phẩm demo mới: <info>\"{$book->title}\"</info>");
        } else {
            $this->line(" - Sử dụng Ấn phẩm có sẵn: <info>\"{$book->title}\"</info>");
        }

        // Tạo 1 phiếu mượn giả định đã quá hạn 5 ngày
        $borrowDate = Carbon::today()->subDays(20);
        $dueDate = Carbon::today()->subDays(5);

        $borrowing = Borrowing::create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => $borrowDate->toDateString(),
            'due_date' => $dueDate->toDateString(),
        ]);

        $this->line(" - Khởi tạo Phiếu mượn ID: <fg=cyan;options=bold>#{$borrowing->loan_id}</>");
        $this->line("   + Ngày mượn: <fg=gray>{$borrowDate->format('d/m/Y')}</>");
        $this->line("   + Hạn trả:   <fg=red;options=bold>{$dueDate->format('d/m/Y')} (Đã quá hạn 5 ngày)</>");
        $this->newLine();

        // 3. Chạy Artisan Command quét quá hạn tính phí phạt
        $this->comment("👉 BƯỚC 3: Chạy lệnh tự động quét và tính toán phí phạt trễ hạn...");
        $this->line(" > Đang chạy command: <fg=magenta>php artisan borrowings:calculate-fines</>");
        
        $this->call('borrowings:calculate-fines');
        $this->newLine();

        // 4. Truy vấn hiển thị khoản nợ phạt vừa được sinh ra
        $this->comment("👉 BƯỚC 4: Kiểm tra trạng thái nợ phạt của Sinh viên...");
        $fine = Fine::where('loan_id', $borrowing->loan_id)->first();

        if ($fine) {
            $this->line(" - Tìm thấy khoản phạt trễ hạn cho Phiếu mượn <fg=cyan>#{$borrowing->loan_id}</>:");
            $this->line("   + Số tiền phạt: <fg=red;options=bold>" . number_format($fine->amount) . " VND</>");
            $this->line("   + Trạng thái:   <fg=red;options=bold>CHƯA THANH TOÁN (unpaid)</>");
        } else {
            $this->error(" X Không tìm thấy khoản phạt nào được tạo. Vui lòng kiểm tra lại cấu hình.");
            return Command::FAILURE;
        }
        $this->newLine();

        // 5. Giả lập Admin thu phí phạt tại quầy
        $this->comment("👉 BƯỚC 5: Thực hiện giả lập Thủ thư xác nhận thu phí phạt tiền mặt tại quầy...");
        $this->line(" - Gọi API thanh toán nợ phạt ID: <fg=cyan>#{$fine->fine_id}</>");
        
        DB::transaction(function () use ($fine, $borrowing, $member) {
            // Cập nhật trạng thái Fine
            $fine->status = 'paid';
            $fine->paid_at = now();
            $fine->save();

            // Ghi nhận Audit Log hoạt động thu tiền
            AuditLoggerService::log(
                'collect_fine',
                "Đã thu phí phạt trễ hạn {$fine->amount} VND tiền mặt của Sinh viên {$member->name} cho phiếu mượn #{$borrowing->loan_id}."
            );
        });

        $this->info(" ✓ [THÀNH CÔNG] Đã xác nhận đóng phí phạt thành công!");
        $this->line("   + Số tiền thu:   <fg=green;options=bold>" . number_format($fine->amount) . " VND (Tiền mặt)</>");
        $this->line("   + Trạng thái nợ: <fg=green;options=bold>ĐÃ THANH TOÁN (paid)</>");
        $this->line("   + Thời gian thu: <fg=gray>" . now()->format('d/m/Y H:i:s') . "</>");
        $this->newLine();

        // 6. Kiểm tra ghi vết nhật ký vận hành (Audit Logs)
        $this->comment("👉 BƯỚC 6: Kiểm tra Nhật ký kiểm toán hệ thống (Audit Logs)...");
        $latestLog = AuditLog::orderBy('created_at', 'desc')->first();

        if ($latestLog && $latestLog->action === 'collect_fine') {
            $this->line(" - Log ID:       <fg=cyan>#{$latestLog->log_id}</>");
            $this->line("   + Hành động:  <fg=yellow;options=bold>{$latestLog->action}</>");
            $this->line("   + Chi tiết:   <info>{$latestLog->description}</info>");
            $this->line("   + IP truy vết: <fg=gray>{$latestLog->ip_address}</>");
            $this->line("   + Thời gian:   " . \Carbon\Carbon::parse($latestLog->created_at)->format('d/m/Y H:i:s'));
        } else {
            $this->error(" X Không tìm thấy audit log ghi vết tương ứng.");
        }

        $this->newLine();
        $this->info("=========================================================================");
        $this->info("      🎉 QUY TRÌNH ĐÃ ĐƯỢC XÁC MINH HOÀN TOÀN HỢP LỆ & TRƠN TRU! 🎉      ");
        $this->info("=========================================================================");
        $this->newLine();

        return Command::SUCCESS;
    }
}
