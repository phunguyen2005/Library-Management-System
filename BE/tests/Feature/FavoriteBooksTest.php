<?php

namespace Tests\Feature;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteBooksTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_student_can_add_and_list_favorite_books_without_duplicates(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-favorites-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/favorites/3')
            ->assertCreated()
            ->assertJsonPath('message', 'Sách đã được thêm vào danh sách yêu thích.')
            ->assertJsonPath('book.book_id', 3)
            ->assertJsonPath('book.is_favorite', true)
            ->assertJsonPath('book.favorite_count', 1);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/favorites/3')
            ->assertOk()
            ->assertJsonPath('book.book_id', 3)
            ->assertJsonPath('book.is_favorite', true)
            ->assertJsonPath('book.favorite_count', 1);

        $this->assertDatabaseCount('favorites', 1);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/favorites')
            ->assertOk()
            ->assertJsonPath('data.0.book_id', 3)
            ->assertJsonPath('data.0.is_favorite', true)
            ->assertJsonPath('data.0.favorite_count', 1);
    }

    public function test_student_can_remove_favorite_book(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-favorites-delete-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/favorites/4')
            ->assertCreated();

        $this->withToken($token->plainTextToken)
            ->deleteJson('/api/favorites/4')
            ->assertOk()
            ->assertJsonPath('message', 'Sách đã được xóa khỏi danh sách yêu thích.')
            ->assertJsonPath('book.book_id', 4)
            ->assertJsonPath('book.is_favorite', false)
            ->assertJsonPath('book.favorite_count', 0);

        $this->assertDatabaseMissing('favorites', [
            'member_id' => $member->member_id,
            'book_id' => 4,
        ]);
    }
}
