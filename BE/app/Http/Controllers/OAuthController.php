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
    private const SUPPORTED_PROVIDERS = ['google', 'github'];

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
        $tokenResult = $user->createToken($role . '-session', ['role:' . $role]);
        $token = $tokenResult->plainTextToken;
        $tokenId = $tokenResult->accessToken->id;

        AuditLoggerService::log('login', 'Đăng nhập thành công qua ' . ucfirst($provider), $user);
        LoginHistory::create([
            'user_id' => $isLibrarian ? $user->librarian_id : $user->member_id,
            'user_type' => $role,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'device_type' => AuthController::getDeviceType($request->userAgent() ?? ''),
            'token_id' => $tokenId,
        ]);

        return redirect($this->frontendOAuthCallback(['token' => $token]));
    }

    private function oauthStateCacheKey(string $provider, string $state): string
    {
        return 'oauth_state:' . $provider . ':' . hash('sha256', $state);
    }

    private function frontendOAuthCallback(array $query): string
    {
        $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:3000'), '/');

        return $frontendUrl . '/oauth-callback?' . http_build_query($query);
    }
}
