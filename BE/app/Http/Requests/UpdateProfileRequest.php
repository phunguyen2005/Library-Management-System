<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:15'],
            'password' => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],
            'otp' => ['nullable', 'string', 'size:6'],
            'notify_due_soon' => ['sometimes', 'boolean'],
            'notify_new_books' => ['sometimes', 'boolean'],
            'notify_borrow_status' => ['sometimes', 'boolean'],
            'notify_room_status' => ['sometimes', 'boolean'],
            'notify_room_reminder' => ['sometimes', 'boolean'],
            'notify_fine_status' => ['sometimes', 'boolean'],
            'notify_reservation' => ['sometimes', 'boolean'],
        ];

        if ($this->filled('password') && !$this->filled('otp')) {
            $rules['current_password'] = ['required', 'string'];
        } else {
            $rules['current_password'] = ['nullable', 'string'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'name.required'                  => __('validation.required', ['attribute' => __('validation.attributes.name')]),
            'name.string'                    => __('validation.string', ['attribute' => __('validation.attributes.name')]),
            'name.max'                       => __('validation.max.string', ['attribute' => __('validation.attributes.name'), 'max' => 255]),
            'phone_number.string'            => __('validation.string', ['attribute' => __('validation.attributes.phone_number')]),
            'phone_number.max'               => __('validation.max.string', ['attribute' => __('validation.attributes.phone_number'), 'max' => 15]),
            'current_password.required'      => __('messages.validation.current_password_required'),
            'current_password.required_with' => __('messages.validation.current_password_required'),
            'current_password.string'        => __('validation.string', ['attribute' => __('validation.attributes.current_password')]),
            'password.confirmed'             => __('validation.confirmed', ['attribute' => __('validation.attributes.password')]),
            'password.min'                   => __('validation.min.string', ['attribute' => __('validation.attributes.password'), 'min' => 8]),
            'password.letters'               => __('messages.validation.password_letters'),
            'password.numbers'               => __('messages.validation.password_numbers'),
        ];
    }
}
