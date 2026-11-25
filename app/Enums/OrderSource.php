<?php

namespace App\Enums;

enum OrderSource: string
{
    case ADMIN = 'ADMIN';
    case CLIENT_LINK = 'CLIENT_LINK';

    public function label(): string
    {
        return match ($this) {
            self::ADMIN => 'Input Admin (WhatsApp / Langsung)',
            self::CLIENT_LINK => 'Form Mandiri Pelanggan (/order)',
        };
    }
}
