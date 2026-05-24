<?php

namespace Database\Seeders;

use App\Models\Librarian;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LibrarianSeeder extends Seeder
{
    public function run(): void
    {
        $defaultPassword = env('LIBRARY_DEMO_PASSWORD', 'Library@2026');

        DB::table('librarians')->upsert([
            [
                'librarian_id' => 1,
                'name' => 'Nguyen Van An',
                'email' => 'nguyen.van.an@hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0912345678',
                'hire_date' => '2026-03-17',
            ],
            [
                'librarian_id' => 2,
                'name' => 'Tran Thi Mai',
                'email' => 'tran.thi.mai@hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0987654321',
                'hire_date' => '2026-03-17',
            ],
            [
                'librarian_id' => 3,
                'name' => 'Phu Nguyen (Admin)',
                'email' => '4901104111@student.hcmue.edu.vn',
                'password' => Hash::make($defaultPassword),
                'phone_number' => '0909123456',
                'hire_date' => '2026-05-23',
            ],
        ], ['librarian_id'], ['name', 'email', 'password', 'phone_number', 'hire_date']);

        // Gán vai trò trong bảng pivot rbac
        Librarian::where('email', '4901104111@student.hcmue.edu.vn')->first()?->assignRole('admin');
        Librarian::whereIn('email', ['nguyen.van.an@hcmue.edu.vn', 'tran.thi.mai@hcmue.edu.vn'])->each(function ($lib) {
            $lib->assignRole('librarian');
        });
    }
}
