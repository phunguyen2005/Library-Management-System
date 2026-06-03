<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Thư viện số HCMUE')</title>
    <style>
        /* Base Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        /* Core Layout */
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f5f7;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            line-height: 1.6;
        }
        .email-wrapper {
            width: 100%;
            background-color: #f4f5f7;
            padding: 40px 20px;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        
        /* Header */
        .email-header {
            text-align: center;
            padding: 30px 20px 20px;
            border-bottom: 1px solid #f1f5f9;
        }
        .email-header img {
            height: 60px;
            width: auto;
        }
        
        /* Body */
        .email-body {
            padding: 30px 40px;
        }
        .email-body h1 {
            color: #1e293b;
            font-size: 22px;
            font-weight: 600;
            margin-top: 0;
            margin-bottom: 20px;
            text-align: center;
        }
        .email-body p {
            margin: 0 0 15px;
            font-size: 15px;
        }
        
        /* Components */
        .btn {
            display: inline-block;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 500;
            font-size: 15px;
            text-align: center;
            margin: 20px 0;
        }
        .btn:hover {
            background-color: #1d4ed8;
        }
        
        .info-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-item {
            margin-bottom: 10px;
            font-size: 14px;
        }
        .info-item:last-child {
            margin-bottom: 0;
        }
        .info-label {
            font-weight: 600;
            color: #475569;
            width: 120px;
            display: inline-block;
        }
        
        /* Footer */
        .email-footer {
            text-align: center;
            padding: 20px 40px 30px;
            font-size: 13px;
            color: #64748b;
            background-color: #f8fafc;
        }
        .email-footer a {
            color: #2563eb;
            text-decoration: none;
        }
        .email-footer p {
            margin: 0 0 10px;
        }
        
        /* Utilities */
        .text-center { text-align: center; }
        .text-primary { color: #2563eb; }
        .text-danger { color: #ef4444; }
        .text-success { color: #10b981; }
        .mt-0 { margin-top: 0; }
        .mb-0 { margin-bottom: 0; }
        
        /* Responsive */
        @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 20px 10px; }
            .email-body { padding: 20px; }
            .info-label { display: block; margin-bottom: 4px; }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-container">
            <!-- Header -->
            <div class="email-header">
                <a href="{{ config('app.frontend_url', 'http://localhost:3000') }}" target="_blank">
                    <img src="https://raw.githubusercontent.com/phunguyen2005/Library-Management-System/main/BE/public/logo.png" alt="Thư viện số HCMUE">
                </a>
            </div>
            
            <!-- Body -->
            <div class="email-body">
                @yield('content')
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
                <p>
                    Đây là email tự động từ hệ thống Thư viện số trường Đại học Sư Phạm TP.HCM (HCMUE).<br>
                    Vui lòng không trả lời trực tiếp email này.
                </p>
                <p>
                    Nếu bạn cần hỗ trợ, vui lòng liên hệ <a href="mailto:support@hcmue.edu.vn">support@hcmue.edu.vn</a>.
                </p>
                <p style="margin-top: 15px; margin-bottom: 0;">
                    &copy; {{ date('Y') }} Thư viện số HCMUE. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
