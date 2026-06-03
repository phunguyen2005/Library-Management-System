<?php

namespace Tests\Feature;

use App\Events\BorrowRequestApproved;
use App\Events\BorrowRequestUpdated;
use App\Mail\DueSoonNotification as DueSoonMailable;
use App\Mail\NewBookNotification as NewBookMailable;
use App\Mail\VerifyEmailOTP;
use App\Models\AuditLog;
use App\Models\Book;
use App\Models\Borrowing;
use App\Models\Fine;
use App\Models\Librarian;
use App\Models\Member;
use App\Notifications\BorrowingStatusMailNotification;
use App\Notifications\FineStatusNotification;
use App\Notifications\OverdueMailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
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

    public function test_accept_language_header_returns_vietnamese_refresh_token_messages(): void
    {
        $this->withHeader('Accept-Language', 'vi')
            ->postJson('/api/refresh', [])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Refresh token là bắt buộc.');
    }

    public function test_accept_language_header_returns_english_gamification_messages(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-check-in-localized', ['role:student']);

        $this->withHeader('Accept-Language', 'en')
            ->withToken($token->plainTextToken)
            ->postJson('/api/gamify/check-in')
            ->assertOk()
            ->assertJsonPath('message', 'Check-in successful!');
    }

    public function test_notifications_are_rendered_from_translation_keys_for_current_locale(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-notifications-localized', ['role:student']);

        DB::table('notifications')->insert([
            'id' => (string) Str::uuid(),
            'type' => 'App\\Notifications\\AppDueSoonNotification',
            'notifiable_type' => Member::class,
            'notifiable_id' => $member->member_id,
            'data' => json_encode([
                'type' => 'due_soon',
                'message_key' => 'messages.notifications.due_soon.message',
                'message_params' => [
                    'book_title' => 'Clean Code',
                    'due_date' => '06/06/2026',
                ],
                'message' => 'Sách "Clean Code" sắp đến hạn trả vào ngày 06/06/2026.',
            ], JSON_THROW_ON_ERROR),
            'read_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeader('Accept-Language', 'en')
            ->withToken($token->plainTextToken)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.data.message', 'Book "Clean Code" is due soon on 06/06/2026.');

        $this->withHeader('Accept-Language', 'vi')
            ->withToken($token->plainTextToken)
            ->getJson('/api/notifications')
            ->assertOk()
            ->assertJsonPath('data.0.data.message', 'Sách "Clean Code" sắp đến hạn trả vào ngày 06/06/2026.');
    }

    public function test_mail_notifications_use_current_backend_locale(): void
    {
        $member = Member::query()->findOrFail(1);

        $fine = Fine::query()->create([
            'loan_id' => 1,
            'member_id' => $member->member_id,
            'amount' => 40000,
            'reason' => 'overdue',
            'status' => 'paid',
        ]);

        App::setLocale('en');

        $mail = (new FineStatusNotification($fine->load('borrowing.book'), Fine::STATUS_PAID))
            ->toMail($member);

        $this->assertSame('[HCMUE Digital Library] Fine payment confirmed', $mail->subject);
    }

    public function test_otp_mailable_keeps_captured_locale_for_subject_and_view(): void
    {
        App::setLocale('en');
        $mailable = new VerifyEmailOTP('123456');

        App::setLocale('vi');

        $this->assertSame('Verify your email address - HCMUE Library', $mailable->envelope()->subject);
        $this->assertStringContainsString('Email verification', $mailable->render());
        $this->assertStringContainsString('Thank you for registering an account with HCMUE Digital Library.', $mailable->render());
    }

    public function test_book_mailables_keep_captured_locale_for_subject_and_view(): void
    {
        $borrowing = $this->localizedBorrowingFixture();

        App::setLocale('en');
        $dueSoon = new DueSoonMailable($borrowing);
        $newBook = new NewBookMailable($borrowing->book, $borrowing->member);

        App::setLocale('vi');

        $this->assertSame('Reminder: Book due date is approaching', $dueSoon->envelope()->subject);
        $this->assertStringContainsString('Book borrowed', $dueSoon->render());

        $this->assertSame('New book at HCMUE Library: Localized Mail Book', $newBook->envelope()->subject);
        $this->assertStringContainsString('New book at the library!', $newBook->render());
    }

    public function test_legacy_mail_notifications_keep_captured_locale(): void
    {
        $borrowing = $this->localizedBorrowingFixture();

        App::setLocale('en');
        $approvedNotification = new BorrowingStatusMailNotification($borrowing, Borrowing::STATUS_APPROVED);
        $returnedNotification = new BorrowingStatusMailNotification($borrowing, Borrowing::STATUS_RETURNED);
        $overdueNotification = new OverdueMailNotification($borrowing);

        App::setLocale('vi');

        $approvedMail = $approvedNotification->toMail($borrowing->member);
        $returnedMail = $returnedNotification->toMail($borrowing->member);
        $overdueMail = $overdueNotification->toMail($borrowing->member);

        $this->assertSame('[HCMUE Digital Library] Borrow request approved', $approvedMail->subject);
        $this->assertSame('Dear '.$borrowing->member->name.',', $approvedMail->greeting);
        $this->assertStringContainsString('has been approved', (string) $approvedMail->introLines[0]);

        $this->assertSame(
            '[HCMUE Digital Library] You returned "Localized Mail Book" - Share your review and earn rewards',
            $returnedMail->subject
        );
        $this->assertSame('Book return completed', $returnedMail->viewData['copy']['header_subtitle']);

        $this->assertSame('[HCMUE Digital Library] OVERDUE WARNING: Urgent item return required', $overdueMail->subject);
        $this->assertStringContainsString('past the required return deadline', (string) $overdueMail->introLines[0]);
    }

    public function test_broadcast_events_include_translation_keys_and_localized_fallback_message(): void
    {
        $borrowing = $this->localizedBorrowingFixture();

        App::setLocale('en');

        $approvedPayload = (new BorrowRequestApproved($borrowing))->broadcastWith();
        $updatedPayload = (new BorrowRequestUpdated($borrowing))->broadcastWith();

        $this->assertSame('messages.events.borrow_request_approved', $approvedPayload['message_key']);
        $this->assertSame(['book_title' => 'Localized Mail Book'], $approvedPayload['message_params']);
        $this->assertSame(
            'Your borrow request for "Localized Mail Book" has been approved. You can pick up the book now.',
            $approvedPayload['message']
        );

        $this->assertSame('messages.events.borrow_request_updated', $updatedPayload['message_key']);
        $this->assertSame('Borrow request status has been updated.', $updatedPayload['message']);
    }

    public function test_audit_log_labels_follow_accept_language(): void
    {
        $admin = Librarian::query()->findOrFail(1);
        $token = $admin->createToken('audit-log-localized', ['role:admin']);

        AuditLog::query()->create([
            'user_id' => null,
            'user_type' => 'system',
            'action' => 'book_create',
            'description' => 'Đã thêm tài liệu mới: Localized Mail Book (ID: 999)',
            'ip_address' => '127.0.0.1',
            'user_agent' => 'LocalizationTest',
        ]);

        $this->withHeader('Accept-Language', 'en')
            ->withToken($token->plainTextToken)
            ->getJson('/api/audit-logs')
            ->assertOk()
            ->assertJsonPath('data.0.user_type', 'System')
            ->assertJsonPath('data.0.user_type_key', 'messages.audit.user_type.system')
            ->assertJsonPath('data.0.action', 'Add book')
            ->assertJsonPath('data.0.action_key', 'messages.audit.action.book_create')
            ->assertJsonPath('data.0.raw_action', 'book_create');
    }

    public function test_zh_ja_ko_locales(): void
    {
        $member = Member::query()->findOrFail(1);
        $token = $member->createToken('student-access', ['role:student']);

        // 1. Check Simplified Chinese (zh)
        $this->withHeader('Accept-Language', 'zh')
            ->postJson('/api/login', [
                'identifier' => 'missing-account@example.com',
                'password' => 'Library@2026',
            ])
            ->assertStatus(401)
            ->assertJsonPath('message', '登录信息不正确。');

        $this->withHeader('Accept-Language', 'zh')
            ->withToken($token->plainTextToken)
            ->putJson('/api/me', [
                'name' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name'])
            ->assertJsonPath('errors.name.0', '请输入姓名。');

        // 2. Check Japanese (ja)
        $this->withHeader('Accept-Language', 'ja')
            ->postJson('/api/login', [
                'identifier' => 'missing-account@example.com',
                'password' => 'Library@2026',
            ])
            ->assertStatus(401)
            ->assertJsonPath('message', 'ログイン情報が正しくありません。');

        $this->withHeader('Accept-Language', 'ja')
            ->withToken($token->plainTextToken)
            ->putJson('/api/me', [
                'name' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name'])
            ->assertJsonPath('errors.name.0', '氏名を入力してください。');

        // 3. Check Korean (ko)
        $this->withHeader('Accept-Language', 'ko')
            ->postJson('/api/login', [
                'identifier' => 'missing-account@example.com',
                'password' => 'Library@2026',
            ])
            ->assertStatus(401)
            ->assertJsonPath('message', '로그인 정보가 정확하지 않습니다.');

        $this->withHeader('Accept-Language', 'ko')
            ->withToken($token->plainTextToken)
            ->putJson('/api/me', [
                'name' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name'])
            ->assertJsonPath('errors.name.0', '성명 필수 항목입니다. 입력해 주세요.');
    }

    private function localizedBorrowingFixture(): Borrowing
    {
        $member = Member::query()->findOrFail(1);

        $book = Book::query()->create([
            'title' => 'Localized Mail Book',
            'author' => 'I18n Author',
            'genre' => 'Reference',
            'published_year' => 2026,
            'is_available' => true,
            'cover' => null,
            'location' => 'Shelf I18N',
            'is_digital' => false,
            'resource_type' => null,
            'file_format' => null,
            'file_size' => null,
            'download_count' => 0,
            'total_quantity' => 1,
            'available_quantity' => 1,
        ]);

        return Borrowing::query()->create([
            'book_id' => $book->book_id,
            'member_id' => $member->member_id,
            'librarian_id' => null,
            'status' => Borrowing::STATUS_BORROWED,
            'borrow_date' => '2026-06-01',
            'due_date' => '2026-06-06',
            'return_date' => null,
        ])->load(['book', 'member']);
    }
}
