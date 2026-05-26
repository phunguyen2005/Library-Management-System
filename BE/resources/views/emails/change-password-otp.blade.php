<!DOCTYPE html>
<html>
<head>
    <title>Xác thực thay đổi mật khẩu</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .otp-box { background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #0284c7; display: inline-block; margin: 20px 0; border-radius: 8px; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div style="margin-bottom: 25px;">
            <img src="{{ $message->embed(public_path('logo.png')) }}" alt="HCMUE Logo" style="height: 75px; width: auto; object-fit: contain;">
        </div>
        <h2>Xin chào,</h2>
        <p>Chúng tôi nhận được yêu cầu xác thực thay đổi mật khẩu cho tài khoản của bạn tại <strong>Thư viện số HCMUE</strong>.</p>
        <p>Vui lòng sử dụng mã OTP dưới đây để hoàn tất việc cập nhật mật khẩu:</p>
        
        <div class="otp-box">{{ $otp }}</div>
        
        <p>Mã này có hiệu lực trong vòng 5 phút. <strong>Tuyệt đối không chia sẻ mã này cho bất kỳ ai khác.</strong></p>
        
        <div class="footer">
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng liên hệ ngay với ban quản lý để bảo mật tài khoản.</p>
            <p>Trân trọng,<br>Thư viện số HCMUE</p>
        </div>
    </div>
</body>
</html>
