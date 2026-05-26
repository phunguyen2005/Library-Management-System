<?php

namespace App\Http\Requests;

use App\Support\InstitutionalEmail;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:members,email',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! InstitutionalEmail::isAllowed((string) $value)) {
                        $fail(InstitutionalEmail::validationMessage());
                    }
                },
            ],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'phone_number' => ['nullable', 'string', 'max:15'],
        ];
    }
}
