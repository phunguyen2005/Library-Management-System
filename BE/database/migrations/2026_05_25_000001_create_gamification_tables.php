<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend members table
        Schema::table('members', function (Blueprint $table) {
            $table->unsignedInteger('xp')->default(0);
            $table->unsignedInteger('points')->default(0);
            $table->unsignedInteger('level')->default(1);
            $table->unsignedInteger('daily_streak')->default(0);
            $table->timestamp('last_check_in_at')->nullable();
        });

        // 2. Create badges table
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description');
            $table->string('icon');
            $table->text('requirements')->nullable();
            $table->timestamps();
        });

        // 3. Create member_badges pivot table
        Schema::create('member_badges', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id');
            $table->unsignedBigInteger('badge_id');
            $table->timestamp('earned_at')->useCurrent();

            $table->foreign('member_id')->references('member_id')->on('members')->onDelete('cascade');
            $table->foreign('badge_id')->references('id')->on('badges')->onDelete('cascade');
            $table->unique(['member_id', 'badge_id']);
        });

        // 4. Create rewards table
        Schema::create('rewards', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->text('description');
            $table->unsignedInteger('points_cost');
            $table->string('benefit_type'); // e.g. 'loan_limit', 'loan_duration', 'fine_waiver'
            $table->integer('benefit_value');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 5. Create member_rewards table
        Schema::create('member_rewards', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id');
            $table->unsignedBigInteger('reward_id');
            $table->string('status')->default('active'); // active, used, expired
            $table->timestamp('redeemed_at')->useCurrent();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('used_at')->nullable();

            $table->foreign('member_id')->references('member_id')->on('members')->onDelete('cascade');
            $table->foreign('reward_id')->references('id')->on('rewards')->onDelete('cascade');
        });

        // 6. Create gamify_logs table
        Schema::create('gamify_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('member_id');
            $table->string('event_type'); // check_in, book_borrow, book_return, review_post, digital_read, redeem_reward, fine_waived
            $table->integer('xp_gained')->default(0);
            $table->integer('points_changed')->default(0);
            $table->string('description');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('member_id')->references('member_id')->on('members')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gamify_logs');
        Schema::dropIfExists('member_rewards');
        Schema::dropIfExists('rewards');
        Schema::dropIfExists('member_badges');
        Schema::dropIfExists('badges');

        Schema::table('members', function (Blueprint $table) {
            $table->dropColumn(['xp', 'points', 'level', 'daily_streak', 'last_check_in_at']);
        });
    }
};
