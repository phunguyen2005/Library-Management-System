<x-mail::message>
# Nhắc nhở: Sách sắp đến hạn trả

Chào **{{ $borrowing->member->name }}**,

Phiếu mượn của bạn sắp đến hạn trả trong vòng 2 ngày tới. Dưới đây là thông tin chi tiết:

- **Mã phiếu mượn:** {{ $borrowing->borrowing_id }}
- **Sách mượn:** {{ $borrowing->book->title }}
- **Ngày mượn:** {{ $borrowing->borrow_date->format('d/m/Y') }}
- **Hạn trả:** {{ $borrowing->due_date->format('d/m/Y') }}

Vui lòng mang sách đến thư viện để trả đúng hạn, tránh phát sinh phí phạt. 
Nếu bạn cần gia hạn thêm, hãy liên hệ với thư viện.

Cảm ơn bạn,
Thư viện HCMUE
</x-mail::message>
