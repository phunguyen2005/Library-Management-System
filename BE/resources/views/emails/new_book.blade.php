<x-mail::message>
@php
    $isAudio = strtoupper($book->file_format ?? '') === 'AUDIO';
    $isDigital = $book->is_digital;
    $category = $book->genre ?? $book->resource_type ?? 'Chưa phân loại';
@endphp

@if($isAudio)
# Có audio book mới tại Thư viện!

Chào **{{ $member->name }}**,

Thư viện HCMUE vừa bổ sung thêm một **audio book** mới vào kho lưu trữ số:

- **Tên sách:** {{ $book->title }}
- **Tác giả:** {{ $book->author }}
- **Thể loại:** {{ $category }}
- **Định dạng:** {{ $book->file_format }} {{ $book->file_size ? '(' . $book->file_size . ')' : '' }}

Bạn có thể truy cập trực tiếp mục **Tài liệu số** trên hệ thống để nghe audio book này.
@elseif($isDigital)
# Có tài liệu số mới tại Thư viện!

Chào **{{ $member->name }}**,

Thư viện HCMUE vừa bổ sung thêm một **tài liệu số** mới vào kho lưu trữ:

- **Tên tài liệu:** {{ $book->title }}
- **Tác giả:** {{ $book->author }}
- **Thể loại:** {{ $category }}
- **Định dạng:** {{ $book->file_format }} {{ $book->file_size ? '(' . $book->file_size . ')' : '' }}

Bạn có thể truy cập mục **Tài liệu số** trên hệ thống để đọc hoặc tải tài liệu này.
@else
# Có sách mới tại Thư viện!

Chào **{{ $member->name }}**,

Thư viện HCMUE vừa bổ sung thêm một **cuốn sách mới** vào kho lưu trữ:

- **Tên sách:** {{ $book->title }}
- **Tác giả:** {{ $book->author }}
- **Thể loại:** {{ $category }}

Bạn có thể đến thư viện để mượn sách hoặc xem thêm thông tin chi tiết trên trang hệ thống.
@endif

Cảm ơn bạn,
Thư viện HCMUE
</x-mail::message>
