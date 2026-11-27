<?php

namespace App\Enums;

enum OrderStatus: string
{
    case PENDING_REVIEW = 'PENDING_REVIEW';
    case WAITING_ACC_PAYMENT = 'WAITING_ACC_PAYMENT';
    case PRODUCTION_QUEUE = 'PRODUCTION_QUEUE';
    case IN_PROGRESS = 'IN_PROGRESS';
    case READY_FOR_PICKUP = 'READY_FOR_PICKUP';
    case COMPLETED = 'COMPLETED';
    case CANCELLED = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::PENDING_REVIEW => 'Pesanan Masuk',
            self::WAITING_ACC_PAYMENT => 'Menunggu ACC & Bayar',
            self::PRODUCTION_QUEUE => 'Antre Produksi',
            self::IN_PROGRESS => 'Proses Pengerjaan',
            self::READY_FOR_PICKUP => 'Siap Diambil / Dikirim',
            self::COMPLETED => 'Selesai',
            self::CANCELLED => 'Dibatalkan',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::PENDING_REVIEW => 'gray',
            self::WAITING_ACC_PAYMENT => 'warning',
            self::PRODUCTION_QUEUE => 'info',
            self::IN_PROGRESS => 'primary',
            self::READY_FOR_PICKUP => 'success',
            self::COMPLETED => 'success',
            self::CANCELLED => 'danger',
        };
    }

    public function stageOrder(): int
    {
        return match ($this) {
            self::PENDING_REVIEW => 1,
            self::WAITING_ACC_PAYMENT => 2,
            self::PRODUCTION_QUEUE => 3,
            self::IN_PROGRESS => 4,
            self::READY_FOR_PICKUP => 5,
            self::COMPLETED => 6,
            self::CANCELLED => 0,
        };
    }

    /**
     * Revisions by clients are locked once the order enters PRODUCTION_QUEUE or later.
     */
    public function isRevisionLocked(): bool
    {
        return in_array($this, [
            self::PRODUCTION_QUEUE,
            self::IN_PROGRESS,
            self::READY_FOR_PICKUP,
            self::COMPLETED,
            self::CANCELLED,
        ], true);
    }

    public function isItemEditLocked(): bool
    {
        return in_array($this, [
            self::IN_PROGRESS,
            self::READY_FOR_PICKUP,
            self::COMPLETED,
            self::CANCELLED,
        ], true);
    }
}
