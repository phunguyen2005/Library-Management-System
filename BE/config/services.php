<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'brevo' => [
        'key' => env('BREVO_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/auth/google/callback'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI', 'http://localhost:8000/api/auth/github/callback'),
    ],

    'microsoft' => [
        'client_id' => env('MICROSOFT_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
        'redirect' => env('MICROSOFT_REDIRECT_URI', 'http://localhost:8000/api/auth/microsoft/callback'),
    ],


    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'momo' => [
        'partner_code' => env('MOMO_PARTNER_CODE', 'MOMO_PARTNER_CODE_DEMO'),
        'access_key' => env('MOMO_ACCESS_KEY', 'MOMO_ACCESS_KEY_DEMO'),
        'secret_key' => env('MOMO_SECRET_KEY', 'MOMO_SECRET_KEY_DEMO'),
        'endpoint' => env('MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/create'),
        'redirect_url' => env('MOMO_REDIRECT_URL', 'http://localhost:5173/fines'),
        'ipn_url' => env('MOMO_IPN_URL', 'http://localhost:8000/api/momo/ipn'),
        'simulation' => env('MOMO_SIMULATION', true),
        'personal_phone' => env('MOMO_PERSONAL_PHONE', '0901234567'),
        'personal_name' => env('MOMO_PERSONAL_NAME', 'NGUYEN VAN A'),
    ],

    'vnpay' => [
        'tmn_code' => env('VNPAY_TMN_CODE', '2QXUI4B4'),
        'hash_secret' => env('VNPAY_HASH_SECRET', 'secret'),
        'endpoint' => env('VNPAY_ENDPOINT', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
        'redirect_url' => env('VNPAY_REDIRECT_URL', 'http://localhost:5173/fines'),
        'ipn_url' => env('VNPAY_IPN_URL', 'http://localhost:8000/api/vnpay/ipn'),
        'simulation' => env('VNPAY_SIMULATION', true),
    ],

];

