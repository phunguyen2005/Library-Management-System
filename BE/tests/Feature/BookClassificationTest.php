<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Librarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class BookClassificationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_physical_book_creation_normalizes_legacy_genre_and_shelf(): void
    {
        Queue::fake();

        $token = Librarian::query()
            ->firstOrFail()
            ->createToken('book-classification-create', ['role:admin'])
            ->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/books', [
                'title' => 'Legacy Technology Shelf',
                'author' => 'Library Admin',
                'genre' => 'Công nghệ thông tin',
                'location' => 'Kệ S1',
                'quantity' => 2,
                'is_digital' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('genre', 'Công nghệ - Kỹ thuật')
            ->assertJsonPath('location', 'Kệ C1');

        $this->assertDatabaseHas('books', [
            'title' => 'Legacy Technology Shelf',
            'genre' => 'Công nghệ - Kỹ thuật',
            'location' => 'Kệ C1',
            'is_digital' => false,
        ]);
    }

    public function test_physical_book_creation_rejects_unknown_free_text_genre(): void
    {
        Queue::fake();

        $token = Librarian::query()
            ->firstOrFail()
            ->createToken('book-classification-reject', ['role:admin'])
            ->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/books', [
                'title' => 'Unmapped Free Text',
                'author' => 'Library Admin',
                'genre' => 'Tùy ý rời rạc',
                'location' => 'Kệ A1',
                'quantity' => 1,
                'is_digital' => false,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['genre']);
    }

    public function test_csv_import_normalizes_physical_aliases_and_rejects_unknown_genres(): void
    {
        Queue::fake();

        $token = Librarian::query()
            ->firstOrFail()
            ->createToken('book-classification-import', ['role:admin'])
            ->plainTextToken;

        $validCsv = implode("\n", [
            'ten_sach,tac_gia,the_loai,nam_xuat_ban,vi_tri,so_luong,sach_so',
            'Đời sống kỹ năng,Library Admin,Kỹ năng sống,2024,Kệ P1,3,0',
        ]);

        $this->withToken($token)
            ->post('/api/books/import', [
                'file' => UploadedFile::fake()->createWithContent('valid-books.csv', $validCsv),
            ])
            ->assertOk()
            ->assertJsonPath('success_count', 1);

        $this->assertDatabaseHas('books', [
            'title' => 'Đời sống kỹ năng',
            'genre' => 'Triết học & Tâm lý học',
            'location' => 'Kệ J1',
            'is_digital' => false,
        ]);

        $invalidCsv = implode("\n", [
            'ten_sach,tac_gia,the_loai,nam_xuat_ban,vi_tri,so_luong,sach_so',
            'Dữ liệu tự do,Library Admin,Tùy ý rời rạc,2024,Kệ A1,1,0',
        ]);

        $this->withToken($token)
            ->post('/api/books/import', [
                'file' => UploadedFile::fake()->createWithContent('invalid-books.csv', $invalidCsv),
            ])
            ->assertStatus(422)
            ->assertJsonPath('success_count', 0);
    }

    public function test_seeded_physical_books_use_only_shelf_groups_from_the_library_map(): void
    {
        $invalidShelves = Book::query()
            ->where('is_digital', false)
            ->where(function ($query) {
                $query
                    ->where('location', 'like', 'Kệ S%')
                    ->orWhere('location', 'like', 'Kệ T%')
                    ->orWhere('location', 'like', 'Kệ L%')
                    ->orWhere('location', 'like', 'Kệ P%');
            })
            ->pluck('location')
            ->all();

        $this->assertSame([], $invalidShelves);
    }
}
