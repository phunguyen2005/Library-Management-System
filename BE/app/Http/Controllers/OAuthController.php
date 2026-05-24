<?php

namespace App\Http\Controllers;

use App\Models\Member;
use App\Models\Librarian;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class OAuthController extends Controller
{
    public function redirect($provider)
    {
        return Socialite::driver($provider)->stateless()->redirect();
    }

    public function callback($provider)
    {
        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Exception $e) {
            return redirect('http://localhost:3000/oauth-callback?error=Unauthorized');
        }

        $email = $socialUser->getEmail();
        if (!$email) {
            $email = ($socialUser->getNickname() ?? 'github_user') . '@github.com';
        }

        // 1. Tìm ở bảng librarians trước (cho cả Admin và Thủ thư)
        $user = Librarian::where('email', $email)->first();
        $isLibrarian = true;

        if (!$user) {
            // 2. Tìm ở bảng members (sinh viên)
            $user = Member::where('email', $email)->first();
            $isLibrarian = false;
        }

        if (!$user) {
            // 3. Nếu là phunguyen2005 (email hoặc nickname khớp) hoặc email thực tế khớp với admin, tự động gán vào tài khoản Admin đã seed
            $nickname = strtolower($socialUser->getNickname() ?? '');
            $emailLower = strtolower($email);
            if ($emailLower === '4901104111@student.hcmue.edu.vn' || str_starts_with($nickname, 'phunguyen2005') || str_starts_with($emailLower, 'phunguyen2005')) {
                $user = Librarian::where('email', '4901104111@student.hcmue.edu.vn')
                    ->orWhere('email', 'phunguyen2005@gmail.com')
                    ->orWhere('email', $email)
                    ->first();
                if ($user) {
                    $isLibrarian = true;
                    // Cập nhật email của thủ thư sang email thực tế của GitHub nếu khác biệt
                    if ($user->email !== $email) {
                        $user->update(['email' => $email]);
                    }
                }
            }
        }

        if (!$user) {
            // 4. Nếu không tìm thấy và không phải là admin nhắm mục tiêu, tạo mới tài khoản thành viên (Sinh viên)
            $user = Member::create([
                'name' => $socialUser->getName() ?? $socialUser->getNickname(),
                'email' => $email,
                'provider_name' => $provider,
                'provider_id' => $socialUser->getId(),
                'email_verified_at' => now(),
                'join_date' => now()->toDateString(),
            ]);
            $isLibrarian = false;
        } else {
            // Cập nhật thông tin provider nếu chưa được thiết lập (chỉ áp dụng cho sinh viên)
            if (!$isLibrarian && !$user->provider_name) {
                $user->update([
                    'provider_name' => $provider,
                    'provider_id' => $socialUser->getId(),
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ]);
            }
        }

        // Tạo token đăng nhập theo role tương ứng
        $role = $user->getRoleName();
        $tokenResult = $user->createToken($role.'-session', ['role:'.$role]);
        $token = $tokenResult->plainTextToken;
        $tokenId = $tokenResult->accessToken->id;

        // Ghi nhận lịch sử đăng nhập & Audit log
        \App\Services\AuditLoggerService::log('login', 'Đăng nhập thành công qua ' . ucfirst($provider), $user);
        \App\Models\LoginHistory::create([
            'user_id' => $isLibrarian ? $user->librarian_id : $user->member_id,
            'user_type' => $role,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'device_type' => \App\Http\Controllers\AuthController::getDeviceType(request()->userAgent() ?? ''),
            'token_id' => $tokenId,
        ]);

        // Chuyển hướng về Frontend kèm theo token
        return redirect('http://localhost:3000/oauth-callback?token=' . $token);
    }
}
