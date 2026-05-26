<?php

namespace App\Support;

class InstitutionalEmail
{
    public static function isAllowed(?string $email): bool
    {
        $email = strtolower(trim((string) $email));

        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function validationMessage(): string
    {
        return 'Email không hợp lệ.';
    }
}
