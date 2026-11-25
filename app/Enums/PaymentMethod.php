<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case TRANSFER = 'TRANSFER';
    case TUNAI = 'TUNAI';
    case QRIS = 'QRIS';

    public function label(): string
    {
        return match ($this) {
            self::TRANSFER => 'Transfer Bank',
            self::TUNAI => 'Tunai',
            self::QRIS => 'QRIS',
        };
    }
}
