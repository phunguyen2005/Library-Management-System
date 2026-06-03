@extends('emails.layouts.master')

@section('title', 'CẢNH BÁO QUÁ HẠN: Yêu cầu hoàn trả ấn phẩm khẩn cấp - Thư viện số HCMUE')

@section('content')
    <div style="margin-bottom: 20px;">
        <h1 style="text-align: left; margin-bottom: 5px; color: #b91c1c;">Cảnh báo quá hạn</h1>
        <p style="color: #64748b; font-size: 14px; text-align: left;">Kính chào {{ $memberName }},</p>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 6px; margin-bottom: 25px;">
        <p style="margin: 0; color: #991b1b;">
            Hệ thống thư viện xin thông báo: Ấn phẩm <strong>"{{ $bookTitle }}"</strong> do bạn mượn đã vượt quá thời hạn hoàn trả quy định.
        </p>
    </div>

    <div class="info-card">
        <div class="info-item">
            <span class="info-label">Ấn phẩm:</span>
            <span style="font-weight: 500; color: #1e293b;">{{ $bookTitle }}</span>
        </div>
        <div class="info-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <span class="info-label" style="color: #ef4444;">Hạn trả cuối:</span>
            <span style="font-weight: 700; color: #ef4444; font-size: 16px;">{{ $dueDate }}</span>
        </div>
    </div>
    
    <p style="text-align: left; margin-top: 25px; line-height: 1.7;">
        Để tránh làm ảnh hưởng đến hồ sơ mượn sách và phát sinh thêm các khoản phí phạt chậm trả, yêu cầu bạn mang ấn phẩm đến quầy thư viện hoàn trả ngay lập tức.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ $actionUrl }}" class="btn" style="background-color: #ef4444;">
            Xem lịch sử mượn sách
        </a>
    </div>

    <p style="text-align: center; font-size: 13px; color: #94a3b8; margin-top: 20px; font-style: italic;">
        Trường hợp bạn đã trả sách, vui lòng bỏ qua email này hoặc liên hệ thư viện để kiểm tra lại.
    </p>
@endsection
