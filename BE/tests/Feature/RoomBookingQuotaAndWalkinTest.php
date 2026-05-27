<?php

namespace Tests\Feature;

use App\Models\Librarian;
use App\Models\LibrarySetting;
use App\Models\Member;
use App\Models\Room;
use App\Models\RoomBooking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoomBookingQuotaAndWalkinTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected function setUp(): void
    {
        parent::setUp();
        \Carbon\Carbon::setTestNow('2026-05-28 10:00:00'); // Thursday
    }

    protected function tearDown(): void
    {
        \Carbon\Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_student_cannot_exceed_weekly_quota(): void
    {
        $settings = LibrarySetting::singleton();
        $settings->forceFill([
            'room_max_hours_per_week' => 4,
            'room_max_hours_per_booking' => 3,
            'room_booking_requires_approval' => false,
        ])->save();

        $room = Room::query()->firstOrFail();
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('weekly-quota-test', ['role:student'])->plainTextToken;

        // Existing booking of 3 hours on Monday of next week
        $nextMonday = now()->next('Monday')->format('Y-m-d');
        RoomBooking::query()->create([
            'room_id' => $room->room_id,
            'member_id' => $member->member_id,
            'date' => $nextMonday,
            'start_time' => '09:00',
            'end_time' => '12:00', // 3 hours
            'purpose' => 'Study 1',
            'group_size' => 2,
            'status' => RoomBooking::STATUS_APPROVED,
            'booking_code' => 'TEST01',
        ]);

        // Attempting to book another 1.5 hours on Wednesday of the same week (total 4.5 hours) should fail
        $nextWednesday = now()->next('Monday')->addDays(2)->format('Y-m-d');
        $this->withToken($token)
            ->postJson('/api/room-bookings', [
                'room_id' => $room->room_id,
                'date' => $nextWednesday,
                'start_time' => '13:00',
                'end_time' => '14:30', // 1.5 hours
                'group_size' => 2,
                'purpose' => 'Study 2',
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Tổng thời gian đặt phòng trong tuần này của bạn vượt quá hạn ngạch cho phép là 4 tiếng (Đã đặt: 3 tiếng, Đăng ký thêm: 1.5 tiếng).'
            ]);

        // Attempting to book 1 hour on Wednesday of the same week (total 4 hours) should succeed
        $this->withToken($token)
            ->postJson('/api/room-bookings', [
                'room_id' => $room->room_id,
                'date' => $nextWednesday,
                'start_time' => '13:00',
                'end_time' => '14:00', // 1 hour
                'group_size' => 2,
                'purpose' => 'Study 3',
            ])
            ->assertStatus(201);
    }

    public function test_student_walkin_booking_mechanism(): void
    {
        $settings = LibrarySetting::singleton();
        $settings->forceFill([
            'room_min_group_size' => 3, // require 3 normally
            'room_booking_requires_approval' => true, // require approval normally
        ])->save();

        $room = Room::query()->firstOrFail();
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('walkin-test', ['role:student'])->plainTextToken;

        // Perform walkin booking
        $response = $this->withToken($token)
            ->postJson('/api/room-bookings', [
                'room_id' => $room->room_id,
                'is_walkin' => true,
                'end_time' => now()->addHour()->format('H:i'), // 1 hour from now
                'group_size' => 1, // bypasses min_group_size of 3!
                'purpose' => 'Walkin study',
            ]);

        $response->assertStatus(201);
        $booking = $response->json();

        $this->assertTrue($booking['is_walkin']);
        $this->assertSame(RoomBooking::STATUS_APPROVED, $booking['status']); // Bypasses requires_approval
        $this->assertNotNull($booking['check_in_at']); // Auto check-in
        $this->assertSame(now()->format('Y-m-d'), $booking['date']); // Locked to today
    }

    public function test_librarian_can_book_on_behalf_of_student(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        // Ensure librarian has manage_rooms permission
        $token = $librarian->createToken('librarian-behalf-test', ['role:librarian'])->plainTextToken;

        $room = Room::query()->firstOrFail();
        $member = Member::query()->findOrFail(2); // target student

        // Post as librarian
        $this->withToken($token)
            ->postJson('/api/room-bookings', [
                'room_id' => $room->room_id,
                'member_id' => $member->member_id, // specify student
                'is_walkin' => true,
                'end_time' => now()->addHour()->format('H:i'),
                'group_size' => 1,
                'purpose' => 'Librarian walkin',
            ])
            ->assertStatus(201)
            ->assertJsonPath('member_id', $member->member_id);
    }
}
