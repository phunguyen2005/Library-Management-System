<?php

namespace App\Http\Controllers;

use App\Http\Requests\BlogPostIndexRequest;
use App\Http\Requests\BlogPostUpsertRequest;
use App\Http\Resources\BlogPostResource;
use App\Models\BlogPost;
use App\Services\AuditLoggerService;
use App\Services\BlogAiExcerptService;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BlogPostController extends Controller
{
    public function index(BlogPostIndexRequest $request)
    {
        $query = BlogPost::query()
            ->published()
            ->with('author');

        $this->applyFilters($query, $request->validated(), publicOnly: true);

        $posts = $query
            ->orderByDesc('is_pinned')
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->paginate((int) ($request->validated('limit') ?? 9), ['*'], 'page', (int) ($request->validated('page') ?? 1))
            ->withQueryString();

        return BlogPostResource::collection($posts);
    }

    public function show(string $slug)
    {
        $post = BlogPost::query()
            ->published()
            ->where('slug', $slug)
            ->with('author')
            ->firstOrFail();

        $post->increment('views');

        return new BlogPostResource($post->fresh('author'));
    }

    public function adminIndex(BlogPostIndexRequest $request)
    {
        $query = BlogPost::query()->with('author');

        $this->applyFilters($query, $request->validated(), publicOnly: false);

        $posts = $query
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate((int) ($request->validated('limit') ?? 15), ['*'], 'page', (int) ($request->validated('page') ?? 1))
            ->withQueryString();

        return BlogPostResource::collection($posts);
    }

    public function store(BlogPostUpsertRequest $request, BlogAiExcerptService $excerptService): JsonResponse
    {
        $validated = $request->validated();
        $content = $this->sanitizeRichText($validated['content']);
        $status = $validated['status'] ?? 'draft';
        $author = $request->user();

        $post = BlogPost::query()->create(array_merge([
            'title' => $validated['title'],
            'slug' => $this->uniqueSlug($validated['title']),
            'excerpt' => $this->resolvedExcerpt($validated, $content, $excerptService),
            'content' => $content,
            'cover_image' => $validated['cover_image'] ?? null,
            'category' => $validated['category'],
            'status' => $status,
            'is_pinned' => (bool) ($validated['is_pinned'] ?? false),
            'author_id' => $author->getKey(),
            'author_type' => $author::class,
            'published_at' => $this->publishedAtFor($status, $validated['published_at'] ?? null),
        ], $this->uploadCoverPayload($request)));

        AuditLoggerService::log('blog_post_create', 'Tao bai viet blog: '.$post->title, $author);

        return response()->json(new BlogPostResource($post->load('author')), 201);
    }

    public function update(BlogPostUpsertRequest $request, BlogPost $blogPost, BlogAiExcerptService $excerptService): JsonResponse
    {
        $validated = $request->validated();
        $content = $this->sanitizeRichText($validated['content']);
        $status = $validated['status'] ?? $blogPost->status;
        $coverPayload = $this->uploadCoverPayload($request, $blogPost);

        if (array_key_exists('cover_image', $validated) && ! $request->hasFile('cover_image_file')) {
            $coverPayload['cover_image'] = $validated['cover_image'];
            $coverPayload['cover_public_id'] = null;
        }

        $blogPost->fill(array_merge([
            'title' => $validated['title'],
            'slug' => $this->uniqueSlug($validated['title'], $blogPost->id),
            'excerpt' => $this->resolvedExcerpt($validated, $content, $excerptService),
            'content' => $content,
            'category' => $validated['category'],
            'status' => $status,
            'is_pinned' => (bool) ($validated['is_pinned'] ?? $blogPost->is_pinned),
            'published_at' => $this->publishedAtFor($status, $validated['published_at'] ?? $blogPost->published_at),
        ], $coverPayload));
        $blogPost->save();

        AuditLoggerService::log('blog_post_update', 'Cap nhat bai viet blog: '.$blogPost->title, $request->user());

        return response()->json(new BlogPostResource($blogPost->fresh('author')));
    }

    public function destroy(Request $request, BlogPost $blogPost): JsonResponse
    {
        $blogPost->delete();

        AuditLoggerService::log('blog_post_delete', 'Xoa bai viet blog: '.$blogPost->title, $request->user());

        return response()->json([
            'message' => 'Xoa bai viet blog thanh cong.',
        ]);
    }

    public function publish(Request $request, BlogPost $blogPost): JsonResponse
    {
        $validated = $request->validate([
            'published' => ['nullable', 'boolean'],
        ]);
        $shouldPublish = (bool) ($validated['published'] ?? $blogPost->status !== 'published');

        $blogPost->forceFill([
            'status' => $shouldPublish ? 'published' : 'draft',
            'published_at' => $shouldPublish ? ($blogPost->published_at ?: now()) : null,
        ])->save();

        AuditLoggerService::log(
            $shouldPublish ? 'blog_post_publish' : 'blog_post_unpublish',
            ($shouldPublish ? 'Xuat ban bai viet blog: ' : 'Go xuat ban bai viet blog: ').$blogPost->title,
            $request->user(),
        );

        return response()->json(new BlogPostResource($blogPost->fresh('author')));
    }

    public function pin(Request $request, BlogPost $blogPost): JsonResponse
    {
        $validated = $request->validate([
            'is_pinned' => ['nullable', 'boolean'],
        ]);
        $isPinned = array_key_exists('is_pinned', $validated)
            ? (bool) $validated['is_pinned']
            : ! $blogPost->is_pinned;

        $blogPost->forceFill(['is_pinned' => $isPinned])->save();

        AuditLoggerService::log(
            $isPinned ? 'blog_post_pin' : 'blog_post_unpin',
            ($isPinned ? 'Ghim bai viet blog: ' : 'Bo ghim bai viet blog: ').$blogPost->title,
            $request->user(),
        );

        return response()->json(new BlogPostResource($blogPost->fresh('author')));
    }

    public function generateExcerpt(Request $request, BlogPost $blogPost, BlogAiExcerptService $excerptService): JsonResponse
    {
        $excerpt = $excerptService->generate($blogPost->title, $blogPost->content);
        $blogPost->forceFill(['excerpt' => $excerpt])->save();

        AuditLoggerService::log('blog_post_ai_excerpt', 'Tao tom tat AI cho bai viet blog: '.$blogPost->title, $request->user());

        return response()->json(new BlogPostResource($blogPost->fresh('author')));
    }

    private function applyFilters($query, array $validated, bool $publicOnly): void
    {
        $search = trim((string) ($validated['query'] ?? ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('title', 'like', '%'.$search.'%')
                    ->orWhere('excerpt', 'like', '%'.$search.'%')
                    ->orWhere('content', 'like', '%'.$search.'%');
            });
        }

        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (! $publicOnly && ! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (array_key_exists('pinned', $validated)) {
            $query->where('is_pinned', (bool) $validated['pinned']);
        }
    }

    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'blog-post';
        $slug = $base;
        $counter = 2;

        while (
            BlogPost::withTrashed()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function sanitizeRichText(string $html): string
    {
        $html = preg_replace('/<(script|style|iframe|object|embed|link|meta)[^>]*>.*?<\/\1>/is', '', $html) ?? '';
        $html = preg_replace('/<(script|style|iframe|object|embed|link|meta)[^>]*\/?>/is', '', $html) ?? '';
        $html = preg_replace('/\s+on[a-z]+\s*=\s*(["\']).*?\1/is', '', $html) ?? '';
        $html = preg_replace('/\s+on[a-z]+\s*=\s*[^\s>]+/is', '', $html) ?? '';
        $html = preg_replace('/(href|src)\s*=\s*(["\'])\s*javascript:[^"\']*\2/is', '$1="#"', $html) ?? '';

        return strip_tags($html, '<p><br><strong><b><em><i><u><s><h2><h3><h4><ul><ol><li><blockquote><a><img><figure><figcaption><pre><code><hr><table><thead><tbody><tr><th><td>');
    }

    private function resolvedExcerpt(array $validated, string $content, BlogAiExcerptService $excerptService): ?string
    {
        $excerpt = trim((string) ($validated['excerpt'] ?? ''));

        if ($excerpt !== '' && ! (bool) ($validated['generate_excerpt'] ?? false)) {
            return Str::limit($excerpt, 1000, '');
        }

        return $excerptService->generate($validated['title'], $content);
    }

    private function publishedAtFor(string $status, mixed $requested): mixed
    {
        if ($status !== 'published') {
            return null;
        }

        return $requested ?: now();
    }

    private function uploadCoverPayload(Request $request, ?BlogPost $existingPost = null): array
    {
        if (! $request->hasFile('cover_image_file')) {
            return [];
        }

        $service = new CloudinaryService();
        $file = $request->file('cover_image_file');

        if ($existingPost?->cover_public_id) {
            $service->delete($existingPost->cover_public_id, 'jpg');
        }

        $upload = $service->upload($file, 'library_blog_covers');

        return [
            'cover_image' => $upload['secure_url'],
            'cover_public_id' => $upload['public_id'],
        ];
    }
}
