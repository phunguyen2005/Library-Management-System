<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookCopyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'book_id' => $this->book_id,
            'barcode' => $this->barcode,
            'status' => $this->status,
            'condition' => $this->condition,
            'added_at' => $this->added_at?->toISOString(),
            'last_checked_out_at' => $this->last_checked_out_at?->toISOString(),
            'last_checked_in_at' => $this->last_checked_in_at?->toISOString(),
        ];
    }
}
