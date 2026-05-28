<?php

namespace App\Http\Resources;

use App\Models\Librarian;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BlogPostResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $author = $this->whenLoaded('author');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'content' => $this->content,
            'cover_image' => $this->cover_image,
            'category' => $this->category,
            'status' => $this->status,
            'is_pinned' => (bool) $this->is_pinned,
            'views' => (int) $this->views,
            'published_at' => $this->published_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'author' => $author instanceof Librarian ? [
                'librarian_id' => $author->librarian_id,
                'name' => $author->name,
                'email' => $author->email,
            ] : null,
        ];
    }
}
