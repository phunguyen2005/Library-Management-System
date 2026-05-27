<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoomBookingStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('purpose'))) {
            $this->merge(['purpose' => trim($this->input('purpose'))]);
        }

        if ($this->boolean('is_walkin')) {
            $this->merge([
                'date' => now()->format('Y-m-d'),
                'start_time' => now()->format('H:i'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'room_id' => ['required', 'integer', 'exists:rooms,room_id'],
            'date' => ['required', 'date', 'after_or_equal:today'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'purpose' => ['nullable', 'string', 'max:255'],
            'group_size' => ['required', 'integer', 'min:1'],
            'is_walkin' => ['nullable', 'boolean'],
            'member_id' => ['nullable', 'integer', 'exists:members,member_id'],
        ];
    }
}
