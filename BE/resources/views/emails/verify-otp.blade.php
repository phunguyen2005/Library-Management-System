<!DOCTYPE html>
<html>
<head>
    <title>{{ $copy['title'] }}</title>
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
        <h2>{{ $copy['heading'] }}</h2>
        <p>{{ $copy['intro'] }}</p>
        <p>{{ $copy['instruction'] }}</p>
        
        <div class="otp-box">{{ $otp }}</div>
        
        <p>{{ $copy['validity'] }}</p>
        
        <div class="footer">
            <p>{{ $copy['footer_notice'] }}</p>
            <p>{!! nl2br(e($copy['salutation'])) !!}</p>
        </div>
    </div>
</body>
</html>
