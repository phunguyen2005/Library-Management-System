@extends('emails.layouts.master')

@php
    if ($statusType === 'approved') {
        if ($isReservation) {
            $title = 'Ấn phẩm đặt chỗ trước đã sẵn sàng nhận';
        } else {
            $title = 'Phê duyệt yêu cầu mượn sách';
        }
    } elseif ($statusType === 'rejected') {
        $title = 'Từ chối yêu cầu mượn sách';
    } elseif ($statusType === 'expired') {
        $title = 'Hủy yêu cầu mượn do quá hạn';
    } else {
        $title = 'Cập nhật trạng thái mượn sách';
    }
@endphp

@section('title', $title . ' - Thư viện số HCMUE')

@section('content')
    <div style="margin-bottom: 20px;">
        <h1 style="text-align: left; margin-bottom: 5px;">{{ $title }}</h1>
        <p style="color: #64748b; font-size: 14px; text-align: left;">Xin chào {{ $memberName }},</p>
    </div>

    @if ($statusType === 'approved')
        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px;">
            @if ($isReservation)
                Hệ thống đã tự động khởi tạo và <strong>phê duyệt</strong> yêu cầu mượn ấn phẩm đặt trước cho bạn.
            @else
                Hệ thống thư viện trân trọng thông báo yêu cầu mượn ấn phẩm của bạn đã được <strong>phê duyệt</strong>.
            @endif
        </div>

        <div class="info-card">
            <div class="info-item">
                <span class="info-label">Ấn phẩm:</span>
                <span style="font-weight: 500; color: #1e293b;">{{ $bookTitle }}</span>
            </div>
            @if(isset($loanId))
            <div class="info-item">
                <span class="info-label">Mã phiếu:</span>
                <span>#{{ $loanId }}</span>
            </div>
            @endif
        </div>

        <p style="text-align: center; margin-top: 30px;">
            Vui lòng mang theo <strong>Thẻ sinh viên</strong> hoặc <strong>Mã QR</strong> dưới đây đến quầy thư viện để nhận sách trong thời gian sớm nhất.
        </p>

        @if(isset($qrUrl))
        <div style="text-align: center; margin: 25px 0;">
            <div style="display: inline-block; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <img src="{{ $qrUrl }}" alt="Mã QR Nhận Sách" style="display: block; width: 150px; height: 150px;">
            </div>
            <p style="font-size: 13px; color: #64748b; margin-top: 10px;">Đưa mã này cho thủ thư khi nhận sách</p>
        </div>
        @endif

    @elseif ($statusType === 'rejected')
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px;">
            Hệ thống thư viện rất tiếc phải thông báo: Yêu cầu mượn ấn phẩm của bạn <strong>không được phê duyệt</strong>.
        </div>

        <div class="info-card">
            <div class="info-item">
                <span class="info-label">Ấn phẩm:</span>
                <span style="font-weight: 500; color: #1e293b;">{{ $bookTitle }}</span>
            </div>
            @if(isset($reason))
            <div class="info-item">
                <span class="info-label">Lý do từ chối:</span>
                <span style="color: #ef4444;">{{ $reason }}</span>
            </div>
            @endif
        </div>
        
        <p style="text-align: center; margin-top: 25px;">
            Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ trực tiếp với bộ phận thư viện để được hỗ trợ.
        </p>

    @elseif ($statusType === 'expired')
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 4px; margin-bottom: 25px;">
            Yêu cầu mượn ấn phẩm của bạn đã bị <strong>tự động hủy</strong> do quá thời hạn nhận sách quy định.
        </div>

        <div class="info-card">
            <div class="info-item">
                <span class="info-label">Ấn phẩm:</span>
                <span style="font-weight: 500; color: #1e293b;">{{ $bookTitle }}</span>
            </div>
            @if(isset($loanId))
            <div class="info-item">
                <span class="info-label">Mã phiếu:</span>
                <span>#{{ $loanId }}</span>
            </div>
            @endif
        </div>
        
        <p style="text-align: center; margin-top: 25px;">
            Nếu bạn vẫn có nhu cầu mượn ấn phẩm này, vui lòng tạo một yêu cầu mượn mới trên hệ thống.
        </p>
    @endif

    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ $actionUrl ?? (config('app.frontend_url', 'http://localhost:3000') . '/history') }}" class="btn">
            Xem chi tiết giao dịch
        </a>
    </div>
@endsection
