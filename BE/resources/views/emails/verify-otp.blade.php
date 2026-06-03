@extends('emails.layouts.master')

@section('title', 'Xác thực Email - Thư viện số HCMUE')

@section('content')
    <div class="text-center">
        <h1>Xác thực tài khoản</h1>
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Thư viện số HCMUE</strong>.</p>
        <p>Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP dưới đây để xác thực địa chỉ email của bạn:</p>
        
        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #2563eb; display: inline-block; margin: 25px 0; border-radius: 12px;">
            {{ $otp }}
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
            Mã này có hiệu lực trong vòng <strong>60 giây</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.
        </p>
    </div>
@endsection
