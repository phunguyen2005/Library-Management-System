<?php

namespace App\Http\Requests;

use App\Models\Librarian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class LibrarianUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $librarian = $this->route('librarian');
        $librarianId = $librarian instanceof Librarian ? $librarian->librarian_id : null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('librarians', 'email')->ignore($librarianId, 'librarian_id'),
            ],
            'phone_number' => ['nullable', 'string', 'max:15'],
            'hire_date' => ['nullable', 'date'],
            'password' => ['nullable', 'confirmed', Password::min(8)->letters()->numbers()],
            'role' => ['nullable', 'string', 'in:admin,librarian'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }
}
