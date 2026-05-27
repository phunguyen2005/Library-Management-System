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
            'file.required'   => 'Vui lòng chọn tệp tin để tải lên.',
            'file.file'       => 'Tệp tải lên không hợp lệ.',
            'file.extensions' => 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận: PDF, EPUB, MP3, WAV, M4A, PPT, PPTX.',
            'file.max'        => 'Kích thước tệp vượt quá giới hạn 50 MB.',
        ];
    }
}
