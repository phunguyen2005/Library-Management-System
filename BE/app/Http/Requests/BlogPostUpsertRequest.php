<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BlogPostUpsertRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'content' => ['required', 'string'],
            'cover_image' => ['nullable', 'url', 'max:2048'],
            'cover_image_file' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'category' => ['required', Rule::in(['news', 'review', 'event', 'academic', 'guide'])],
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
            'is_pinned' => ['nullable', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'generate_excerpt' => ['nullable', 'boolean'],
        ];
    }
}
