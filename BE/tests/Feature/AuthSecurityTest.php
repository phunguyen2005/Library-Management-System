<?php

namespace Tests\Feature;

use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_login_is_throttled_after_repeated_failures(): void
    {
        $payload = [
            'identifier' => 'throttle-check@example.com',
            'password' => 'wrong-password',
        ];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/login', $payload)
                ->assertStatus(401)
                ->assertJsonStructure(['message']);
        }

        $this->postJson('/api/login', $payload)
            ->assertStatus(429);
    }

    public function test_student_can_login_with_email_without_role(): void
    {
        $password = 'Library@2026';
        $member = Member::query()->findOrFail(1);
        $member->forceFill([
            'email' => 'student-login@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make($password),
        ])->save();

        $response = $this->postJson('/api/login', [
            'identifier' => 'student-login@example.com',
            'password' => $password,
        ]);

        $response->assertOk()
            ->assertJsonPath('role', 'student')
            ->assertJsonPath('user.email', 'student-login@example.com')
            ->assertJsonStructure(['token']);

        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('role', 'student');
    }

    public function test_admin_can_login_with_email_without_role(): void
    {
        $password = 'Library@2026';
        $librarian = Librarian::query()->findOrFail(1);
        $librarian->forceFill([
            'email' => 'admin-login@example.com',
            'password' => Hash::make($password),
        ])->save();

        $response = $this->postJson('/api/login', [
            'identifier' => 'admin-login@example.com',
            'password' => $password,
        ]);

        $response->assertOk()
            ->assertJsonPath('role', 'admin')
            ->assertJsonPath('user.email', 'admin-login@example.com')
            ->assertJsonStructure(['token']);

        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('role', 'admin');
    }

    public function test_unknown_email_returns_safe_401(): void
    {
        $this->postJson('/api/login', [
            'identifier' => 'missing-account@example.com',
            'password' => 'Library@2026',
        ])->assertStatus(401)->assertJsonStructure(['message']);
    }

    public function test_wrong_password_returns_safe_401(): void
    {
        $member = Member::query()->findOrFail(2);
        $member->forceFill([
            'email' => 'wrong-password@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('Library@2026'),
        ])->save();

        $this->postJson('/api/login', [
            'identifier' => 'wrong-password@example.com',
            'password' => 'not-the-password',
        ])->assertStatus(401)->assertJsonStructure(['message']);
    }

    public function test_unverified_student_login_requires_otp_without_role(): void
    {
        $password = 'Library@2026';
        $member = Member::query()->findOrFail(3);
        $member->forceFill([
            'email' => 'needs-otp@example.com',
            'email_verified_at' => null,
            'password' => Hash::make($password),
        ])->save();

        $this->postJson('/api/login', [
            'identifier' => 'needs-otp@example.com',
            'password' => $password,
        ])->assertStatus(403)->assertJson([
            'email' => 'needs-otp@example.com',
            'require_otp' => true,
        ]);
    }

    public function test_duplicate_email_across_member_and_librarian_is_rejected_safely(): void
    {
        $password = 'Library@2026';
        $email = 'role-collision@example.com';

        Member::query()->findOrFail(4)->forceFill([
            'email' => $email,
            'email_verified_at' => now(),
            'password' => Hash::make($password),
        ])->save();

        Librarian::query()->findOrFail(2)->forceFill([
            'email' => $email,
            'password' => Hash::make($password),
        ])->save();

        $this->postJson('/api/login', [
            'identifier' => $email,
            'password' => $password,
        ])->assertStatus(401)->assertJsonStructure(['message']);
    }

    public function test_unauthenticated_api_requests_return_standardized_401(): void
    {
        $this->getJson('/api/me')
            ->assertUnauthorized()
            ->assertJsonStructure(['message']);
    }

    public function test_role_mismatches_return_standardized_403(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/members')
            ->assertForbidden()
            ->assertJsonStructure(['message']);
    }

    public function test_admins_cannot_access_student_request_routes(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/requests/me')
            ->assertForbidden()
            ->assertJsonStructure(['message']);
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
            ->assertJsonStructure(['message']);
    }
}
