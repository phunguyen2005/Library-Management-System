<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BookInventoryNormalizeSeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('UPDATE books SET total_quantity = CASE WHEN total_quantity < 0 OR total_quantity IS NULL THEN 0 ELSE total_quantity END');
        DB::statement('UPDATE books SET available_quantity = CASE WHEN available_quantity < 0 OR available_quantity IS NULL THEN 0 WHEN available_quantity > total_quantity THEN total_quantity ELSE available_quantity END');
        DB::statement('UPDATE books SET is_available = CASE WHEN available_quantity > 0 THEN 1 ELSE 0 END');
    }
}
