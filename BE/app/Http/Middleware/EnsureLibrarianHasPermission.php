<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLibrarianHasPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => __('messages.role.sign_in_required')], 401);
        }

        // Kiểm tra quyền hạn bằng Trait HasRolesAndPermissions
        if (method_exists($user, 'hasPermission') && ! $user->hasPermission($permission)) {
            return response()->json(['message' => __('messages.role.forbidden')], 403);
        }

        return $next($request);
    }
}
