<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BlogPostIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'query' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', Rule::in(['news', 'review', 'event', 'academic', 'guide'])],
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
            'pinned' => ['nullable', 'boolean'],
            'page' => ['nullable', 'integer', 'min:1'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }
}
