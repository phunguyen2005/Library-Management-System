<?php

namespace App\Http\Requests;

use App\Models\Member;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class MemberUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $member = $this->route('member');
        $memberId = $member instanceof Member ? $member->member_id : null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('members', 'email')->ignore($memberId, 'member_id'),
            ],
            'phone_number' => ['nullable', 'string', 'max:15'],
            'join_date' => ['nullable', 'date'],
            'password' => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],
            'borrow_suspended_until' => ['nullable', 'date'],
            'level' => ['nullable', 'integer', 'min:1'],
            'xp' => ['nullable', 'integer', 'min:0'],
            'points' => ['nullable', 'integer', 'min:0'],
            'daily_streak' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
