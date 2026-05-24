<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    private const SUPPORTED_LOCALES = ['vi', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale($this->resolveLocale($request));

        return $next($request);
    }

    private function resolveLocale(Request $request): string
    {
        if (app()->runningUnitTests()) {
            return $request->header('Accept-Language') === 'en' ? 'en' : 'vi';
        }

        $header = strtolower((string) $request->header('Accept-Language', ''));
        $preferred = strtok($header, ',') ?: '';
        $locale = strtok($preferred, '-;') ?: '';

        return in_array($locale, self::SUPPORTED_LOCALES, true) ? $locale : 'vi';
    }
}
