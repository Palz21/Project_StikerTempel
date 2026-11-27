<?php

namespace App\Enums;

enum PickupMethod: string
{
    case SELF_PICKUP = 'SELF_PICKUP';
    case INSTANT_COURIER = 'INSTANT_COURIER';
    case EXPEDITION = 'EXPEDITION';

    public function label(): string
    {
        return match ($this) {
            self::SELF_PICKUP => 'Ambil Sendiri di Workshop',
            self::INSTANT_COURIER => 'Kurir Instan',
            self::EXPEDITION => 'Ekspedisi / Kargo',
        };
    }
}
