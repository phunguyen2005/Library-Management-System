<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class LocalizedContent
{
    public static function message(string $key, array $params = []): array
    {
        return [
            'message_key' => $key,
            'message_params' => $params,
            'message' => __($key, $params),
        ];
    }

    public static function notification(array $data): array
    {
        return self::localizeArray($data);
    }

    public static function withLocale(?string $locale, callable $callback): mixed
    {
        $previousLocale = App::getLocale();

        if ($locale) {
            App::setLocale($locale);
        }

        try {
            return $callback();
        } finally {
            App::setLocale($previousLocale);
        }
    }

    public static function response(Response $response): Response
    {
        if (! $response instanceof JsonResponse) {
            return $response;
        }

        $payload = $response->getData(true);

        if (is_array($payload)) {
            $response->setData(self::localizeArray($payload));
        }

        return $response;
    }

    private static function localizeArray(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $payload[$key] = self::localizeArray($value);
            }
        }

        if (isset($payload['message_key']) && is_string($payload['message_key'])) {
            $payload['message'] = __(
                $payload['message_key'],
                self::translationParams($payload['message_params'] ?? [])
            );
        } elseif (isset($payload['message']) && is_string($payload['message'])) {
            $payload['message'] = self::literal($payload['message']);
        }

        if (isset($payload['title_key']) && is_string($payload['title_key'])) {
            $payload['title'] = __(
                $payload['title_key'],
                self::translationParams($payload['title_params'] ?? [])
            );
        } elseif (isset($payload['title']) && is_string($payload['title'])) {
            $payload['title'] = self::literal($payload['title']);
        }

        if (isset($payload['description']) && is_string($payload['description'])) {
            $payload['description'] = self::literal($payload['description']);
        }

        return $payload;
    }

    private static function translationParams(mixed $params): array
    {
        if (! is_array($params)) {
            return [];
        }

        return array_filter($params, static fn ($key) => is_string($key), ARRAY_FILTER_USE_KEY);
    }

    private static function literal(string $text): string
    {
        $catalog = __('messages.literal');

        if (is_array($catalog) && array_key_exists($text, $catalog)) {
            return $catalog[$text];
        }

        $prefixCatalog = __('messages.literal_prefix');

        if (is_array($prefixCatalog)) {
            foreach ($prefixCatalog as $sourcePrefix => $targetPrefix) {
                if (is_string($sourcePrefix) && is_string($targetPrefix) && str_starts_with($text, $sourcePrefix)) {
                    return $targetPrefix.substr($text, strlen($sourcePrefix));
                }
            }
        }

        return $text;
    }
}
