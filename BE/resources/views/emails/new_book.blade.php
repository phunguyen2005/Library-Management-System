@extends('emails.layouts.master')

@php
    $isAudio = strtoupper($book->file_format ?? '') === 'AUDIO';
    $isDigital = $book->is_digital;
    $category = $book->genre ?? $book->resource_type ?? 'Chưa phân loại';
    
    if ($isAudio) {
        $title = 'Có Audio book mới tại Thư viện!';
        $badge = 'Audio Book';
        $color = '#8b5cf6';
        $bgColor = '#f5f3ff';
        $borderColor = '#ddd6fe';
        $desc = 'Thư viện số HCMUE vừa bổ sung thêm một Audio book mới vào kho lưu trữ số.';
    } elseif ($isDigital) {
        $title = 'Có tài liệu số mới tại Thư viện!';
        $badge = 'Tài liệu số';
        $color = '#0ea5e9';
        $bgColor = '#f0f9ff';
        $borderColor = '#bae6fd';
        $desc = 'Thư viện số HCMUE vừa bổ sung thêm một Tài liệu số mới vào kho lưu trữ số.';
    } else {
        $title = 'Có ấn phẩm mới tại Thư viện!';
        $badge = 'Sách in';
        $color = '#22c55e';
        $bgColor = '#f0fdf4';
        $borderColor = '#bbf7d0';
        $desc = 'Thư viện số HCMUE vừa bổ sung thêm một Ấn phẩm mới vào bộ sưu tập.';
    }
@endphp

@section('title', $title . ' - Thư viện số HCMUE')

@section('content')
    <div style="margin-bottom: 20px;">
        <h1 style="text-align: left; margin-bottom: 5px;">{{ $title }}</h1>
        <p style="color: #64748b; font-size: 14px; text-align: left;">Kính chào {{ $member->name }},</p>
    </div>

    <div style="background-color: {{ $bgColor }}; border: 1px solid {{ $borderColor }}; border-left: 4px solid {{ $color }}; padding: 15px 20px; border-radius: 6px; margin-bottom: 25px;">
        <p style="margin: 0; color: #1e293b;">
            {{ $desc }}
        </p>
    </div>

    <div class="info-card">
        <div class="info-item">
            <span class="info-label">Loại tài liệu:</span>
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: {{ $color }}; color: white; font-size: 12px; font-weight: 600;">
                {{ $badge }}
            </span>
        </div>
        <div class="info-item" style="margin-top: 10px;">
            <span class="info-label">Tên ấn phẩm:</span>
            <span style="font-weight: 500; color: #1e293b;">{{ $book->title }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Tác giả:</span>
            <span>{{ $book->author }}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Thể loại:</span>
            <span>{{ $category }}</span>
        </div>
        
        @if($isDigital || $isAudio)
        <div class="info-item">
            <span class="info-label">Định dạng:</span>
            <span>{{ $book->file_format }} {{ $book->file_size ? '(' . $book->file_size . ')' : '' }}</span>
        </div>
        @endif
    </div>
    
    <div style="text-align: center; margin-top: 30px;">
        <a href="{{ config('app.frontend_url', 'http://localhost:3000') . '/catalog/' . $book->id }}" class="btn">
            Xem thông tin chi tiết
        </a>
    </div>

    <p style="text-align: center; font-size: 13px; color: #64748b; margin-top: 20px;">
        @if($isAudio)
            Bạn có thể truy cập trực tiếp mục <strong>Tài liệu số</strong> trên hệ thống để nghe audio book này.
        @elseif($isDigital)
            Bạn có thể truy cập mục <strong>Tài liệu số</strong> trên hệ thống để đọc hoặc tải tài liệu này.
        @else
            Bạn có thể đến trực tiếp thư viện để mượn ấn phẩm hoặc đặt chỗ trước qua hệ thống.
        @endif
    </p>
@endsection
