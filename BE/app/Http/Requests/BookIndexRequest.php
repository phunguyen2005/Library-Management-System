<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BookIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_available' => $this->normalizeBooleanQuery($this->input('is_available')),
            'is_digital' => $this->normalizeBooleanQuery($this->input('is_digital')),
        ]);
    }

    public function rules(): array
    {
        return [
            'query' => ['nullable', 'string', 'max:255'],
            'genre' => ['nullable', 'string', 'max:100'],
            'is_available' => ['nullable', 'boolean'],
            'is_digital' => ['nullable', 'boolean'],
            'resource_type' => ['nullable', 'string', 'max:50'],
            'page' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ];
    }

    private function normalizeBooleanQuery(mixed $value): mixed
    {
        if (is_string($value)) {
            $normalized = strtolower($value);

            if ($normalized === 'true') {
                return true;
            }

            if ($normalized === 'false') {
                return false;
            }
        }

        return $value;
    }
}
