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
                  ->orWhere('action', 'like', $search)
                  ->orWhere(function ($sub) use ($search) {
                      $sub->where('user_type', 'student')
                          ->whereIn('user_id', function ($subQuery) use ($search) {
                              $subQuery->select('member_id')
                                       ->from('members')
                                       ->where('name', 'like', $search)
                                       ->orWhere('email', 'like', $search);
                          });
                  })
                  ->orWhere(function ($sub) use ($search) {
                      $sub->where('user_type', 'admin')
                          ->whereIn('user_id', function ($subQuery) use ($search) {
                              $subQuery->select('librarian_id')
                                       ->from('librarians')
                                       ->where('name', 'like', $search)
                                       ->orWhere('email', 'like', $search);
                          });
                  });
            });
        }

        if ($request->filled('user_query')) {
            $userSearch = '%' . $request->query('user_query') . '%';
            $query->where(function ($q) use ($userSearch) {
                $q->where(function ($sub) use ($userSearch) {
                    $sub->where('user_type', 'student')
                        ->whereIn('user_id', function ($subQuery) use ($userSearch) {
                            $subQuery->select('member_id')
                                     ->from('members')
                                     ->where('name', 'like', $userSearch)
                                     ->orWhere('email', 'like', $userSearch);
                        });
                })
                ->orWhere(function ($sub) use ($userSearch) {
                    $sub->where('user_type', 'admin')
                        ->whereIn('user_id', function ($subQuery) use ($userSearch) {
                            $subQuery->select('librarian_id')
                                     ->from('librarians')
                                     ->where('name', 'like', $userSearch)
                                     ->orWhere('email', 'like', $userSearch);
                        });
                });
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->query('date'));
        }

        $logs = $query->paginate($request->query('limit', 20));

        // Eager load/cache users to avoid N+1 queries
        $studentIds = [];
        $adminIds = [];
        foreach ($logs as $log) {
            if ($log->user_type === 'student' && $log->user_id) {
                $studentIds[] = $log->user_id;
            } elseif ($log->user_type === 'admin' && $log->user_id) {
                $adminIds[] = $log->user_id;
            }
        }

        $students = !empty($studentIds) ? \App\Models\Member::whereIn('member_id', array_unique($studentIds))->get()->keyBy('member_id') : collect();
        $admins = !empty($adminIds) ? \App\Models\Librarian::whereIn('librarian_id', array_unique($adminIds))->get()->keyBy('librarian_id') : collect();

        $logs->getCollection()->transform(function ($log) use ($students, $admins) {
            $userName = 'Hệ thống';
            $userEmail = null;

            if ($log->user_type === 'student' && $log->user_id) {
                $user = $students->get($log->user_id);
                if ($user) {
                    $userName = $user->name;
                    $userEmail = $user->email;
                }
            } elseif ($log->user_type === 'admin' && $log->user_id) {
                $user = $admins->get($log->user_id);
                if ($user) {
                    $userName = $user->name;
                    $userEmail = $user->email;
                }
            }

            return [
                'log_id' => $log->log_id,
                'user_id' => $log->user_id,
                'user_type' => $log->user_type === 'student' ? 'Sinh viên' : ($log->user_type === 'admin' ? 'Thủ thư' : 'Hệ thống'),
                'raw_user_type' => $log->user_type,
                'user_name' => $userName,
                'user_email' => $userEmail,
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
