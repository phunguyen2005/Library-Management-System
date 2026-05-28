<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Favorite;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerformanceOptimizationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_books_index_applies_backend_sort_and_pagination(): void
    {
        Book::query()->create([
            'title' => 'Perf Sort Alpha',
            'author' => 'Performance Team',
            'genre' => 'A - Khoa học Tự nhiên',
            'is_digital' => false,
            'published_year' => 2024,
            'total_quantity' => 3,
            'available_quantity' => 3,
            'is_available' => true,
        ]);

        Book::query()->create([
            'title' => 'Perf Sort Beta',
            'author' => 'Performance Team',
            'genre' => 'A - Khoa học Tự nhiên',
            'is_digital' => false,
            'published_year' => 2025,
            'total_quantity' => 8,
            'available_quantity' => 8,
            'is_available' => true,
        ]);

        Book::query()->create([
            'title' => 'Perf Sort Gamma',
            'author' => 'Performance Team',
            'genre' => 'A - Khoa học Tự nhiên',
            'is_digital' => false,
            'published_year' => 2023,
            'total_quantity' => 1,
            'available_quantity' => 1,
            'is_available' => true,
        ]);

        $this->getJson('/api/books?is_digital=false&query=Perf%20Sort&sort=available&limit=2&page=1')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.title', 'Perf Sort Beta')
            ->assertJsonPath('data.1.title', 'Perf Sort Alpha')
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 3);
    }

    public function test_books_index_rejects_unknown_sort_values(): void
    {
        $this->getJson('/api/books?sort=random')
            ->assertStatus(422)
            ->assertJsonValidationErrors('sort');
    }

    public function test_favorites_index_returns_paginated_books(): void
    {
        $member = Member::query()->findOrFail(1);
        $member->favoriteBooks()->detach();

        for ($index = 1; $index <= 17; $index++) {
            $book = Book::query()->create([
                'title' => sprintf('Perf Favorite %02d', $index),
                'author' => 'Performance Team',
                'genre' => 'A - Khoa học Tự nhiên',
                'is_digital' => false,
                'total_quantity' => 1,
                'available_quantity' => 1,
                'is_available' => true,
            ]);

            Favorite::query()->create([
                'member_id' => $member->member_id,
                'book_id' => $book->book_id,
            ]);
        }

        $token = $member->createToken('student-token', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/favorites')
            ->assertOk()
            ->assertJsonCount(15, 'data')
            ->assertJsonPath('meta.per_page', 15)
            ->assertJsonPath('meta.total', 17);
    }
}
