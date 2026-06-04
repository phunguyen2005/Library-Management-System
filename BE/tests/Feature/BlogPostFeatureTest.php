<?php

namespace Tests\Feature;

use App\Models\BlogPost;
use App\Models\Librarian;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BlogPostFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_public_blog_reads_published_posts_and_increments_detail_views(): void
    {
        $author = Librarian::query()->findOrFail(1);

        BlogPost::query()->create([
            'title' => 'Published library update',
            'slug' => 'published-library-update',
            'excerpt' => 'A short public summary.',
            'content' => '<p>Public content for students.</p>',
            'category' => 'news',
            'status' => 'published',
            'is_pinned' => true,
            'author_id' => $author->getKey(),
            'author_type' => Librarian::class,
            'views' => 4,
            'published_at' => now()->subDay(),
        ]);

        BlogPost::query()->create([
            'title' => 'Draft internal update',
            'slug' => 'draft-internal-update',
            'content' => '<p>Draft content.</p>',
            'category' => 'event',
            'status' => 'draft',
            'author_id' => $author->getKey(),
            'author_type' => Librarian::class,
        ]);

        $this->getJson('/api/blog/posts?limit=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'published-library-update')
            ->assertJsonPath('data.0.views', 4);

        $this->getJson('/api/blog/posts/published-library-update')
            ->assertOk()
            ->assertJsonPath('slug', 'published-library-update')
            ->assertJsonPath('views', 5);

        $this->getJson('/api/blog/posts/draft-internal-update')
            ->assertNotFound();
    }

    public function test_admin_can_create_update_publish_pin_and_delete_blog_post(): void
    {
        $token = Librarian::query()
            ->findOrFail(1)
            ->createToken('blog-admin', ['role:admin'])
            ->plainTextToken;

        $createResponse = $this->withToken($token)
            ->postJson('/api/admin/blog/posts', [
                'title' => 'AI workshop at the library',
                'excerpt' => 'Students can join a new AI workshop.',
                'content' => '<h2>Workshop</h2><p>Bring your laptop.</p>',
                'category' => 'event',
                'status' => 'draft',
                'is_pinned' => false,
            ])
            ->assertCreated()
            ->assertJsonPath('title', 'AI workshop at the library')
            ->assertJsonPath('slug', 'ai-workshop-at-the-library')
            ->assertJsonPath('status', 'draft')
            ->assertJsonPath('author.librarian_id', 1);

        $postId = $createResponse->json('id');

        $this->withToken($token)
            ->putJson('/api/admin/blog/posts/'.$postId, [
                'title' => 'AI workshop for education students',
                'excerpt' => 'Updated summary.',
                'content' => '<p>Updated rich text body.</p>',
                'category' => 'academic',
                'status' => 'draft',
                'is_pinned' => true,
            ])
            ->assertOk()
            ->assertJsonPath('slug', 'ai-workshop-for-education-students')
            ->assertJsonPath('category', 'academic')
            ->assertJsonPath('is_pinned', true);

        $this->withToken($token)
            ->postJson('/api/admin/blog/posts/'.$postId.'/publish', [
                'published' => true,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'published')
            ->assertJsonPath('published_at', fn ($value) => is_string($value) && $value !== '');

        $this->withToken($token)
            ->postJson('/api/admin/blog/posts/'.$postId.'/pin', [
                'is_pinned' => false,
            ])
            ->assertOk()
            ->assertJsonPath('is_pinned', false);

        $this->withToken($token)
            ->deleteJson('/api/admin/blog/posts/'.$postId)
            ->assertOk();

        $this->assertSoftDeleted('blog_posts', [
            'id' => $postId,
        ]);
    }

    public function test_blog_cover_upload_uses_cloudinary_and_persists_url(): void
    {
        Http::fake([
            'api.cloudinary.com/*' => Http::response([
                'secure_url' => 'https://res.cloudinary.com/demo/image/upload/library_blog_covers/cover.jpg',
                'public_id' => 'library_blog_covers/cover',
            ]),
        ]);

        $token = Librarian::query()
            ->findOrFail(1)
            ->createToken('blog-cover-admin', ['role:admin'])
            ->plainTextToken;

        $this->withToken($token)
            ->post('/api/admin/blog/posts', [
                'title' => 'Cloudinary cover post',
                'content' => '<p>Cover upload body.</p>',
                'category' => 'news',
                'status' => 'published',
                'cover_image_file' => UploadedFile::fake()->create('cover.jpg', 128, 'image/jpeg'),
            ])
            ->assertCreated()
            ->assertJsonPath('cover_image', 'https://res.cloudinary.com/demo/image/upload/library_blog_covers/cover.jpg');

        Http::assertSent(fn ($request) => str_contains($request->url(), '/image/upload'));
        $this->assertDatabaseHas('blog_posts', [
            'slug' => 'cloudinary-cover-post',
            'cover_image' => 'https://res.cloudinary.com/demo/image/upload/library_blog_covers/cover.jpg',
            'cover_public_id' => 'library_blog_covers/cover',
        ]);
    }

    public function test_manage_blog_permission_is_seeded_for_admins(): void
    {
        $this->assertDatabaseHas('permissions', [
            'name' => 'manage_blog',
        ]);

        $admin = Librarian::query()->findOrFail(1);

        $this->assertContains('manage_blog', $admin->getAllPermissions());
    }

    public function test_blog_post_translation_via_gemini_api(): void
    {
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [
                    [
                        'content' => [
                            'parts' => [
                                [
                                    'text' => json_encode([
                                        'title' => 'English title',
                                        'excerpt' => 'English excerpt',
                                        'content' => '<p>English content</p>',
                                    ])
                                ]
                            ]
                        ]
                    ]
                ]
            ]),
        ]);

        config(['services.gemini.api_key' => 'fake-api-key']);

        $author = Librarian::query()->findOrFail(1);

        $post = BlogPost::query()->create([
            'title' => 'Tiêu đề tiếng Việt',
            'slug' => 'tieu-de-tieng-viet',
            'excerpt' => 'Tóm tắt tiếng Việt.',
            'content' => '<p>Nội dung tiếng Việt.</p>',
            'category' => 'news',
            'status' => 'published',
            'author_id' => $author->getKey(),
            'author_type' => Librarian::class,
            'published_at' => now()->subDay(),
        ]);

        // Requesting with 'en' header
        $this->getJson('/api/blog/posts/tieu-de-tieng-viet', [
            'Accept-Language' => 'en',
        ])
            ->assertOk()
            ->assertJsonPath('title', 'English title')
            ->assertJsonPath('excerpt', 'English excerpt')
            ->assertJsonPath('content', '<p>English content</p>');

        // Requesting with 'vi' header should return original content
        $this->getJson('/api/blog/posts/tieu-de-tieng-viet', [
            'Accept-Language' => 'vi',
        ])
            ->assertOk()
            ->assertJsonPath('title', 'Tiêu đề tiếng Việt')
            ->assertJsonPath('excerpt', 'Tóm tắt tiếng Việt.')
            ->assertJsonPath('content', '<p>Nội dung tiếng Việt.</p>');
    }
}
