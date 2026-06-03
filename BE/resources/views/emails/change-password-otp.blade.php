@extends('emails.layouts.master')

@section('title', 'Xác thực thay đổi mật khẩu - Thư viện số HCMUE')

@section('content')
    <div class="text-center">
        <h1>Xác thực thay đổi mật khẩu</h1>
        <p>Xin chào,</p>
        <p>Chúng tôi nhận được yêu cầu xác thực thay đổi mật khẩu cho tài khoản của bạn tại <strong>Thư viện số HCMUE</strong>.</p>
        <p>Vui lòng sử dụng mã OTP dưới đây để hoàn tất việc cập nhật mật khẩu:</p>
        
        <div style="background-color: #f0fdf4; border: 2px dashed #86efac; padding: 20px; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #16a34a; display: inline-block; margin: 25px 0; border-radius: 12px;">
            {{ $otp }}
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
            Mã này có hiệu lực trong vòng <strong>60 giây</strong>. <span style="color: #16a34a; font-weight: 600;">Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</span>
        </p>
        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
            Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ ngay với ban quản lý để bảo mật tài khoản.
        </p>
    </div>
@endsection
