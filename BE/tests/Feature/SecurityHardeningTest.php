<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\FinePayment;
use App\Models\Librarian;
use App\Models\LibrarySetting;
use App\Models\Member;
use App\Models\Room;
use App\Models\RoomBooking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_oauth_callback_requires_cached_state_before_resolving_provider_user(): void
    {
        $this->get('/api/auth/google/callback?state=missing-state')
            ->assertRedirect('http://localhost:3000/oauth-callback?error=InvalidState');
    }

    public function test_librarian_email_prefix_does_not_grant_admin_without_database_role(): void
    {
        $originalEnv = app()['env'];
        app()->instance('env', 'production');

        try {
            $librarian = Librarian::query()->create([
                'name' => 'Prefix Attacker',
                'email' => 'phunguyen2005.attacker@hcmue.edu.vn',
                'password' => Hash::make('Library@2026'),
                'phone_number' => '0909000000',
                'hire_date' => today()->toDateString(),
            ]);

            $this->assertSame('librarian', $librarian->getRoleName());
        } finally {
            app()->instance('env', $originalEnv);
        }
    }

    public function test_registration_accepts_external_email(): void
    {
        $this->postJson('/api/register', [
            'name' => 'External Student',
            'email' => 'external.student@gmail.com',
            'password' => 'Library2026',
            'password_confirmation' => 'Library2026',
            'phone_number' => '0900111222',
        ])->assertStatus(201)
            ->assertJsonPath('require_otp', true);
    }

    public function test_failed_logins_are_audited_for_unknown_email_and_wrong_password(): void
    {
        $this->postJson('/api/login', [
            'identifier' => 'missing.audit@student.hcmue.edu.vn',
            'password' => 'Library@2026',
        ])->assertUnauthorized();

        $member = Member::query()->findOrFail(1);
        $member->forceFill([
            'email' => 'audit-target@student.hcmue.edu.vn',
            'email_verified_at' => now(),
            'password' => Hash::make('Library@2026'),
        ])->save();

        $this->postJson('/api/login', [
            'identifier' => 'audit-target@student.hcmue.edu.vn',
            'password' => 'WrongPassword2026',
        ])->assertUnauthorized();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'failed_login',
            'user_id' => null,
            'user_type' => null,
        ]);

        $this->assertSame(2, DB::table('audit_logs')->where('action', 'failed_login')->count());
    }

    public function test_security_config_uses_restricted_cors_origins_and_short_token_lifetime(): void
    {
        $this->assertSame(120, (int) config('sanctum.expiration'));
        $this->assertNotContains('*', config('cors.allowed_origins'));
    }

    public function test_digital_documents_require_authenticated_user(): void
    {
        $this->getJson('/api/digital-documents')
            ->assertUnauthorized();
    }

    public function test_ai_chat_requests_are_rate_limited(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('ai-rate-limit', ['role:student'])->plainTextToken;

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->withToken($token)
                ->postJson('/api/ai/chat', ['message' => 'hello'])
                ->assertOk();
        }

        $this->withToken($token)
            ->postJson('/api/ai/chat', ['message' => 'hello'])
            ->assertTooManyRequests();
    }

    public function test_momo_ipn_rejects_successful_payment_when_amount_does_not_match_record(): void
    {
        $member = Member::query()->findOrFail(1);
        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => $member->member_id,
            'amount' => 50000,
            'reason' => Fine::REASON_OVERDUE,
            'status' => Fine::STATUS_UNPAID,
        ]);
        $payment = FinePayment::query()->create([
            'fine_id' => $fine->fine_id,
            'amount_paid' => 50000,
            'method' => FinePayment::METHOD_MOMO,
            'transaction_ref' => 'FINE_PAY_SECURITY_123456',
            'status' => FinePayment::STATUS_PENDING,
        ]);

        $this->postJson('/api/momo/ipn', $this->signedMomoPayload($payment, 1000))
            ->assertStatus(400);

        $this->assertDatabaseHas('fine_payments', [
            'payment_id' => $payment->payment_id,
            'status' => FinePayment::STATUS_PENDING,
        ]);
        $this->assertDatabaseHas('fines', [
            'fine_id' => $fine->fine_id,
            'status' => Fine::STATUS_UNPAID,
        ]);
    }

    public function test_phone_numbers_are_encrypted_at_rest_and_decrypted_on_model_access(): void
    {
        $member = Member::query()->create([
            'name' => 'Encrypted Phone Student',
            'email' => 'encrypted.phone@student.hcmue.edu.vn',
            'password' => Hash::make('Library@2026'),
            'phone_number' => '0900111222',
            'join_date' => today()->toDateString(),
        ]);

        $rawPhoneNumber = DB::table('members')
            ->where('member_id', $member->member_id)
            ->value('phone_number');

        $this->assertNotSame('0900111222', $rawPhoneNumber);
        $this->assertSame('0900111222', $member->fresh()->phone_number);
    }

    public function test_report_export_escapes_csv_formula_fields(): void
    {
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('report-export-security', ['role:admin'])->plainTextToken;

        $book = Book::query()->create([
            'title' => '=HYPERLINK("http://evil.test")',
            'author' => '+Injected Author',
            'genre' => '@Injected Genre',
            'published_year' => 2026,
            'is_available' => true,
            'location' => 'Security Shelf',
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);
        Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => 1,
            'status' => Borrowing::STATUS_RETURNED,
            'borrow_date' => today()->toDateString(),
            'due_date' => today()->addDays(14)->toDateString(),
            'return_date' => today()->toDateString(),
        ]);

        $content = $this->withToken($token)
            ->get('/api/reports/export')
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString('\'=HYPERLINK', $content);
        $this->assertStringContainsString('\'+Injected Author', $content);
        $this->assertStringContainsString('\'@Injected Genre', $content);
    }

    public function test_approved_loans_count_towards_active_borrow_limit(): void
    {
        LibrarySetting::singleton()->forceFill(['max_active_loans' => 1])->save();

        $member = Member::query()->findOrFail(4);
        $token = $member->createToken('approved-loan-limit', ['role:student'])->plainTextToken;

        $approvedBook = $this->createPhysicalBook('Already Approved Book');
        $newBook = $this->createPhysicalBook('Second Requested Book');

        Borrowing::query()->create([
            'book_id' => $approvedBook->book_id,
            'member_id' => $member->member_id,
            'status' => Borrowing::STATUS_APPROVED,
            'borrow_date' => today()->toDateString(),
        ]);

        $this->withToken($token)
            ->postJson('/api/requests', ['book_id' => $newBook->book_id])
            ->assertStatus(422)
            ->assertJsonStructure(['message']);
    }

    public function test_admin_can_approve_pending_room_booking_after_conflict_check(): void
    {
        $room = Room::query()->firstOrFail();
        $member = Member::query()->findOrFail(1);
        $librarian = Librarian::query()->findOrFail(1);
        $token = $librarian->createToken('room-approval-security', ['role:admin'])->plainTextToken;

        $booking = RoomBooking::query()->create([
            'room_id' => $room->room_id,
            'member_id' => $member->member_id,
            'date' => today()->addDays(1)->toDateString(),
            'start_time' => '09:00',
            'end_time' => '10:00',
            'purpose' => 'Security review study',
            'group_size' => 2,
            'status' => RoomBooking::STATUS_PENDING,
            'booking_code' => 'SEC123',
        ]);

        $this->withToken($token)
            ->postJson("/api/admin/room-bookings/{$booking->booking_id}/approve")
            ->assertOk()
            ->assertJsonPath('status', RoomBooking::STATUS_APPROVED);
    }

    private function createPhysicalBook(string $title): Book
    {
        return Book::query()->create([
            'title' => $title,
            'author' => 'Security Test',
            'genre' => 'Security',
            'published_year' => 2026,
            'is_available' => true,
            'location' => 'Security Shelf',
            'is_digital' => false,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);
    }

    private function signedMomoPayload(FinePayment $payment, int $amount): array
    {
        $config = config('services.momo');
        $payload = [
            'partnerCode' => $config['partner_code'],
            'orderId' => $payment->transaction_ref,
            'requestId' => $payment->transaction_ref,
            'amount' => $amount,
            'orderInfo' => 'Security payment test',
            'orderType' => 'momo_wallet',
            'transId' => 'MOMOSEC123',
            'resultCode' => 0,
            'message' => 'Successful.',
            'payType' => 'qr',
            'responseTime' => (string) now()->timestamp,
            'extraData' => '',
        ];

        $rawHash = 'accessKey=' . $config['access_key'] .
            '&amount=' . $payload['amount'] .
            '&extraData=' . $payload['extraData'] .
            '&message=' . $payload['message'] .
            '&orderId=' . $payload['orderId'] .
            '&orderInfo=' . $payload['orderInfo'] .
            '&orderType=' . $payload['orderType'] .
            '&partnerCode=' . $payload['partnerCode'] .
            '&payType=' . $payload['payType'] .
            '&requestId=' . $payload['requestId'] .
            '&responseTime=' . $payload['responseTime'] .
            '&resultCode=' . $payload['resultCode'] .
            '&transId=' . $payload['transId'];

        $payload['signature'] = hash_hmac('sha256', $rawHash, $config['secret_key']);

        return $payload;
    }
}
