<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'member_id' => $this->member_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'join_date' => $this->join_date?->toDateString(),
            'xp' => $this->xp ?? 0,
            'points' => $this->points ?? 0,
            'level' => $this->level ?? 1,
            'badges_count' => $this->badges_count ?? $this->badges()->count(),
        ];
    }
}
