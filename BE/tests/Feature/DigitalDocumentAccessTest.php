<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class DigitalDocumentAccessTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_digital_document_payload_includes_signed_access_links(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-digital-access', ['role:student'])->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/digital-documents')
            ->assertOk();

        $payload = $response->json();
        $document = $payload['data'][0] ?? $payload[0] ?? null;

        $this->assertIsArray($document);
        $this->assertNotEmpty($document['open_url']);
        $this->assertNotEmpty($document['download_url']);
        $this->assertArrayHasKey('has_attached_file', $document);
    }

    public function test_book_index_filters_borrowable_and_digital_books_by_purpose(): void
    {
        $borrowable = $this->getJson('/api/books?is_digital=false&limit=1000')
            ->assertOk()
            ->json('data');
        $digital = $this->getJson('/api/books?is_digital=true&limit=1000')
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($borrowable);
        $this->assertNotEmpty($digital);
        $this->assertContains(false, array_column($borrowable, 'is_digital'));
        $this->assertNotContains(true, array_column($borrowable, 'is_digital'));
        $this->assertContains(true, array_column($digital, 'is_digital'));
        $this->assertNotContains(false, array_column($digital, 'is_digital'));
    }

    public function test_digital_documents_exclude_non_digital_book_records(): void
    {
        $book = Book::query()->create([
            'title' => 'Physical Book With Legacy Metadata',
            'author' => 'Library Admin',
            'genre' => 'Reference',
            'published_year' => 2024,
            'location' => 'A-1',
            'is_digital' => false,
            'resource_type' => null,
            'file_format' => 'PDF',
            'file_size' => '1 KB',
            'file_path' => 'digital-documents/legacy.pdf',
            'download_count' => 0,
            'total_quantity' => 2,
            'available_quantity' => 2,
            'is_available' => true,
        ]);

        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-digital-access', ['role:student'])->plainTextToken;

        $documentIds = collect($this->withToken($token)->getJson('/api/digital-documents')
            ->assertOk()
            ->json('data'))
            ->pluck('book_id');

        $this->assertFalse($documentIds->contains($book->book_id));
    }

    public function test_digital_download_counts_are_calculated_from_user_access_events_not_seeded_column(): void
    {
        $book = Book::query()
            ->where('is_digital', true)
            ->where('download_count', '>', 0)
            ->firstOrFail();
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-real-download-counts', ['role:student'])->plainTextToken;

        $bookPayload = collect($this->withToken($token)
            ->getJson('/api/books?is_digital=true&limit=1000')
            ->assertOk()
            ->json('data'))
            ->firstWhere('book_id', $book->book_id);
        $documentResponse = $this->withToken($token)
            ->getJson('/api/digital-documents')
            ->assertOk();
        $documentPayload = collect($documentResponse->json('data') ?? $documentResponse->json())
            ->firstWhere('book_id', $book->book_id);

        $this->assertSame(0, $bookPayload['download_count']);
        $this->assertSame(0, $documentPayload['download_count']);
    }

    public function test_signed_digital_document_download_records_member_access_and_updates_real_count(): void
    {
        $this->assertTrue(
            Schema::hasTable('digital_document_accesses'),
            'Digital document downloads should be stored as first-class user access records.',
        );

        if (! Schema::hasTable('digital_document_accesses')) {
            return;
        }

        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-real-download-audit', ['role:student'])->plainTextToken;

        $documentResponse = $this->withToken($token)
            ->getJson('/api/digital-documents')
            ->assertOk();
        $document = collect($documentResponse->json('data') ?? $documentResponse->json())
            ->first();
        $book = Book::query()->findOrFail($document['book_id']);

        $this->get($document['download_url'])
            ->assertOk();

        $this->assertDatabaseHas('digital_document_accesses', [
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'access_type' => 'download',
        ]);

        $refreshedDocumentResponse = $this->withToken($token)
            ->getJson('/api/digital-documents')
            ->assertOk();
        $refreshedDocument = collect($refreshedDocumentResponse->json('data') ?? $refreshedDocumentResponse->json())
            ->firstWhere('book_id', $book->book_id);

        $this->assertSame(1, $refreshedDocument['download_count']);
        $this->assertSame(1, $book->fresh()->download_count);
    }

    public function test_signed_digital_document_route_serves_preview_and_records_preview_access(): void
    {
        $book = Book::query()->where('is_digital', true)->firstOrFail();
        $initialDownloads = $book->download_count;
        $url = URL::temporarySignedRoute(
            'digital-documents.download',
            now()->addMinutes(30),
            ['book' => $book->book_id, 'disposition' => 'inline'],
        );

        $response = $this->get($url)
            ->assertOk();

        $this->assertStringStartsWith('%PDF-1.4', $response->getContent());

        $this->assertDatabaseHas('digital_document_accesses', [
            'book_id' => $book->book_id,
            'access_type' => 'preview',
        ]);
        $this->assertSame($initialDownloads, $book->fresh()->download_count);
    }

    public function test_admin_can_upload_digital_file_for_book(): void
    {
        Storage::fake('local');
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('digital-upload-access', ['role:admin']);
        $file = UploadedFile::fake()->create('lecture.pdf', 128, 'application/pdf');

        $this->withToken($token->plainTextToken)
            ->withHeader('Accept', 'application/json')
            ->post('/api/books/7/digital-file', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('is_digital', true)
            ->assertJsonPath('file_format', 'PDF')
            ->assertJsonPath('has_digital_file', true)
            ->assertJsonPath('digital_file_name', 'lecture.pdf');

        $book = Book::query()->findOrFail(7);

        $this->assertNotNull($book->file_path);
        Storage::disk('local')->assertExists($book->file_path);
    }

    public function test_admin_can_upload_audio_file_for_book(): void
    {
        Storage::fake('local');
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('audio-upload-access', ['role:admin']);
        $file = UploadedFile::fake()->create('lecture.mp3', 256, 'audio/mpeg');

        $this->withToken($token->plainTextToken)
            ->withHeader('Accept', 'application/json')
            ->post('/api/books/7/digital-file', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('is_digital', true)
            ->assertJsonPath('file_format', 'AUDIO')
            ->assertJsonPath('has_digital_file', true)
            ->assertJsonPath('digital_file_name', 'lecture.mp3');

        $book = Book::query()->findOrFail(7);

        $this->assertNotNull($book->file_path);
        Storage::disk('local')->assertExists($book->file_path);
    }

    public function test_students_cannot_upload_digital_file_for_book(): void
    {
        Storage::fake('local');
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-digital-upload-access', ['role:student']);
        $file = UploadedFile::fake()->create('lecture.pdf', 128, 'application/pdf');

        $this->withToken($token->plainTextToken)
            ->withHeader('Accept', 'application/json')
            ->post('/api/books/7/digital-file', ['file' => $file])
            ->assertForbidden()
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_invalid_digital_file_upload_is_rejected(): void
    {
        Storage::fake('local');
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('digital-upload-validation-access', ['role:admin']);
        $file = UploadedFile::fake()->create('notes.exe', 12, 'application/x-msdownload');

        $this->withToken($token->plainTextToken)
            ->withHeader('Accept', 'application/json')
            ->post('/api/books/7/digital-file', ['file' => $file])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_signed_digital_document_route_serves_uploaded_storage_file(): void
    {
        Storage::fake('local');
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('digital-upload-download-access', ['role:admin']);
        $file = UploadedFile::fake()->createWithContent(
            'lecture.pdf',
            '%PDF-1.4 uploaded library file',
        );

        $this->withToken($token->plainTextToken)
            ->withHeader('Accept', 'application/json')
            ->post('/api/books/7/digital-file', ['file' => $file])
            ->assertOk();

        $book = Book::query()->findOrFail(7);
        $url = URL::temporarySignedRoute(
            'digital-documents.download',
            now()->addMinutes(30),
            ['book' => $book->book_id, 'disposition' => 'inline'],
        );

        $this->get($url)
            ->assertOk()
            ->assertSee('%PDF-1.4 uploaded library file', false);
    }
}
