@extends('emails.layouts.master')

@php
    if ($statusType === 'paid') {
        $title = 'Xác nhận thanh toán khoản phạt';
        $color = '#22c55e';
        $bgColor = '#f0fdf4';
        $borderColor = '#bbf7d0';
    } elseif ($statusType === 'waived') {
        $title = 'Thông báo miễn giảm khoản phạt';
        $color = '#3b82f6';
        $bgColor = '#eff6ff';
        $borderColor = '#bfdbfe';
    } else {
        $title = 'Thông báo khoản phạt mới phát sinh';
        $color = '#f59e0b';
        $bgColor = '#fffbeb';
        $borderColor = '#fde68a';
    }
@endphp

@section('title', $title . ' - Thư viện số HCMUE')

@section('content')
    <div style="margin-bottom: 20px;">
        <h1 style="text-align: left; margin-bottom: 5px;">{{ $title }}</h1>
        <p style="color: #64748b; font-size: 14px; text-align: left;">Kính chào {{ $memberName }},</p>
    </div>

    <div style="background-color: {{ $bgColor }}; border: 1px solid {{ $borderColor }}; border-left: 4px solid {{ $color }}; padding: 15px 20px; border-radius: 6px; margin-bottom: 25px;">
        <p style="margin: 0; color: #1e293b;">
            @if ($statusType === 'paid')
                Hệ thống thư viện xác nhận bạn đã <strong>thanh toán thành công</strong> khoản phạt.
            @elseif ($statusType === 'waived')
                Hệ thống thư viện thông báo: Khoản phạt của bạn đã được <strong>miễn giảm</strong> bởi thủ thư.
            @else
                Hệ thống thư viện thông báo bạn có một khoản phạt <strong>mới phát sinh</strong>.
            @endif
        </p>
    </div>

    <div class="info-card">
        <div class="info-item">
            <span class="info-label">Ấn phẩm:</span>
            <span style="font-weight: 500; color: #1e293b;">{{ $bookTitle }}</span>
        </div>
        @if ($reason)
        <div class="info-item">
            <span class="info-label">Lý do phạt:</span>
            <span>{{ $reason }}</span>
        </div>
        @endif
        <div class="info-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <span class="info-label">Số tiền phạt:</span>
            <span style="font-weight: 700; color: {{ $color }}; font-size: 16px;">{{ $amount }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Trạng thái:</span>
            <span style="font-weight: 600; color: {{ $color }};">
                @if ($statusType === 'paid')
                    Đã thanh toán
                @elseif ($statusType === 'waived')
                    Đã miễn phạt
                @else
                    Chưa thanh toán
                @endif
            </span>
        </div>
    </div>
    
    @if ($statusType !== 'paid' && $statusType !== 'waived')
        <p style="text-align: center; margin-top: 25px;">
            Vui lòng thanh toán khoản phạt sớm để tránh ảnh hưởng đến quyền lợi mượn sách tiếp theo của bạn.
        </p>
    @endif
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ $actionUrl }}" class="btn" style="background-color: {{ $statusType === 'paid' || $statusType === 'waived' ? '#2563eb' : '#f59e0b' }};">
            @if ($statusType === 'paid' || $statusType === 'waived')
                Xem chi tiết tài khoản
            @else
                Thanh toán khoản phạt ngay
            @endif
        </a>
    </div>
@endsection
