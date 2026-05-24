<x-mail::message>
# Có sách mới tại Thư viện!

Chào **{{ $member->name }}**,

Thư viện HCMUE vừa bổ sung thêm một cuốn sách mới vào kho lưu trữ:

- **Tên sách:** {{ $book->title }}
- **Tác giả:** {{ $book->author }}
- **Thể loại:** {{ $book->category }}

Bạn có thể đến thư viện để mượn sách hoặc xem thêm thông tin chi tiết trên trang hệ thống.

Cảm ơn bạn,
Thư viện HCMUE
</x-mail::message>
