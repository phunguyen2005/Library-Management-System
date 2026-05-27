<?php

namespace App\Providers;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        \Laravel\Socialite\Facades\Socialite::extend('microsoft', function ($app) {
            $config = $app['config']['services.microsoft'];
            return \Laravel\Socialite\Facades\Socialite::buildProvider(\App\Socialite\MicrosoftProvider::class, $config);
        });

        RateLimiter::for('auth', function (Request $request): Limit {
            $identifier = trim((string) ($request->input('identifier') ?? $request->input('email') ?? ''));

            return Limit::perMinute(5)->by($request->ip().'|'.$identifier);
        });

        // Đăng ký Brevo mail transport (HTTP API, không bị Render Free chặn)
        Mail::extend('brevo', function (array $config) {
            $factory = new BrevoTransportFactory();
            $dsn = new Dsn(
                'brevo+api',
                'default',
                config('services.brevo.key')
            );
            return $factory->create($dsn);
        });
    }
}
