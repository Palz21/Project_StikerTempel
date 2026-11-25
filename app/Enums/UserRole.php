<?php

namespace App\Enums;

enum UserRole: string
{
    case OWNER = 'OWNER';
    case ADMIN = 'ADMIN';

    public function label(): string
    {
        return match ($this) {
            self::OWNER => 'Owner (Pemilik)',
            self::ADMIN => 'Admin / Karyawan',
        };
    }
}
