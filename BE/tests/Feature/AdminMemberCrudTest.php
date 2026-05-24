<?php

namespace Tests\Feature;

use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminMemberCrudTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_admin_can_create_update_and_delete_member_without_borrowing_history(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-member-access', ['role:admin']);

        $createResponse = $this->withToken($token->plainTextToken)
            ->postJson('/api/members', [
                'name' => 'Nguyen Test Member',
                'email' => 'test.member@student.hcmue.edu.vn',
                'phone_number' => '0901999999',
                'join_date' => '2026-04-19',
                'password' => 'Student123',
                'password_confirmation' => 'Student123',
            ])
            ->assertCreated()
            ->assertJsonPath('name', 'Nguyen Test Member')
            ->assertJsonPath('email', 'test.member@student.hcmue.edu.vn')
            ->assertJsonPath('phone_number', '0901999999')
            ->assertJsonPath('join_date', '2026-04-19');

        $memberId = $createResponse->json('member_id');
        $member = Member::query()->findOrFail($memberId);

        $this->assertTrue(Hash::check('Student123', $member->password));

        $this->withToken($token->plainTextToken)
            ->putJson('/api/members/'.$memberId, [
                'name' => 'Nguyen Updated Member',
                'email' => 'updated.member@student.hcmue.edu.vn',
                'phone_number' => '0901888888',
                'join_date' => '2026-04-20',
                'password' => 'Updated123',
                'password_confirmation' => 'Updated123',
            ])
            ->assertOk()
            ->assertJsonPath('name', 'Nguyen Updated Member')
            ->assertJsonPath('email', 'updated.member@student.hcmue.edu.vn')
            ->assertJsonPath('phone_number', '0901888888')
            ->assertJsonPath('join_date', '2026-04-20');

        $this->assertTrue(Hash::check('Updated123', $member->fresh()->password));

        $this->withToken($token->plainTextToken)
            ->deleteJson('/api/members/'.$memberId)
            ->assertOk()
            ->assertJson([
                'message' => 'Xóa thành viên thành công.',
            ]);

        $this->assertDatabaseMissing('members', [
            'member_id' => $memberId,
        ]);
    }

    public function test_admin_cannot_delete_member_with_borrowing_history(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('admin-member-delete-access', ['role:admin']);

        $this->withToken($token->plainTextToken)
            ->deleteJson('/api/members/1')
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Không thể xóa thành viên đã có lịch sử mượn.',
            ]);

        $this->assertDatabaseHas('members', [
            'member_id' => 1,
        ]);
    }

    public function test_students_cannot_access_admin_member_crud(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-member-crud-access', ['role:student']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/members', [
                'name' => 'Blocked Member',
                'email' => 'blocked.member@student.hcmue.edu.vn',
                'password' => 'Student123',
                'password_confirmation' => 'Student123',
            ])
            ->assertForbidden()
            ->assertJson([
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ]);
    }
}
