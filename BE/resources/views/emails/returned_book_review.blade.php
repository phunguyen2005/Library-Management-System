@extends('emails.layouts.master')

@section('title', 'Xác nhận trả sách & Đánh giá sách - Thư viện số HCMUE')

@section('content')
    <div style="margin-bottom: 20px;">
        <h1 style="text-align: left; margin-bottom: 5px;">Xác nhận hoàn tất trả sách</h1>
        <p style="color: #64748b; font-size: 14px; text-align: left;">Kính chào {{ $memberName }},</p>
    </div>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #22c55e; padding: 15px 20px; border-radius: 6px; margin-bottom: 25px;">
        <p style="margin: 0; color: #166534;">
            Hệ thống xác nhận bạn đã hoàn tất thủ tục trả ấn phẩm <strong>"{{ $bookTitle }}"</strong> vào ngày hôm nay. Cảm ơn bạn đã có ý thức giữ gìn sách và trả đúng hạn!
        </p>
    </div>

    <div style="background-color: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
        <div style="font-size: 32px; margin-bottom: 8px;">🪙</div>
        <div style="font-size: 16px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px;">Tích Lũy Điểm Thưởng Gamification</div>
        <p style="font-size: 14px; line-height: 1.5; color: #1e40af; margin: 0 0 16px 0;">
            Ý kiến đánh giá của bạn sẽ giúp các sinh viên khác lựa chọn được cuốn sách phù hợp. Đồng thời, tích lũy thêm điểm thưởng:
        </p>
        <div style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 13px; font-weight: bold; padding: 8px 16px; border-radius: 9999px; margin: 0 6px 10px;">
            ⭐ +30 XP Kinh nghiệm
        </div>
        <div style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 13px; font-weight: bold; padding: 8px 16px; border-radius: 9999px; margin: 0 6px 10px;">
            🪙 +10 Điểm thưởng
        </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ $reviewUrl }}" class="btn">
            Đánh giá sách ngay
        </a>
    </div>

    <p style="text-align: center; font-size: 13px; color: #94a3b8; margin-top: 20px;">
        Đường link sẽ tự động dẫn bạn đến trang chi tiết sách để gửi đánh giá nhanh chóng.
    </p>
@endsection
