<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LibrarianResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'librarian_id' => $this->librarian_id,
            'name' => $this->name,
            'email' => $this->email,
            'phone_number' => $this->phone_number,
            'hire_date' => $this->hire_date?->toDateString(),
            'role' => $this->getRoleName(),
            'permissions' => $this->permissions->pluck('name')->toArray(),
        ];
    }
}
