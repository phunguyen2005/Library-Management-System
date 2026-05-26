<?php

namespace Tests\Feature;

use App\Models\Librarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_admin_profile_response_includes_librarian_id(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-profile-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.librarian_id', 1)
            ->assertJsonPath('user.email', 'nguyen.van.an@hcmue.edu.vn');
    }

    public function test_profile_update_ignores_email_changes(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-profile-update-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->putJson('/api/me', [
                'name' => 'Nguyễn Văn An Updated',
                'email' => 'changed.admin@hcmue.edu.vn',
                'phone_number' => '0901999999',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Cập nhật hồ sơ thành công.')
            ->assertJsonPath('user.name', 'Nguyễn Văn An Updated')
            ->assertJsonPath('user.email', 'nguyen.van.an@hcmue.edu.vn')
            ->assertJsonPath('user.phone_number', '0901999999');

        $this->assertDatabaseHas('librarians', [
            'librarian_id' => 1,
            'email' => 'nguyen.van.an@hcmue.edu.vn',
        ]);
        $this->assertSame('0901999999', $librarian->fresh()->phone_number);
        $this->assertDatabaseMissing('librarians', [
            'email' => 'changed.admin@hcmue.edu.vn',
        ]);
    }

    public function test_profile_update_can_change_password_with_current_password(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-profile-password-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->putJson('/api/me', [
                'name' => $librarian->name,
                'phone_number' => $librarian->phone_number,
                'current_password' => 'Library@2026',
                'password' => 'NewPass123',
                'password_confirmation' => 'NewPass123',
            ])
            ->assertOk()
            ->assertJsonPath('message', 'Cập nhật hồ sơ thành công.');

        $this->assertTrue(Hash::check('NewPass123', $librarian->fresh()->password));
    }
}
