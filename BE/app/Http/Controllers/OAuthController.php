<?php

namespace App\Http\Controllers;

use App\Models\Librarian;
use App\Models\LoginHistory;
use App\Models\Member;
use App\Services\AuditLoggerService;
use App\Support\InstitutionalEmail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class OAuthController extends Controller
{
    private const SUPPORTED_PROVIDERS = ['google', 'github', 'microsoft'];

    public function redirect(string $provider)
    {
        if (! in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            abort(404);
        }

        $state = Str::random(40);
        Cache::put($this->oauthStateCacheKey($provider, $state), true, now()->addMinutes(5));

        return Socialite::driver($provider)
            ->stateless()
            ->with(['state' => $state])
            ->redirect();
    }

    public function callback(Request $request, string $provider)
    {
        if (! in_array($provider, self::SUPPORTED_PROVIDERS, true)) {
            return redirect($this->frontendOAuthCallback(['error' => 'InvalidProvider']));
        }

        $state = (string) $request->query('state', '');
        if ($state === '' || ! Cache::pull($this->oauthStateCacheKey($provider, $state))) {
            return redirect($this->frontendOAuthCallback(['error' => 'InvalidState']));
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return redirect($this->frontendOAuthCallback(['error' => 'Unauthorized']));
        }

        $email = $socialUser->getEmail();
        if (! $email) {
            $email = ($socialUser->getNickname() ?? 'github_user') . '@github.com';
        }

        if ($provider === 'microsoft') {
            $emailLower = strtolower($email);
            if (! str_ends_with($emailLower, '@student.hcmue.edu.vn') && ! str_ends_with($emailLower, '@hcmue.edu.vn')) {
                return redirect($this->frontendOAuthCallback(['error' => 'EmailDomainNotAllowed']));
            }
        }


        $user = Librarian::where('email', $email)->first();
        $isLibrarian = true;

        if (! $user) {
            $user = Member::where('email', $email)->first();
            $isLibrarian = false;
        }

        if (! $user) {
            if (! InstitutionalEmail::isAllowed($email)) {
                return redirect($this->frontendOAuthCallback(['error' => 'EmailDomainNotAllowed']));
            }

            $user = Member::create([
                'name' => $socialUser->getName() ?? $socialUser->getNickname(),
                'email' => $email,
                'provider_name' => $provider,
                'provider_id' => $socialUser->getId(),
                'email_verified_at' => now(),
                'join_date' => now()->toDateString(),
            ]);
            $isLibrarian = false;
        } elseif (! $isLibrarian && ! $user->provider_name) {
            $user->update([
                'provider_name' => $provider,
                'provider_id' => $socialUser->getId(),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ]);
        }

        $role = $user->getRoleName();

        if ($role === 'student' && $user->is_disabled) {
            return redirect($this->frontendOAuthCallback(['error' => 'AccountDisabled']));
        }

        $tokenResult = $user->createToken($role . '-session', ['role:' . $role], now()->addMinutes(15));
        $token = $tokenResult->plainTextToken;
        $tokenId = $tokenResult->accessToken->id;

        $plainRefreshToken = \Illuminate\Support\Str::random(64);
        \App\Models\RefreshToken::create([
            'user_id' => $isLibrarian ? $user->librarian_id : $user->member_id,
            'user_type' => $role,
            'token_hash' => hash('sha256', $plainRefreshToken),
            'expires_at' => now()->addDays(7),
        ]);

        AuditLoggerService::log('login', 'Đăng nhập thành công qua ' . ucfirst($provider), $user);
        LoginHistory::create([
            'user_id' => $isLibrarian ? $user->librarian_id : $user->member_id,
            'user_type' => $role,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_type' => AuthController::getDeviceType($request->userAgent() ?? ''),
            'token_id' => $tokenId,
        ]);

        return redirect($this->frontendOAuthCallback([
            'token' => $token,
            'refresh_token' => $plainRefreshToken,
        ]))->cookie(
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

    private function oauthStateCacheKey(string $provider, string $state): string
    {
        return 'oauth_state:' . $provider . ':' . hash('sha256', $state);
    }

    private function frontendOAuthCallback(array $query): string
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:3000'), '/');

        return $frontendUrl . '/oauth-callback?' . http_build_query($query);
    }
}
