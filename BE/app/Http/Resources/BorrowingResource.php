<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BorrowingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $overdue = $this->overdueState();

        return [
            'loan_id' => $this->loan_id,
            'book_id' => $this->book_id,
            'member_id' => $this->member_id,
            'librarian_id' => $this->librarian_id,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'rejected_at' => $this->rejected_at?->toISOString(),
            'borrow_date' => $this->borrow_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'return_date' => $this->return_date?->toDateString(),
            'is_reviewed' => (bool) ($this->review_exists ?? $this->review()->exists()),
            'is_overdue' => $overdue['is_overdue'],
            'days_overdue' => $overdue['days_overdue'],
            'due_status' => $overdue['due_status'],
            'book' => $this->relationLoaded('book') ? BookResource::make($this->book) : null,
            'member' => $this->relationLoaded('member') ? MemberResource::make($this->member) : null,
            'librarian' => $this->relationLoaded('librarian') ? LibrarianResource::make($this->librarian) : null,
            'fine' => $this->fine ? [
                'fine_id' => $this->fine->fine_id,
                'amount' => (float) $this->fine->amount,
                'reason' => $this->fine->reason,
                'status' => $this->fine->status,
                'paid_at' => $this->fine->paid_at?->toISOString(),
                'waived_by' => $this->fine->waived_by,
                'waived_reason' => $this->fine->waived_reason,
            ] : null,
        ];
    }

    private function overdueState(): array
    {
        if ($this->status === 'returned') {
            return [
                'is_overdue' => false,
                'days_overdue' => 0,
                'due_status' => 'returned',
            ];
        }

        if (! $this->due_date || $this->status !== 'borrowed') {
            return [
                'is_overdue' => false,
                'days_overdue' => 0,
                'due_status' => 'none',
            ];
        }

        $today = today();
        $dueDate = $this->due_date->copy()->startOfDay();

        if ($dueDate->lt($today)) {
            return [
                'is_overdue' => true,
                'days_overdue' => (int) $dueDate->diffInDays($today),
                'due_status' => 'overdue',
            ];
        }

        if ($dueDate->isSameDay($today)) {
            return [
                'is_overdue' => false,
                'days_overdue' => 0,
                'due_status' => 'due_today',
            ];
        }

        if ($dueDate->lte($today->copy()->addDays(3))) {
            return [
                'is_overdue' => false,
                'days_overdue' => 0,
                'due_status' => 'due_soon',
            ];
        }

        return [
            'is_overdue' => false,
            'days_overdue' => 0,
            'due_status' => 'active',
        ];
    }
}
