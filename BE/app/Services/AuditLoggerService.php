<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLoggerService
{
    public static function log(string $action, string $description, $user = null): void
    {
        $user = $user ?? Auth::user();
        $userId = null;
        $userType = null;

        if ($user) {
            if (isset($user->member_id)) {
                $userId = $user->member_id;
                $userType = 'student';
            } elseif (isset($user->librarian_id)) {
                $userId = $user->librarian_id;
                $userType = 'admin';
            } else {
                $userId = $user->id;
                $userType = 'unknown';
            }
        }

        $logEntry = AuditLog::create([
            'user_id' => $userId,
            'user_type' => $userType,
            'action' => $action,
            'description' => $description,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);

        try {
            broadcast(new \App\Events\AuditLogCreated($logEntry))->toOthers();
        } catch (\Exception $e) {
            // Ignore broadcast failures on production if pusher is not configured
        }
    }
}
