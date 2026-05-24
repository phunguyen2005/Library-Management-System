<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LibraryUpgradePhase3Test extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_admin_can_generate_ai_tags_and_summary_for_a_book(): void
    {
        $librarian = Librarian::query()->firstOrFail();
        $book = Book::query()->firstOrFail();
        $token = $librarian->createToken('phase-3-ai', ['role:admin']);

        $response = $this->withToken($token->plainTextToken)
            ->postJson("/api/ai/books/{$book->book_id}/metadata")
            ->assertOk()
            ->assertJsonPath('book.book_id', $book->book_id)
            ->assertJsonStructure([
                'message',
                'book' => [
                    'book_id',
                    'ai_summary',
                    'ai_tags',
                    'ai_summary_generated_at',
                ],
            ]);

        $this->assertNotEmpty($response->json('book.ai_summary'));
        $this->assertIsArray($response->json('book.ai_tags'));
        $this->assertNotEmpty($response->json('book.ai_tags'));
        $this->assertNotNull(Book::query()->findOrFail($book->book_id)->ai_summary_generated_at);
    }

    public function test_book_creation_dispatches_ai_metadata_job_and_bumps_cache_version(): void
    {
        Queue::fake();
        Cache::put('books_cache_version', 1, now()->addDay());

        $librarian = Librarian::query()->firstOrFail();
        $token = $librarian->createToken('phase-3-create', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/books', [
                'title' => 'Enterprise Architecture Patterns',
                'author' => 'Library AI',
                'genre' => 'Technology',
                'quantity' => 2,
            ])
            ->assertCreated()
            ->assertJsonPath('ai_summary', null)
            ->assertJsonPath('ai_tags', []);

        Queue::assertPushed(\App\Jobs\GenerateBookAiMetadataJob::class);
        $this->assertGreaterThan(1, Cache::get('books_cache_version'));
    }

    public function test_student_can_sync_reading_progress_for_digital_book(): void
    {
        $member = Member::query()->firstOrFail();
        $book = Book::query()->where('is_digital', true)->firstOrFail();
        $token = $member->createToken('phase-3-progress', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->putJson("/api/reading-progress/{$book->book_id}", [
                'current_page' => 12,
                'total_pages' => 48,
            ])
            ->assertOk()
            ->assertJsonPath('progress.book_id', $book->book_id)
            ->assertJsonPath('progress.current_page', 12)
            ->assertJsonPath('progress.total_pages', 48)
            ->assertJsonPath('progress.progress_percent', 25);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/reading-progress')
            ->assertOk()
            ->assertJsonFragment([
                'book_id' => $book->book_id,
                'current_page' => 12,
                'total_pages' => 48,
            ]);
    }

    public function test_health_endpoint_reports_enterprise_checks(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.database.status', 'ok')
            ->assertJsonPath('checks.cache.status', 'ok')
            ->assertJsonPath('checks.queue.status', 'ok')
            ->assertJsonPath('checks.storage.status', 'ok')
            ->assertJsonStructure([
                'status',
                'checked_at',
                'checks' => [
                    'database' => ['status', 'message'],
                    'cache' => ['status', 'message'],
                    'queue' => ['status', 'message'],
                    'storage' => ['status', 'message'],
                    'memory' => ['status', 'message'],
                ],
            ]);
    }

    public function test_openapi_documentation_and_swagger_ui_are_available(): void
    {
        $this->getJson('/api/openapi.json')
            ->assertOk()
            ->assertJsonPath('openapi', '3.0.3')
            ->assertJsonStructure([
                'info' => ['title', 'version'],
                'paths' => [
                    '/api/books',
                    '/api/reading-progress/{book}',
                    '/api/health',
                ],
            ]);

        $this->get('/api/docs')
            ->assertOk()
            ->assertSee('Swagger UI', false)
            ->assertSee('/api/openapi.json', false);
    }

    public function test_queue_support_tables_exist(): void
    {
        $this->assertTrue(Schema::hasTable('jobs'));
        $this->assertTrue(Schema::hasTable('failed_jobs'));
        $this->assertTrue(Schema::hasTable('job_batches'));
    }
}
