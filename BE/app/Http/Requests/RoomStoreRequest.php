<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RoomStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('name'))) {
            $this->merge(['name' => trim($this->input('name'))]);
        }
        if (is_string($this->input('location'))) {
            $this->merge(['location' => trim($this->input('location'))]);
        }
        if (is_string($this->input('description'))) {
            $this->merge(['description' => trim($this->input('description'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'capacity' => ['required', 'integer', 'min:1'],
            'location' => ['required', 'string', 'max:150'],
            'amenities' => ['nullable', 'array'],
            'amenities.*' => ['string'],
            'status' => ['nullable', 'string', 'in:active,maintenance,closed'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
