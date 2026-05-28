<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('permissions')->updateOrInsert(
            ['name' => 'manage_blog'],
            [
                'description' => 'Tao, sua, xoa va quan ly bai dang blog',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

        $permissionId = DB::table('permissions')->where('name', 'manage_blog')->value('id');
        $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');

        if ($permissionId && $adminRoleId) {
            DB::table('role_permission')->updateOrInsert([
                'role_id' => $adminRoleId,
                'permission_id' => $permissionId,
            ]);
        }
    }

    public function down(): void
    {
        $permissionId = DB::table('permissions')->where('name', 'manage_blog')->value('id');

        if ($permissionId) {
            DB::table('role_permission')->where('permission_id', $permissionId)->delete();
            DB::table('model_has_permissions')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
