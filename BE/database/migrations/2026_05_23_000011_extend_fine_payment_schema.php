<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fines')) {
            Schema::table('fines', function (Blueprint $table) {
                if (! Schema::hasColumn('fines', 'reason')) {
                    $table->string('reason')->default('overdue')->after('amount');
                }

                if (! Schema::hasColumn('fines', 'waived_by')) {
                    $table->unsignedBigInteger('waived_by')->nullable()->after('paid_at');
                }

                if (! Schema::hasColumn('fines', 'waived_reason')) {
                    $table->text('waived_reason')->nullable()->after('waived_by');
                }
            });
        }

        if (! Schema::hasTable('fine_payments')) {
            Schema::create('fine_payments', function (Blueprint $table) {
                $table->id('payment_id');
                $table->unsignedBigInteger('fine_id');
                $table->decimal('amount_paid', 15, 2);
                $table->string('method')->default('cash');
                $table->string('transaction_ref')->nullable()->unique();
                $table->string('status')->default('completed');
                $table->unsignedBigInteger('collected_by')->nullable();
                $table->json('gateway_response')->nullable();
                $table->timestamps();

                $table->foreign('fine_id')->references('fine_id')->on('fines')->cascadeOnDelete();
                $table->foreign('collected_by')->references('librarian_id')->on('librarians')->nullOnDelete();
                $table->index(['fine_id', 'status']);
            });
        }

        if (Schema::hasTable('library_settings')) {
            Schema::table('library_settings', function (Blueprint $table) {
                if (! Schema::hasColumn('library_settings', 'max_fine_per_loan')) {
                    $table->decimal('max_fine_per_loan', 15, 2)->default(200000)->after('fine_per_day');
                }

                if (! Schema::hasColumn('library_settings', 'grace_period_days')) {
                    $table->unsignedSmallInteger('grace_period_days')->default(0)->after('max_fine_per_loan');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('fine_payments');

        if (Schema::hasTable('fines')) {
            Schema::table('fines', function (Blueprint $table) {
                if (Schema::hasColumn('fines', 'waived_reason')) {
                    $table->dropColumn('waived_reason');
                }

                if (Schema::hasColumn('fines', 'waived_by')) {
                    $table->dropColumn('waived_by');
                }

                if (Schema::hasColumn('fines', 'reason')) {
                    $table->dropColumn('reason');
                }
            });
        }

        if (Schema::hasTable('library_settings')) {
            Schema::table('library_settings', function (Blueprint $table) {
                if (Schema::hasColumn('library_settings', 'grace_period_days')) {
                    $table->dropColumn('grace_period_days');
                }

                if (Schema::hasColumn('library_settings', 'max_fine_per_loan')) {
                    $table->dropColumn('max_fine_per_loan');
                }
            });
        }
    }
};
