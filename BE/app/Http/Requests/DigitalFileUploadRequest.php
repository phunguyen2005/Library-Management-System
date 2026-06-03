<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DigitalFileUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'extensions:pdf,epub,mp3,wav,m4a,ppt,pptx',
                'max:51200',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required'   => __('messages.validation.file_required'),
            'file.file'       => __('messages.validation.file_invalid'),
            'file.extensions' => __('messages.validation.file_extensions'),
            'file.max'        => __('messages.validation.file_max'),
            'file.uploaded'   => __('messages.validation.file_uploaded'),
        ];
    }
}
