<?php

namespace App\Enums;

enum CashFlowType: string
{
    case INCOME = 'INCOME';
    case EXPENSE = 'EXPENSE';

    public function label(): string
    {
        return match ($this) {
            self::INCOME => 'Pemasukan',
            self::EXPENSE => 'Pengeluaran',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::INCOME => 'success',
            self::EXPENSE => 'danger',
        };
    }
}
