<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => __('messages.role.sign_in_required')], 401);
        }

        $role = method_exists($user, 'getRoleName') ? $user->getRoleName() : null;

        if (! $role || ! in_array($role, $roles, true)) {
            return response()->json(['message' => __('messages.role.forbidden')], 403);
        }

        return $next($request);
    }
}
