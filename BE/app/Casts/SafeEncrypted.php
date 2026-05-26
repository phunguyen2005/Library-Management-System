<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

class SafeEncrypted implements CastsAttributes
{
    /**
     * Cast the given value.
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if (is_null($value) || $value === '') {
            return $value;
        }

        try {
            return Crypt::decryptString($value);
        } catch (DecryptException $e) {
            // Decryption failed: this is a legacy plaintext value.
            return $value;
        }
    }

    /**
     * Prepare the given value for storage.
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): mixed
    {
        if (is_null($value) || $value === '') {
            return $value;
        }

        try {
            // Just to be sure, check if it's already a valid encrypted string.
            // If it can be successfully decrypted, it's already encrypted, so store it as is.
            Crypt::decryptString($value);
            return $value;
        } catch (DecryptException $e) {
            // It is plaintext, so encrypt it.
            return Crypt::encryptString($value);
        }
    }
}
