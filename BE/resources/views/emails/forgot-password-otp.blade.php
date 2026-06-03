<!DOCTYPE html>
<html>
<head>
    <title>Khôi phục mật khẩu</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .otp-box { background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #d32f2f; display: inline-block; margin: 20px 0; border-radius: 8px; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div style="margin-bottom: 25px;">
            <img src="https://raw.githubusercontent.com/phunguyen2005/Library-Management-System/main/BE/public/logo.png" alt="HCMUE Logo" style="height: 70px; width: auto; display: block; margin: 0 auto; object-fit: contain;">
        </div>
        <h2>Xin chào,</h2>
        <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn tại <strong>Thư viện số HCMUE</strong>.</p>
        <p>Vui lòng sử dụng mã OTP dưới đây để đặt lại mật khẩu:</p>
        
        <div class="otp-box">{{ $otp }}</div>
        
        <p>Mã này có hiệu lực trong vòng 60 giây. <strong>Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</strong></p>
        
        <div class="footer">
            <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và kiểm tra lại bảo mật tài khoản.</p>
            <p>Trân trọng,<br>Thư viện số HCMUE</p>
        </div>
    </div>
</body>
</html>
