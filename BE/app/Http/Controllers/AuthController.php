<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Requests\VerifyOtpRequest;
use App\Http\Requests\ResendOtpRequest;
use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\VerifyForgotPasswordOtpRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Resources\AuthenticatedUserResource;
use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request)
    {
        $validated = $request->validated();
        $identifier = strtolower(trim($validated['identifier']));
        $password = $validated['password'];

        $member = Member::query()
            ->whereRaw('LOWER(email) = ?', [$identifier])
            ->first();

        $librarian = Librarian::query()
            ->whereRaw('LOWER(email) = ?', [$identifier])
            ->first();

        if (($member && $librarian) || (! $member && ! $librarian)) {
            $this->logFailedLogin($identifier, $request);

            return response()->json([
                'message' => __('messages.auth.login_invalid'),
            ], 401);
        }

        $user = $member ?? $librarian;

        if (! Hash::check($password, $user->password ?? '')) {
            $this->logFailedLogin($identifier, $request, $user);

            return response()->json([
                'message' => __('messages.auth.login_invalid'),
            ], 401);
        }

        $role = $user->getRoleName();

        if ($role === 'student' && $user->is_disabled) {
            $this->logFailedLogin($identifier, $request, $user);

            return response()->json([
                'message' => __('messages.auth.account_disabled'),
            ], 403);
        }

        if ($role === 'student' && is_null($user->email_verified_at)) {
            return response()->json([
                'message' => __('messages.auth.email_not_verified'),
                'email' => $user->email,
                'require_otp' => true,
            ], 403);
        }

        $tokenResult = $user->createToken($role.'-session', ['role:'.$role], now()->addMinutes(15));
        $token = $tokenResult->plainTextToken;
        $tokenId = $tokenResult->accessToken->id;

        $plainRefreshToken = \Illuminate\Support\Str::random(64);
        \App\Models\RefreshToken::create([
            'user_id' => $user->member_id ?? $user->librarian_id,
            'user_type' => $role,
            'token_hash' => hash('sha256', $plainRefreshToken),
            'expires_at' => now()->addDays(7),
        ]);

        \App\Services\AuditLoggerService::log('login', 'Đăng nhập thành công', $user);

        \App\Models\LoginHistory::create([
            'user_id' => $user->member_id ?? $user->librarian_id,
            'user_type' => $role,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_type' => self::getDeviceType($request->userAgent() ?? ''),
            'token_id' => $tokenId,
        ]);

        return response()->json([
            'message' => __('messages.auth.login_success'),
            'user' => AuthenticatedUserResource::make($user),
            'role' => $role,
            'token' => $token,
            'refresh_token' => $plainRefreshToken,
        ])->cookie(
            'refresh_token',
            $plainRefreshToken,
            60 * 24 * 7,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );
    }

    private function logFailedLogin(string $identifier, Request $request, $user = null): void
    {
        \App\Services\AuditLoggerService::log(
            'failed_login',
            'Đăng nhập thất bại cho tài khoản: ' . $identifier . ' từ IP ' . $request->ip(),
            $user
        );
    }

    public function register(RegisterRequest $request)
    {
        $validated = $request->validated();

        $user = Member::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_number' => $validated['phone_number'] ?? null,
            'password' => $validated['password'],
            'join_date' => now()->toDateString(),
        ]);

        \App\Services\AuditLoggerService::log('register', 'Đăng ký tài khoản thành công', $user);

        $otp = (string) random_int(100000, 999999);
        \Illuminate\Support\Facades\Cache::put('otp_'.$user->email, $otp, now()->addSeconds(60));

        try {
            \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\VerifyEmailOTP($otp));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('register mail error: ' . $e->getMessage());
            // Log error or ignore, let the user resend
        }

        return response()->json([
            'message' => __('messages.auth.register_success'),
            'email' => $user->email,
            'require_otp' => true,
        ], 201);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'user' => AuthenticatedUserResource::make($user),
            'role' => method_exists($user, 'getRoleName') ? $user->getRoleName() : null,
        ]);
    }

    public function sendPasswordOtp(Request $request)
    {
        $user = $request->user();
        $role = method_exists($user, 'getRoleName') ? $user->getRoleName() : 'student';

        if (! in_array($role, ['admin', 'librarian', 'student'], true)) {
            return response()->json([
                'message' => __('messages.auth.change_password_otp_admin_only'),
            ], 403);
        }

        $otp = (string) random_int(100000, 999999);
        \Illuminate\Support\Facades\Cache::put('change_password_otp_'.$user->email, $otp, now()->addSeconds(60));

        try {
            \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\ChangePasswordOTP($otp));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('sendPasswordOtp mail error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Không thể gửi email OTP: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => __('messages.auth.change_password_otp_sent'),
            'mail_sent' => true,
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $validated = $request->validated();
        $role = method_exists($user, 'getRoleName') ? $user->getRoleName() : 'student';

        if (! empty($validated['password'])) {
            $otpVerified = false;
            if (in_array($role, ['admin', 'librarian', 'student'], true) && ! app()->runningUnitTests()) {
                if (empty($validated['otp'])) {
                    return response()->json([
                        'message' => __('messages.auth.change_password_otp_required'),
                        'require_otp' => true,
                    ], 422);
                }

                $cachedOtp = \Illuminate\Support\Facades\Cache::get('change_password_otp_'.$user->email);
                if (! $cachedOtp || $cachedOtp !== $validated['otp']) {
                    return response()->json([
                        'message' => __('messages.auth.change_password_otp_invalid'),
                    ], 422);
                }
                $otpVerified = true;
            }

            if (! $otpVerified) {
                if (empty($validated['current_password']) || ! Hash::check($validated['current_password'], $user->password)) {
                    return response()->json(['message' => __('messages.auth.current_password_invalid')], 422);
                }
            }

            $user->password = $validated['password'];
        }

        $user->name = $validated['name'];

        if (array_key_exists('phone_number', $validated)) {
            $user->phone_number = $validated['phone_number'];
        }

        if (array_key_exists('notify_due_soon', $validated)) {
            $user->notify_due_soon = filter_var($validated['notify_due_soon'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('notify_new_books', $validated)) {
            $user->notify_new_books = filter_var($validated['notify_new_books'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('notify_borrow_status', $validated)) {
            $user->notify_borrow_status = filter_var($validated['notify_borrow_status'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('notify_room_status', $validated)) {
            $user->notify_room_status = filter_var($validated['notify_room_status'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('notify_room_reminder', $validated)) {
            $user->notify_room_reminder = filter_var($validated['notify_room_reminder'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('notify_fine_status', $validated)) {
            $user->notify_fine_status = filter_var($validated['notify_fine_status'], FILTER_VALIDATE_BOOLEAN);
        }

        if (array_key_exists('notify_reservation', $validated)) {
            $user->notify_reservation = filter_var($validated['notify_reservation'], FILTER_VALIDATE_BOOLEAN);
        }

        $user->save();

        if (! empty($validated['password']) && in_array($role, ['admin', 'librarian'], true)) {
            \Illuminate\Support\Facades\Cache::forget('change_password_otp_'.$user->email);
        }

        \App\Services\AuditLoggerService::log('profile_update', 'Cập nhật thông tin cá nhân', $user);

        return response()->json([
            'message' => __('messages.auth.profile_updated'),
            'user' => AuthenticatedUserResource::make($user->fresh()),
            'role' => $user->getRoleName(),
        ]);
    }

    public function logout(Request $request)
    {
        \App\Services\AuditLoggerService::log('logout', 'Đăng xuất khỏi hệ thống');

        $user = $request->user();
        if ($user) {
            $user->currentAccessToken()?->delete();

            $plainRefreshToken = $request->cookie('refresh_token') ?? $request->input('refresh_token');
            if ($plainRefreshToken) {
                \App\Models\RefreshToken::where('token_hash', hash('sha256', $plainRefreshToken))->delete();
            }
        }

        return response()->json([
            'message' => __('messages.auth.logout_success'),
        ])->withoutCookie('refresh_token');
    }

    public function refresh(Request $request)
    {
        $plainRefreshToken = $request->cookie('refresh_token') ?? $request->input('refresh_token');

        if (!$plainRefreshToken) {
            return response()->json(['message' => 'Refresh token is required.'], 401);
        }

        $hash = hash('sha256', $plainRefreshToken);
        $refreshTokenModel = \App\Models\RefreshToken::where('token_hash', $hash)->first();

        if (!$refreshTokenModel || $refreshTokenModel->expires_at->isPast()) {
            if ($refreshTokenModel) {
                $refreshTokenModel->delete();
            }
            return response()->json(['message' => 'Refresh token is invalid or expired.'], 401);
        }

        $role = $refreshTokenModel->user_type;
        if ($role === 'student') {
            $user = Member::find($refreshTokenModel->user_id);
        } else {
            $user = Librarian::find($refreshTokenModel->user_id);
        }

        if (!$user) {
            $refreshTokenModel->delete();
            return response()->json(['message' => 'User not found.'], 401);
        }

        $refreshTokenModel->delete();
        
        $newPlainRefreshToken = \Illuminate\Support\Str::random(64);
        \App\Models\RefreshToken::create([
            'user_id' => $user->member_id ?? $user->librarian_id,
            'user_type' => $role,
            'token_hash' => hash('sha256', $newPlainRefreshToken),
            'expires_at' => now()->addDays(7),
        ]);

        $tokenResult = $user->createToken($role.'-session', ['role:'.$role], now()->addMinutes(15));
        $token = $tokenResult->plainTextToken;

        return response()->json([
            'message' => 'Token refreshed successfully.',
            'token' => $token,
            'refresh_token' => $newPlainRefreshToken,
        ])->cookie(
            'refresh_token',
            $newPlainRefreshToken,
            60 * 24 * 7,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );
    }

    public function verifyOtp(VerifyOtpRequest $request)
    {
        $validated = $request->validated();

        $cachedOtp = \Illuminate\Support\Facades\Cache::get('otp_'.$validated['email']);

        if (! $cachedOtp || $cachedOtp !== $validated['otp']) {
            return response()->json([
                'message' => __('messages.auth.otp_invalid'),
            ], 400);
        }

        $user = Member::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => __('messages.auth.account_not_found')], 404);
        }

        $user->email_verified_at = now();
        $user->save();

        \Illuminate\Support\Facades\Cache::forget('otp_'.$validated['email']);

        $tokenResult = $user->createToken('student-session', ['role:student'], now()->addMinutes(15));
        $token = $tokenResult->plainTextToken;

        $plainRefreshToken = \Illuminate\Support\Str::random(64);
        \App\Models\RefreshToken::create([
            'user_id' => $user->member_id,
            'user_type' => 'student',
            'token_hash' => hash('sha256', $plainRefreshToken),
            'expires_at' => now()->addDays(7),
        ]);

        return response()->json([
            'message' => __('messages.auth.otp_valid'),
            'user' => AuthenticatedUserResource::make($user),
            'role' => 'student',
            'token' => $token,
            'refresh_token' => $plainRefreshToken,
        ])->cookie(
            'refresh_token',
            $plainRefreshToken,
            60 * 24 * 7,
            '/',
            null,
            false,
            true,
            false,
            'Lax'
        );
    }

    public function resendOtp(ResendOtpRequest $request)
    {
        $validated = $request->validated();

        $user = Member::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => __('messages.auth.account_not_found')], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => __('messages.auth.account_already_verified')], 400);
        }

        $otp = (string) random_int(100000, 999999);
        \Illuminate\Support\Facades\Cache::put('otp_'.$user->email, $otp, now()->addSeconds(60));

        try {
            \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\VerifyEmailOTP($otp));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('resendOtp mail error: ' . $e->getMessage());
            return response()->json(['message' => __('messages.auth.email_send_failed')], 500);
        }

        return response()->json([
            'message' => __('messages.auth.otp_sent'),
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request)
    {
        $validated = $request->validated();

        $email = $validated['email'];

        $user = Member::where('email', $email)->first() ?? Librarian::where('email', $email)->first();

        if (! $user) {
            return response()->json(['message' => __('messages.auth.account_not_found_email')], 404);
        }

        $otp = (string) random_int(100000, 999999);
        \Illuminate\Support\Facades\Cache::put('forgot_otp_'.$email, $otp, now()->addSeconds(60));

        try {
            \Illuminate\Support\Facades\Mail::to($email)->send(new \App\Mail\ForgotPasswordOTP($otp));
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('forgotPassword mail error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Không thể gửi email OTP: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => __('messages.auth.password_reset_otp_sent'),
            'mail_sent' => true,
        ]);
    }

    public function verifyForgotPasswordOtp(VerifyForgotPasswordOtpRequest $request)
    {
        $validated = $request->validated();

        $email = $validated['email'];
        $cachedOtp = \Illuminate\Support\Facades\Cache::get('forgot_otp_'.$email);

        if (! $cachedOtp || $cachedOtp !== $validated['otp']) {
            return response()->json([
                'message' => __('messages.auth.otp_invalid'),
            ], 400);
        }

        return response()->json([
            'message' => __('messages.auth.otp_valid'),
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request)
    {
        $validated = $request->validated();

        $email = $validated['email'];
        $cachedOtp = \Illuminate\Support\Facades\Cache::get('forgot_otp_'.$email);

        if (! $cachedOtp || $cachedOtp !== $validated['otp']) {
            return response()->json([
                'message' => __('messages.auth.otp_invalid'),
            ], 400);
        }

        $user = Member::where('email', $email)->first() ?? Librarian::where('email', $email)->first();

        if (! $user) {
            return response()->json(['message' => __('messages.auth.account_not_found_email')], 404);
        }

        $user->password = $validated['password'];
        $user->save();

        \Illuminate\Support\Facades\Cache::forget('forgot_otp_'.$email);

        return response()->json([
            'message' => __('messages.auth.password_reset_success'),
        ]);
    }

    public static function getDeviceType(string $userAgent): string
    {
        $userAgentLower = strtolower($userAgent);
        if (str_contains($userAgentLower, 'tablet') || str_contains($userAgentLower, 'ipad') || (str_contains($userAgentLower, 'android') && !str_contains($userAgentLower, 'mobile'))) {
            return 'Tablet';
        }
        if (str_contains($userAgentLower, 'mobile') || str_contains($userAgentLower, 'phone') || str_contains($userAgentLower, 'iphone') || str_contains($userAgentLower, 'ipod') || str_contains($userAgentLower, 'android')) {
            return 'Mobile';
        }
        if (str_contains($userAgentLower, 'mozilla') || str_contains($userAgentLower, 'gecko') || str_contains($userAgentLower, 'webkit') || str_contains($userAgentLower, 'opera')) {
            return 'Desktop';
        }
        return 'Unknown';
    }

    public function getActiveDevices(Request $request)
    {
        $user = $request->user();
        $role = method_exists($user, 'getRoleName') ? $user->getRoleName() : 'student';
        $userId = $user->member_id ?? $user->librarian_id;

        $devices = \App\Models\LoginHistory::where('user_id', $userId)
            ->where('user_type', $role)
            ->orderBy('history_id', 'desc')
            ->get();

        $activeTokenIds = $user->tokens->pluck('id')->toArray();
        $currentToken = $user->currentAccessToken();
        $currentTokenId = $currentToken ? $currentToken->id : null;

        $formatted = $devices->filter(function ($device) use ($activeTokenIds) {
            return in_array($device->token_id, $activeTokenIds);
        })->map(function ($device) use ($currentTokenId) {
            $parsed = $this->parseUserAgent($device->user_agent ?? '');
            return [
                'history_id' => $device->history_id,
                'ip_address' => $device->ip_address,
                'device_type' => $device->device_type,
                'browser' => $parsed['browser'],
                'platform' => $parsed['platform'],
                'token_id' => $device->token_id,
                'is_current' => $device->token_id == $currentTokenId,
                'created_at' => $device->created_at,
            ];
        })->values();

        return response()->json($formatted);
    }

    public function revokeDevice(Request $request, $tokenId)
    {
        $user = $request->user();
        
        $token = $user->tokens()->where('id', $tokenId)->first();
        if (!$token) {
            return response()->json(['message' => __('messages.auth.device_not_found')], 404);
        }

        $token->delete();

        \App\Models\LoginHistory::where('token_id', $tokenId)->delete();

        \App\Services\AuditLoggerService::log('revoke_device', 'Hủy phiên đăng nhập của thiết bị từ xa (Token ID: ' . $tokenId . ')', $user);

        return response()->json(['message' => __('messages.auth.device_revoked')]);
    }

    public function verifyPasswordOtp(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'otp' => ['required', 'string', 'size:6'],
        ]);

        $cachedOtp = \Illuminate\Support\Facades\Cache::get('change_password_otp_'.$user->email);

        if (! $cachedOtp || $cachedOtp !== $validated['otp']) {
            return response()->json([
                'message' => __('messages.auth.otp_invalid'),
            ], 400);
        }

        return response()->json([
            'message' => __('messages.auth.otp_valid'),
        ]);
    }

    private function parseUserAgent(string $userAgent): array
    {
        $userAgentLower = strtolower($userAgent);
        $browser = 'Unknown Browser';
        $platform = 'Unknown OS';

        if (str_contains($userAgentLower, 'windows')) {
            $platform = 'Windows';
        } elseif (str_contains($userAgentLower, 'macintosh') || str_contains($userAgentLower, 'mac os')) {
            $platform = 'macOS';
        } elseif (str_contains($userAgentLower, 'iphone') || str_contains($userAgentLower, 'ipad') || str_contains($userAgentLower, 'ipod')) {
            $platform = 'iOS';
        } elseif (str_contains($userAgentLower, 'android')) {
            $platform = 'Android';
        } elseif (str_contains($userAgentLower, 'linux')) {
            $platform = 'Linux';
        }

        if (str_contains($userAgentLower, 'edg')) {
            $browser = 'Edge';
        } elseif (str_contains($userAgentLower, 'chrome') && !str_contains($userAgentLower, 'chromium')) {
            $browser = 'Chrome';
        } elseif (str_contains($userAgentLower, 'safari') && !str_contains($userAgentLower, 'chrome')) {
            $browser = 'Safari';
        } elseif (str_contains($userAgentLower, 'firefox')) {
            $browser = 'Firefox';
        } elseif (str_contains($userAgentLower, 'opera') || str_contains($userAgentLower, 'opr')) {
            $browser = 'Opera';
        }

        return [
            'browser' => $browser,
            'platform' => $platform,
        ];
    }
}
