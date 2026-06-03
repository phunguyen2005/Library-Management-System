@extends('emails.layouts.master')

@section('title', 'Nhắc nhở: Sách sắp đến hạn trả - Thư viện số HCMUE')

@section('content')
    <div style="margin-bottom: 20px;">
        <h1 style="text-align: left; margin-bottom: 5px;">Nhắc nhở: Sách sắp đến hạn trả</h1>
        <p style="color: #64748b; font-size: 14px; text-align: left;">Kính chào {{ $borrowing->member->name }},</p>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 6px; margin-bottom: 25px;">
        <p style="margin: 0; color: #b45309;">
            Hệ thống thư viện xin nhắc nhở: Ấn phẩm bạn đang mượn <strong>sắp đến hạn trả</strong> trong vòng 2 ngày tới.
        </p>
    </div>

    <div class="info-card">
        <div class="info-item">
            <span class="info-label">Mã phiếu mượn:</span>
            <span>#{{ $borrowing->borrowing_id }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Ấn phẩm:</span>
            <span style="font-weight: 500; color: #1e293b;">{{ $borrowing->book->title }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Ngày mượn:</span>
            <span>{{ $borrowing->borrow_date->format('d/m/Y') }}</span>
        </div>
        <div class="info-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <span class="info-label">Hạn trả:</span>
            <span style="font-weight: 700; color: #f59e0b; font-size: 16px;">{{ $borrowing->due_date->format('d/m/Y') }}</span>
        </div>
    </div>
    
    <p style="text-align: center; margin-top: 25px;">
        Vui lòng mang sách đến thư viện để trả đúng hạn, nhằm tránh ảnh hưởng đến hồ sơ mượn sách và phát sinh phí phạt.
    </p>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.frontend_url', 'http://localhost:3000') . '/history' }}" class="btn">
            Xem lịch sử mượn sách
        </a>
    </div>

    <p style="text-align: center; font-size: 13px; color: #64748b; margin-top: 20px;">
        Nếu bạn cần gia hạn thêm, hãy liên hệ trực tiếp với thủ thư tại quầy thư viện.
    </p>
@endsection
