<?php

namespace App\Enums;

enum ServiceCategory: string
{
    case CUP = 'CUP';
    case PLASTIK = 'PLASTIK';
    case DTF_BAJU = 'DTF_BAJU';
    case STIKER = 'STIKER';
    case LAINNYA = 'LAINNYA';

    public function label(): string
    {
        return match ($this) {
            self::CUP => 'Gelas Cup Sablon',
            self::PLASTIK => 'Plastik Kemasan / Sablon',
            self::DTF_BAJU => 'Sablon DTF Baju',
            self::STIKER => 'Stiker Custom',
            self::LAINNYA => 'Lainnya',
        };
    }
}
