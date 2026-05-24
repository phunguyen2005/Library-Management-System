<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoomUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name') && is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
        if ($this->has('location') && is_string($this->input('location'))) {
            $this->merge(['location' => trim($this->input('location'))]);
        }
        if ($this->has('description') && is_string($this->input('description'))) {
            $this->merge(['description' => trim($this->input('description'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1'],
            'location' => ['sometimes', 'required', 'string', 'max:150'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string'],
            'status' => ['sometimes', 'required', 'string', 'in:active,maintenance,closed'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
