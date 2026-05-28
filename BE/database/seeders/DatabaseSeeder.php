<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        $seeders = [
            RolePermissionSeeder::class,
            LibrarianSeeder::class,
            MemberSeeder::class,
            BookSeeder::class,
            BorrowingSeeder::class,
            RoomSeeder::class,
            FineSeeder::class,
            GamifySeeder::class,
            NewBookImportSeeder::class,
            AdditionalBookImportSeeder::class,
            BookCopySeeder::class,
        ];

        if (!app()->runningUnitTests()) {
            $seeders[] = BlogPostSeeder::class;
        }

        $this->call($seeders);
    }
}
