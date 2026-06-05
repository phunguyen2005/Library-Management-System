<?php

namespace App\Http\Requests;

use App\Models\Book;
use App\Support\BookClassification;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class BookUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $fields = ['title', 'author', 'isbn', 'genre', 'location', 'cover', 'resource_type', 'file_format', 'file_size', 'file_path', 'file_url'];
        $next = [];

        foreach ($fields as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $next[$field] = trim($this->input($field));
            }
        }

        if ($next !== []) {
            $this->merge($next);
        }
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'author' => ['required', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:20', Rule::unique('books', 'isbn')->ignore($this->route('book')?->book_id, 'book_id')],
            'genre' => ['nullable', 'string', 'max:100'],
            'published_year' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'location' => ['nullable', 'string', 'max:100'],
            'cover' => ['nullable', 'url', 'max:2048'],
            'quantity' => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_digital' => ['nullable', 'boolean'],
            'resource_type' => ['nullable', 'string', 'max:50'],
            'file_format' => ['nullable', 'string', Rule::in(['PDF', 'EPUB', 'AUDIO', 'SLIDES'])],
            'file_size' => ['nullable', 'string', 'max:20'],
            'file_path' => ['nullable', 'string', 'max:2048'],
            'file_url' => ['nullable', 'url', 'max:2048'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty() || $this->isDigitalPayload()) {
                return;
            }

            if (BookClassification::normalizePhysical($this->input('genre'), $this->input('location')) === null) {
                $validator->errors()->add(
                    'genre',
                    'Phân loại sách phải thuộc một nhóm trên sơ đồ thư viện A-J.',
                );
            }
        });
    }

    protected function passedValidation(): void
    {
        if ($this->isDigitalPayload()) {
            return;
        }

        $normalized = BookClassification::normalizePhysical($this->input('genre'), $this->input('location'));

        if ($normalized !== null) {
            $this->merge($normalized);
        }
    }

    private function isDigitalPayload(): bool
    {
        if ($this->has('is_digital')) {
            return filter_var($this->input('is_digital'), FILTER_VALIDATE_BOOLEAN);
        }

        $book = $this->route('book');

        return $book instanceof Book && (bool) $book->is_digital;
    }
}
