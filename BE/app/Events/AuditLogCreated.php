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
        $user_name = __('messages.audit.user_type.system');
        $user_email = null;
        $user_type = $this->getUserTypeLabel($this->auditLog->user_type);

        if ($this->auditLog->user_type === 'student') {
            $member = \App\Models\Member::find($this->auditLog->user_id);
            if ($member) {
                $user_name = $member->name;
                $user_email = $member->email;
                $user_type = $this->getUserTypeLabel('student');
            }
        } elseif ($this->auditLog->user_type === 'admin') {
            $librarian = \App\Models\Librarian::find($this->auditLog->user_id);
            if ($librarian) {
                $user_name = $librarian->name;
                $user_email = $librarian->email;
                $user_type = $this->getUserTypeLabel('admin');
            }
        }

        return [
            'log_id' => $this->auditLog->log_id,
            'user_id' => $this->auditLog->user_id,
            'raw_user_type' => $this->auditLog->user_type,
            'user_type' => $user_type,
            'user_type_key' => 'messages.audit.user_type.'.$this->normalizeUserType($this->auditLog->user_type),
            'user_name' => $user_name,
            'user_email' => $user_email,
            'raw_action' => $this->auditLog->action,
            'action' => $this->getActionLabel($this->auditLog->action),
            'action_key' => 'messages.audit.action.'.$this->auditLog->action,
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

    private function getActionLabel(string $action): string
    {
        $key = 'messages.audit.action.'.$action;
        $label = __($key);

        return $label === $key ? $action : $label;
    }

    private function getUserTypeLabel(?string $userType): string
    {
        return __('messages.audit.user_type.'.$this->normalizeUserType($userType));
    }

    private function normalizeUserType(?string $userType): string
    {
        return in_array($userType, ['student', 'admin'], true) ? $userType : 'system';
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'audit.log.created';
    }
}
