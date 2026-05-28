<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content');
            $table->string('cover_image')->nullable();
            $table->string('cover_public_id')->nullable();
            $table->string('category', 40);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->boolean('is_pinned')->default(false);
            $table->unsignedBigInteger('author_id');
            $table->string('author_type');
            $table->unsignedInteger('views')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'is_pinned', 'published_at']);
            $table->index(['category', 'status']);
            $table->index(['author_type', 'author_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
