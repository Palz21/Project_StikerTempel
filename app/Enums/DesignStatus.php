<?php

namespace App\Enums;

enum DesignStatus: string
{
    case PENDING = 'PENDING';
    case WAITING_ACC = 'WAITING_ACC';
    case REVISION_REQUESTED = 'REVISION_REQUESTED';
    case APPROVED = 'APPROVED';

    public function label(): string
    {
        return match ($this) {
            self::PENDING => 'Belum Ada Mockup',
            self::WAITING_ACC => 'Menunggu ACC Pelanggan',
            self::REVISION_REQUESTED => 'Perlu Revisi Desain',
            self::APPROVED => 'Desain Disetujui (ACC)',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING => 'gray',
            self::WAITING_ACC => 'info',
            self::REVISION_REQUESTED => 'warning',
            self::APPROVED => 'success',
        };
    }
}
