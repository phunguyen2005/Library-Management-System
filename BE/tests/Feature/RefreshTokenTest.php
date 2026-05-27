<?php

namespace Tests\Feature;

use App\Models\Librarian;
use App\Models\Member;
use App\Models\RefreshToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RefreshTokenTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_login_generates_access_token_and_refresh_token(): void
    {
        $password = 'Library@2026';
        $member = Member::query()->findOrFail(1);
        $member->forceFill([
            'email' => 'student-refresh@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
        ])->save();

        $response = $this->postJson('/api/login', [
            'identifier' => 'student-refresh@example.com',
            'password' => $password,
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'refresh_token'])
            ->assertCookie('refresh_token');

        $plainRefreshToken = $response->json('refresh_token');
        $this->assertNotEmpty($plainRefreshToken);

        // Verify it was hashed and saved in database
        $this->assertDatabaseHas('refresh_tokens', [
            'user_id' => $member->member_id,
            'user_type' => 'student',
            'token_hash' => hash('sha256', $plainRefreshToken),
        ]);
    }

    public function test_refresh_token_rotation_works_correctly(): void
    {
        $password = 'Library@2026';
        $member = Member::query()->findOrFail(1);
        $member->forceFill([
            'email' => 'student-refresh2@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
        ])->save();

        $response = $this->postJson('/api/login', [
            'identifier' => 'student-refresh2@example.com',
            'password' => $password,
        ]);

        $response->assertOk();
        $oldPlainRefreshToken = $response->json('refresh_token');

        // Call /refresh with the old refresh token
        $refreshResponse = $this->postJson('/api/refresh', [
            'refresh_token' => $oldPlainRefreshToken,
        ]);

        $refreshResponse->assertOk()
            ->assertJsonStructure(['token', 'refresh_token'])
            ->assertCookie('refresh_token');

        $newPlainRefreshToken = $refreshResponse->json('refresh_token');

        $this->assertNotEquals($oldPlainRefreshToken, $newPlainRefreshToken);

        // Old token should be deleted
        $this->assertDatabaseMissing('refresh_tokens', [
            'token_hash' => hash('sha256', $oldPlainRefreshToken),
        ]);

        // New token should exist
        $this->assertDatabaseHas('refresh_tokens', [
            'user_id' => $member->member_id,
            'user_type' => 'student',
            'token_hash' => hash('sha256', $newPlainRefreshToken),
        ]);
    }

    public function test_expired_refresh_token_is_rejected(): void
    {
        $plainRefreshToken = \Illuminate\Support\Str::random(64);
        RefreshToken::create([
            'user_id' => 1,
            'user_type' => 'student',
            'token_hash' => hash('sha256', $plainRefreshToken),
            'expires_at' => now()->subMinutes(1),
        ]);

        $response = $this->postJson('/api/refresh', [
            'refresh_token' => $plainRefreshToken,
        ]);

        $response->assertStatus(401)
            ->assertJsonFragment(['message' => 'Refresh token is invalid or expired.']);

        // Check if deleted
        $this->assertDatabaseMissing('refresh_tokens', [
            'token_hash' => hash('sha256', $plainRefreshToken),
        ]);
    }

    public function test_invalid_refresh_token_is_rejected(): void
    {
        $response = $this->postJson('/api/refresh', [
            'refresh_token' => 'non-existent-token-value-here-1234567890',
        ]);

        $response->assertStatus(401)
            ->assertJsonFragment(['message' => 'Refresh token is invalid or expired.']);
    }

    public function test_logout_invalidates_refresh_token(): void
    {
        $password = 'Library@2026';
        $member = Member::query()->findOrFail(1);
        $member->forceFill([
            'email' => 'student-logout@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
        ])->save();

        $response = $this->postJson('/api/login', [
            'identifier' => 'student-logout@example.com',
            'password' => $password,
        ]);

        $token = $response->json('token');
        $plainRefreshToken = $response->json('refresh_token');

        $this->assertDatabaseHas('refresh_tokens', [
            'token_hash' => hash('sha256', $plainRefreshToken),
        ]);

        // Logout
        $logoutResponse = $this->withToken($token)
            ->postJson('/api/logout', [
                'refresh_token' => $plainRefreshToken,
            ]);

        $logoutResponse->assertOk();

        // Refresh token should be deleted
        $this->assertDatabaseMissing('refresh_tokens', [
            'token_hash' => hash('sha256', $plainRefreshToken),
        ]);
    }
}
