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
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:15'],
            'current_password' => ['required_with:password', 'nullable', 'string'],
            'password' => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Vui lòng nhập họ và tên.',
            'name.string' => 'Họ và tên không hợp lệ.',
            'name.max' => 'Họ và tên không được vượt quá 255 ký tự.',
            'phone_number.string' => 'Số điện thoại không hợp lệ.',
            'phone_number.max' => 'Số điện thoại không được vượt quá 15 ký tự.',
            'current_password.required_with' => 'Vui lòng nhập mật khẩu hiện tại khi đổi mật khẩu.',
            'current_password.string' => 'Mật khẩu hiện tại không hợp lệ.',
            'password.confirmed' => 'Xác nhận mật khẩu mới không khớp.',
            'password.min' => 'Mật khẩu mới phải có ít nhất 8 ký tự.',
            'password.letters' => 'Mật khẩu mới phải có ít nhất một chữ cái.',
            'password.numbers' => 'Mật khẩu mới phải có ít nhất một chữ số.',
        ];
    }
}
