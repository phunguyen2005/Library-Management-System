@extends('emails.layouts.master')

@php
    if ($statusType === 'approved') {
        $title = 'Phê duyệt yêu cầu đặt phòng tự học';
        $color = '#22c55e';
        $bgColor = '#f0fdf4';
        $borderColor = '#bbf7d0';
    } elseif ($statusType === 'rejected') {
        $title = 'Từ chối yêu cầu đặt phòng tự học';
        $color = '#ef4444';
        $bgColor = '#fef2f2';
        $borderColor = '#fecaca';
    } elseif ($statusType === 'cancelled') {
        $title = 'Xác nhận hủy đặt phòng tự học';
        $color = '#64748b';
        $bgColor = '#f8fafc';
        $borderColor = '#e2e8f0';
    } elseif ($statusType === 'no_show') {
        $title = 'Cảnh báo: Vắng mặt lịch đặt phòng tự học';
        $color = '#f59e0b';
        $bgColor = '#fffbeb';
        $borderColor = '#fde68a';
    } else {
        $title = 'Cập nhật lịch đặt phòng tự học';
        $color = '#3b82f6';
        $bgColor = '#eff6ff';
        $borderColor = '#bfdbfe';
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
            @if ($statusType === 'approved')
                Yêu cầu đặt phòng tự học của bạn đã được <strong>phê duyệt thành công</strong>.
            @elseif ($statusType === 'rejected')
                Yêu cầu đặt phòng tự học của bạn <strong>không được phê duyệt</strong>.
            @elseif ($statusType === 'cancelled')
                Lịch đặt phòng tự học của bạn đã được <strong>hủy thành công</strong>.
            @elseif ($statusType === 'no_show')
                Hệ thống ghi nhận bạn đã <strong>không đến check-in</strong> nhận phòng đúng giờ quy định.
            @else
                Hệ thống có một cập nhật mới về lịch đặt phòng của bạn.
            @endif
        </p>
    </div>

    <div class="info-card">
        <div class="info-item">
            <span class="info-label">Phòng học:</span>
            <span style="font-weight: 500; color: #1e293b;">{{ $roomName }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Ngày đặt:</span>
            <span>{{ $dateStr }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Khung giờ:</span>
            <span>{{ $timeStr }}</span>
        </div>
        
        @if ($statusType === 'approved')
        <div class="info-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <span class="info-label">Mã nhận phòng:</span>
            <span style="font-weight: 700; color: #2563eb;">{{ $bookingCode }}</span>
        </div>
        @endif
        
        @if ($reason)
        <div class="info-item" style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
            <span class="info-label" style="color: #ef4444;">Lý do:</span>
            <span style="color: #ef4444;">{{ $reason }}</span>
        </div>
        @endif
    </div>
    
    @if ($statusType === 'approved')
        <p style="text-align: center; margin-top: 25px;">
            Vui lòng đến đúng giờ và thực hiện quét mã check-in tại phòng để bắt đầu sử dụng.
        </p>
        
        @if(isset($qrUrl))
        <div style="text-align: center; margin: 25px 0;">
            <div style="display: inline-block; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <img src="{{ $qrUrl }}" alt="Mã QR Nhận Phòng" style="display: block; width: 150px; height: 150px;">
            </div>
            <p style="font-size: 13px; color: #64748b; margin-top: 10px;">Quét mã này tại phòng học</p>
        </div>
        @endif
    @elseif ($statusType === 'no_show')
        <p style="text-align: center; margin-top: 25px; color: #ef4444;">
            Lịch đặt của bạn đã bị hủy tự động do quá giờ check-in. Vui lòng lưu ý tuân thủ đúng thời gian quy định trong các lần đặt tiếp theo.
        </p>
    @endif
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ $actionUrl }}" class="btn">
            @if ($statusType === 'approved' || $statusType === 'no_show')
                Xem lịch sử đặt phòng
            @else
                Đặt phòng khác
            @endif
        </a>
    </div>
@endsection
