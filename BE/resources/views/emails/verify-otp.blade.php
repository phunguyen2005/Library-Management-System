<!DOCTYPE html>
<html>
<head>
    <title>Xác thực Email</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .otp-box { background-color: #f4f4f4; border: 1px solid #ddd; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #0056b3; display: inline-block; margin: 20px 0; border-radius: 8px; }
        .footer { margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div style="margin-bottom: 25px;">
            <img src="https://raw.githubusercontent.com/phunguyen2005/Library-Management-System/main/BE/public/logo.png" alt="HCMUE Logo" style="height: 70px; width: auto; display: block; margin: 0 auto; object-fit: contain;">
        </div>
        <h2>Xin chào,</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Thư viện số HCMUE</strong>.</p>
        <p>Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã OTP dưới đây để xác thực địa chỉ email của bạn:</p>
        
        <div class="otp-box">{{ $otp }}</div>
        
        <p>Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        
        <div class="footer">
            <p>Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.</p>
            <p>Trân trọng,<br>Thư viện số HCMUE</p>
        </div>
    </div>
</body>
</html>
