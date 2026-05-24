<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Khởi tạo các Vai trò (Roles)
        $adminRole = Role::firstOrCreate(['name' => 'admin'], ['description' => 'Quản trị viên tối cao']);
        $librarianRole = Role::firstOrCreate(['name' => 'librarian'], ['description' => 'Thủ thư thư viện']);
        $studentRole = Role::firstOrCreate(['name' => 'student'], ['description' => 'Độc giả sinh viên']);

        // 2. Khởi tạo 9 Quyền hạn cốt lõi (Permissions)
        $permissions = [
            'manage_books' => 'Quản lý kho sách (thêm/sửa/xóa sách)',
            'manage_members' => 'Quản lý thành viên/sinh viên',
            'approve_requests' => 'Phê duyệt mượn và trả sách',
            'manage_rooms' => 'Quản lý và duyệt phòng học nhóm',
            'waive_fines' => 'Xóa/Miễn giảm tiền phạt quá hạn',
            'manage_fines' => 'Quản lý và thu phí phạt (xem danh sách, tạo phạt, thu tiền)',
            'manage_settings' => 'Cấu hình cài đặt hệ thống',
            'view_reports' => 'Xem báo cáo thống kê thư viện',
            'view_audit_logs' => 'Xem nhật ký vận hành hệ thống',
            'manage_librarians' => 'Quản lý thủ thư & phân quyền',
        ];

        $permissionModels = [];
        foreach ($permissions as $name => $description) {
            $permissionModels[$name] = Permission::firstOrCreate(
                ['name' => $name],
                ['description' => $description]
            );
        }

        // 3. Gán quyền cho các vai trò (Role - Permission mappings)
        // Admin tối cao có toàn bộ 9 quyền
        $adminRole->permissions()->sync(array_column($permissionModels, 'id'));

        // Thủ thư thường có 4 quyền vận hành cơ bản
        $librarianRole->permissions()->sync([
            $permissionModels['manage_books']->id,
            $permissionModels['manage_members']->id,
            $permissionModels['approve_requests']->id,
            $permissionModels['manage_rooms']->id,
        ]);
        
        // Sinh viên không có quyền đặc biệt nào trong bảng permissions
        $studentRole->permissions()->sync([]);
    }
}
