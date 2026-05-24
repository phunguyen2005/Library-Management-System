<?php

namespace App\Services;

use Closure;
use Illuminate\Support\Facades\Cache;

class BookCacheService
{
    private const VERSION_KEY = 'books_cache_version';

    public function remember(string $scope, array $parameters, Closure $resolver, int $seconds = 300): mixed
    {
        $key = sprintf(
            'books:%s:v%s:%s',
            $scope,
            $this->version(),
            md5(json_encode($parameters, JSON_THROW_ON_ERROR)),
        );

        return Cache::remember($key, now()->addSeconds($seconds), $resolver);
    }

    public function bump(): int
    {
        $version = $this->version() + 1;
        Cache::forever(self::VERSION_KEY, $version);

        return $version;
    }

    public function version(): int
    {
        return max(1, (int) Cache::get(self::VERSION_KEY, 1));
    }
}
