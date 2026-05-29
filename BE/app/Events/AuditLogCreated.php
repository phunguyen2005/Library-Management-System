<?php

namespace App\Events;

use App\Models\AuditLog;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuditLogCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $auditLog;

    public function __construct(AuditLog $auditLog)
    {
        $this->auditLog = $auditLog;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('admin-dashboard'),
        ];
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $user_name = 'Hệ thống';
        $user_email = null;
        $user_type = 'Hệ thống';

        if ($this->auditLog->user_type === 'student') {
            $member = \App\Models\Member::find($this->auditLog->user_id);
            if ($member) {
                $user_name = $member->name;
                $user_email = $member->email;
                $user_type = 'Sinh viên';
            }
        } elseif ($this->auditLog->user_type === 'admin') {
            $librarian = \App\Models\Librarian::find($this->auditLog->user_id);
            if ($librarian) {
                $user_name = $librarian->name;
                $user_email = $librarian->email;
                $user_type = 'Thủ thư / Admin';
            }
        }

        $actionMap = [
            'login' => 'Đăng nhập',
            'logout' => 'Đăng xuất',
            'register' => 'Đăng ký',
            'profile_update' => 'Sửa hồ sơ',
            'book_create' => 'Thêm sách',
            'book_update' => 'Sửa sách',
            'book_delete' => 'Xóa sách',
            'digital_file_upload' => 'Tải lên tài liệu số',
            'digital_file_download' => 'Tải/Xem tài liệu số',
            'borrow_request' => 'Yêu cầu mượn',
            'borrow_approve' => 'Duyệt mượn',
            'borrow_pickup' => 'Bàn giao sách',
            'borrow_reject' => 'Từ chối mượn',
            'borrow_return' => 'Nhận trả sách',
            'collect_fine' => 'Thu phí phạt',
            'settings_update' => 'Cấu hình hệ thống',
            'revoke_device' => 'Hủy phiên thiết bị',
        ];

        return [
            'log_id' => $this->auditLog->log_id,
            'user_id' => $this->auditLog->user_id,
            'raw_user_type' => $this->auditLog->user_type,
            'user_type' => $user_type,
            'user_name' => $user_name,
            'user_email' => $user_email,
            'raw_action' => $this->auditLog->action,
            'action' => $actionMap[$this->auditLog->action] ?? $this->auditLog->action,
            'description' => $this->auditLog->description,
            'ip_address' => $this->auditLog->ip_address,
            'user_agent' => $this->auditLog->user_agent,
            'created_at' => $this->auditLog->created_at 
                ? ($this->auditLog->created_at instanceof \DateTimeInterface 
                    ? $this->auditLog->created_at->toIso8601String() 
                    : \Carbon\Carbon::parse($this->auditLog->created_at)->toIso8601String())
                : now()->toIso8601String(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'audit.log.created';
    }
}
