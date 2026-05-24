<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'database' => $this->databaseCheck(),
            'cache' => $this->cacheCheck(),
            'queue' => $this->queueCheck(),
            'storage' => $this->storageCheck(),
            'memory' => $this->memoryCheck(),
        ];

        $status = collect($checks)->every(fn (array $check) => $check['status'] === 'ok')
            ? 'ok'
            : 'degraded';

        return response()->json([
            'status' => $status,
            'checked_at' => now()->toISOString(),
            'checks' => $checks,
        ], $status === 'ok' ? 200 : 503);
    }

    private function databaseCheck(): array
    {
        try {
            DB::select('select 1');

            return [
                'status' => 'ok',
                'message' => 'Database connection is available.',
            ];
        } catch (\Throwable $exception) {
            return [
                'status' => 'fail',
                'message' => $exception->getMessage(),
            ];
        }
    }

    private function cacheCheck(): array
    {
        try {
            $key = 'health:'.Str::uuid();
            Cache::put($key, 'ok', now()->addMinute());
            $value = Cache::get($key);
            Cache::forget($key);

            return [
                'status' => $value === 'ok' ? 'ok' : 'fail',
                'message' => $value === 'ok' ? 'Cache read/write is available.' : 'Cache value mismatch.',
            ];
        } catch (\Throwable $exception) {
            return [
                'status' => 'fail',
                'message' => $exception->getMessage(),
            ];
        }
    }

    private function queueCheck(): array
    {
        try {
            if (! Schema::hasTable(config('queue.connections.database.table', 'jobs'))) {
                return [
                    'status' => 'fail',
                    'message' => 'Jobs table is missing.',
                ];
            }

            return [
                'status' => 'ok',
                'message' => 'Database queue tables are available.',
            ];
        } catch (\Throwable $exception) {
            return [
                'status' => 'fail',
                'message' => $exception->getMessage(),
            ];
        }
    }

    private function storageCheck(): array
    {
        $path = storage_path('app');
        $freeBytes = @disk_free_space($path);
        $totalBytes = @disk_total_space($path);
        $freePercent = $freeBytes && $totalBytes ? round(($freeBytes / $totalBytes) * 100, 1) : null;

        if (! is_writable($path)) {
            return [
                'status' => 'fail',
                'message' => 'Storage path is not writable.',
                'free_percent' => $freePercent,
            ];
        }

        return [
            'status' => ($freePercent === null || $freePercent >= 10.0) ? 'ok' : 'warn',
            'message' => $freePercent === null
                ? 'Storage path is writable.'
                : 'Storage path is writable with '.$freePercent.'% free.',
            'free_percent' => $freePercent,
        ];
    }

    private function memoryCheck(): array
    {
        $usage = memory_get_usage(true);
        $limit = $this->parseMemoryLimit((string) ini_get('memory_limit'));

        if ($limit === null) {
            return [
                'status' => 'ok',
                'message' => 'Memory usage is '.round($usage / 1024 / 1024, 1).' MB with no hard limit.',
                'usage_mb' => round($usage / 1024 / 1024, 1),
            ];
        }

        $usedPercent = round(($usage / $limit) * 100, 1);

        return [
            'status' => $usedPercent < 85.0 ? 'ok' : 'warn',
            'message' => 'Memory usage is '.$usedPercent.'% of configured limit.',
            'usage_mb' => round($usage / 1024 / 1024, 1),
            'limit_mb' => round($limit / 1024 / 1024, 1),
        ];
    }

    private function parseMemoryLimit(string $value): ?int
    {
        $value = trim($value);

        if ($value === '' || $value === '-1') {
            return null;
        }

        $unit = strtolower(substr($value, -1));
        $number = (int) $value;

        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
