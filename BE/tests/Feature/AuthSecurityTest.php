<?php

namespace Tests\Feature;

use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_login_is_throttled_after_repeated_failures(): void
    {
        $payload = [
            'role' => 'student',
            'identifier' => 'throttle-check@example.com',
            'password' => 'wrong-password',
        ];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', $payload)->assertStatus(401)->assertJson([
                'message' => 'Thông tin đăng nhập không đúng.',
            ]);
        }

        $this->postJson('/api/login', $payload)
            ->assertStatus(429);
    }

    public function test_unauthenticated_api_requests_return_standardized_401(): void
    {
        $this->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Vui lòng đăng nhập để tiếp tục.',
            ]);
    }

    public function test_role_mismatches_return_standardized_403(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/members')
            ->assertForbidden()
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }

    public function test_expired_sanctum_token_is_rejected(): void
    {
        config(['sanctum.expiration' => 1]);

        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('expired-access', ['role:student']);

        DB::table('personal_access_tokens')
            ->where('id', $token->accessToken->id)
            ->update([
                'created_at' => now()->subMinutes(5),
            ]);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJson([
                'message' => 'Vui lòng đăng nhập để tiếp tục.',
            ]);
    }
}
