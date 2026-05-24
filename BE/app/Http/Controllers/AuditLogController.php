<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::query()
            ->orderByDesc('log_id');

        if ($request->filled('user_type')) {
            $query->where('user_type', $request->query('user_type'));
        }

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('query')) {
            $search = '%' . $request->query('query') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', $search)
                  ->orWhere('action', 'like', $search);
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->query('date'));
        }

        $logs = $query->paginate($request->query('limit', 20));

        $logs->getCollection()->transform(function ($log) {
            $userName = 'Hệ thống';
            $user = $log->user;
            if ($user) {
                $userName = $user->name;
            }

            return [
                'log_id' => $log->log_id,
                'user_id' => $log->user_id,
                'user_type' => $log->user_type === 'student' ? 'Sinh viên' : ($log->user_type === 'admin' ? 'Thủ thư' : 'Hệ thống'),
                'raw_user_type' => $log->user_type,
                'user_name' => $userName,
                'action' => $this->getActionLabel($log->action),
                'raw_action' => $log->action,
                'description' => $log->description,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'created_at' => $log->created_at,
            ];
        });

        return response()->json($logs);
    }

    private function getActionLabel(string $action): string
    {
        return match ($action) {
            'login' => 'Đăng nhập',
            'logout' => 'Đăng xuất',
            'register' => 'Đăng ký',
            'profile_update' => 'Sửa hồ sơ',
            'book_create' => 'Thêm sách',
            'book_update' => 'Sửa thông tin sách',
            'book_delete' => 'Xóa sách',
            'digital_file_upload' => 'Tải lên tài liệu số',
            'digital_file_download' => 'Tải/Xem tài liệu số',
            'borrow_request' => 'Yêu cầu mượn sách',
            'borrow_approve' => 'Duyệt yêu cầu mượn',
            'borrow_pickup' => 'Giao sách vật lý',
            'borrow_reject' => 'Từ chối yêu cầu',
            'borrow_return' => 'Nhận sách trả',
            'settings_update' => 'Cập nhật cấu hình',
            default => $action,
        };
    }
}
