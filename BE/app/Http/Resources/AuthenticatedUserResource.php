<?php

namespace App\Http\Resources;

use App\Models\Librarian;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuthenticatedUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->resource;

        if ($user instanceof Librarian) {
            return [
                'librarian_id' => $user->librarian_id,
                'role' => $user->getRoleName(),
                'permissions' => $user->getAllPermissions(),
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'hire_date' => $user->hire_date?->toDateString(),
            ];
        }

        if ($user instanceof Member) {
            return [
                'member_id' => $user->member_id,
                'role' => $user->getRoleName(),
                'name' => $user->name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'join_date' => $user->join_date?->toDateString(),
                'notify_due_soon' => $user->notify_due_soon,
                'notify_new_books' => $user->notify_new_books,
            ];
        }

        return [];
    }
}
