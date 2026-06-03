<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $copy['title'] }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 0; background-color: #f8fafc;">
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 24px;">
                            <div style="font-size: 28px; font-weight: 800; color: #ffffff; margin-bottom: 8px; letter-spacing: -0.5px;">{{ $copy['header_brand'] }}</div>
                            <div style="font-size: 14px; color: #93c5fd; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">{{ $copy['header_subtitle'] }}</div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <p style="font-size: 16px; line-height: 24px; color: #334155; margin-top: 0; margin-bottom: 20px;">
                                {{ $copy['greeting'] }}
                            </p>
                            <p style="font-size: 15px; line-height: 24px; color: #475569; margin-bottom: 20px;">
                                {{ $copy['intro'] }}
                            </p>
                            
                            <!-- Gamification Card -->
                            <div style="background-color: #eff6ff; border: 1px dashed #bfdbfe; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0;">
                                <div style="font-size: 16px; font-weight: 700; color: #1e3a8a; margin-bottom: 4px;">{{ $copy['card_title'] }}</div>
                                <p style="font-size: 13px; line-height: 18px; color: #1e40af; margin: 0 0 16px 0;">
                                    {{ $copy['card_body'] }}
                                </p>
                                <div style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 13px; font-weight: bold; padding: 6px 12px; border-radius: 9999px; margin: 0 6px 6px 6px;">
                                    {{ $copy['xp_label'] }}
                                </div>
                                <div style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 13px; font-weight: bold; padding: 6px 12px; border-radius: 9999px; margin: 0 6px 6px 6px;">
                                    {{ $copy['points_label'] }}
                                </div>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin-top: 32px; margin-bottom: 16px;">
                                <a href="{{ $reviewUrl }}" target="_blank" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3), 0 2px 4px -1px rgba(59, 130, 246, 0.15); transition: background-color 0.2s;">
                                    {{ $copy['action'] }}
                                </a>
                            </div>
                            
                            <p style="font-size: 12px; text-align: center; color: #94a3b8; margin-top: 24px;">
                                {{ $copy['helper'] }}
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center;">
                            <div style="font-size: 13px; font-weight: bold; color: #64748b; margin-bottom: 4px;">{{ $copy['full_library'] }}</div>
                            <div style="font-size: 12px; color: #94a3b8;">{{ $copy['support_line'] }}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
