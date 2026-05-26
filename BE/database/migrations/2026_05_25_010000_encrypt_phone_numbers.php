<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->widenPhoneColumn('members');
        $this->widenPhoneColumn('librarians');

        $this->encryptPhoneNumbers('members', 'member_id');
        $this->encryptPhoneNumbers('librarians', 'librarian_id');
    }

    public function down(): void
    {
        $this->decryptPhoneNumbers('members', 'member_id');
        $this->decryptPhoneNumbers('librarians', 'librarian_id');
    }

    private function widenPhoneColumn(string $tableName): void
    {
        Schema::table($tableName, function (Blueprint $table): void {
            $table->text('phone_number')->nullable()->change();
        });
    }

    private function encryptPhoneNumbers(string $tableName, string $primaryKey): void
    {
        DB::table($tableName)
            ->whereNotNull('phone_number')
            ->orderBy($primaryKey)
            ->select($primaryKey, 'phone_number')
            ->chunkById(100, function ($rows) use ($tableName, $primaryKey): void {
                foreach ($rows as $row) {
                    $phoneNumber = (string) $row->phone_number;

                    if ($phoneNumber === '' || $this->isEncrypted($phoneNumber)) {
                        continue;
                    }

                    DB::table($tableName)
                        ->where($primaryKey, $row->{$primaryKey})
                        ->update(['phone_number' => Crypt::encryptString($phoneNumber)]);
                }
            }, $primaryKey);
    }

    private function decryptPhoneNumbers(string $tableName, string $primaryKey): void
    {
        DB::table($tableName)
            ->whereNotNull('phone_number')
            ->orderBy($primaryKey)
            ->select($primaryKey, 'phone_number')
            ->chunkById(100, function ($rows) use ($tableName, $primaryKey): void {
                foreach ($rows as $row) {
                    $phoneNumber = (string) $row->phone_number;

                    try {
                        $plainText = Crypt::decryptString($phoneNumber);
                    } catch (DecryptException) {
                        continue;
                    }

                    DB::table($tableName)
                        ->where($primaryKey, $row->{$primaryKey})
                        ->update(['phone_number' => $plainText]);
                }
            }, $primaryKey);
    }

    private function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (DecryptException) {
            return false;
        }
    }
};
