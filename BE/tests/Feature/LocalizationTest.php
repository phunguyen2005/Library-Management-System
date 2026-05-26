<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LocalizationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_api_defaults_to_vietnamese_messages(): void
    {
        $response = $this->withHeader('Accept-Language', '')
            ->postJson('/api/login', [
                'identifier' => 'missing-account@example.com',
                'password' => 'Library@2026',
            ]);

        $response->assertStatus(401);
        $this->assertNotSame('Login details are incorrect.', $response->json('message'));
    }

    public function test_accept_language_header_returns_english_auth_messages(): void
    {
        $this->withHeader('Accept-Language', 'en')
            ->postJson('/api/login', [
                'identifier' => 'missing-account@example.com',
                'password' => 'Library@2026',
            ])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Login details are incorrect.');

        $this->withHeader('Accept-Language', 'en')
            ->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Please sign in to continue.');
    }

    public function test_accept_language_header_returns_english_validation_messages(): void
    {
        $this->withHeader('Accept-Language', 'en')
            ->postJson('/api/login', [
                'identifier' => '',
                'password' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['identifier', 'password'])
            ->assertJsonPath('errors.identifier.0', 'Please enter email.');
    }

    public function test_accept_language_header_returns_interpolated_english_borrow_messages(): void
    {
        $member = Member::query()->findOrFail(2);
        $member->forceFill([
            'email_verified_at' => now(),
            'password' => Hash::make('Library@2026'),
        ])->save();

        $token = $member->createToken('member-limit-access', ['role:student']);

        Book::query()->create([
            'title' => 'Book 6',
            'author' => 'Author 6',
            'genre' => 'Reference',
            'published_year' => 2024,
            'is_available' => true,
            'cover' => null,
            'location' => 'Shelf Z',
            'is_digital' => false,
            'resource_type' => null,
            'file_format' => null,
            'file_size' => null,
            'download_count' => 0,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);

        Borrowing::query()->insert([
            [
                'book_id' => 1,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'pending',
                'borrow_date' => '2026-04-07',
                'due_date' => null,
                'return_date' => null,
            ],
            [
                'book_id' => 3,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'pending',
                'borrow_date' => '2026-04-07',
                'due_date' => null,
                'return_date' => null,
            ],
            [
                'book_id' => 4,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'borrowed',
                'borrow_date' => '2026-04-07',
                'due_date' => '2036-04-21',
                'return_date' => null,
            ],
            [
                'book_id' => 5,
                'member_id' => 2,
                'librarian_id' => null,
                'status' => 'borrowed',
                'borrow_date' => '2026-04-07',
                'due_date' => '2036-04-21',
                'return_date' => null,
            ],
        ]);

        $this->withHeader('Accept-Language', 'en')
            ->withToken($token->plainTextToken)
            ->postJson('/api/requests', ['book_id' => 6])
            ->assertStatus(422)
            ->assertJsonPath('message', 'You have reached the limit of 5 active requests.');
    }

    public function test_accept_language_header_returns_english_for_role_mismatch(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-access', ['role:student']);

        $this->withHeader('Accept-Language', 'en')
            ->withToken($token->plainTextToken)
            ->getJson('/api/members')
            ->assertForbidden()
            ->assertJsonPath('message', 'You do not have permission to perform this action.');
    }
}
