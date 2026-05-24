<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class FineAllAccounts extends Command
{
    protected $signature = 'borrowings:fine-all-accounts';
    protected $description = 'Tạo các khoản phạt giả lập đa dạng (quá hạn, hư hỏng, mất sách) cho toàn bộ độc giả để test';

    public function handle()
    {
        $this->info('Đang tiến hành tạo các khoản phạt giả lập cho toàn bộ độc giả...');
        
        Artisan::call('db:seed', [
            '--class' => 'Database\\Seeders\\FineSeeder'
        ]);

        $this->info('Đã tạo thành công nhiều loại khoản phạt (chưa thanh toán, đã thanh toán, miễn giảm) cho tất cả tài khoản độc giả.');
    }
}
