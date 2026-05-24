<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Permission;
use App\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $adminRole = Role::where('name', 'admin')->first();
        
        $permission = Permission::firstOrCreate(
            ['name' => 'manage_fines'],
            ['description' => 'Quản lý và thu phí phạt (xem danh sách, tạo phạt, thu tiền)']
        );

        if ($adminRole) {
            $adminRole->permissions()->syncWithoutDetaching([$permission->id]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permission = Permission::where('name', 'manage_fines')->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
