<?php

namespace App\Services;

use App\Enums\DesignStatus;
use App\Models\Order;
use App\Models\OrderRevision;
use DomainException;
use Illuminate\Support\Facades\DB;

class RevisionService
{
    public function uploadMockup(Order $order, string $mockupUrl, ?string $adminNote = null): OrderRevision
    {
        if ($order->status->isRevisionLocked()) {
            throw new DomainException('Tidak dapat mengunggah mockup baru setelah pesanan masuk Antre Produksi.');
        }

        return DB::transaction(function () use ($order, $mockupUrl, $adminNote): OrderRevision {
            $nextVersion = ((int) $order->revisions()->max('version')) + 1;

            $revision = $order->revisions()->create([
                'version' => $nextVersion,
                'mockup_url' => $mockupUrl,
                'admin_note' => $adminNote,
            ]);

            $order->update([
                'current_mockup_url' => $mockupUrl,
                'design_status' => DesignStatus::WAITING_ACC,
            ]);

            return $revision;
        });
    }

    public function approveDesign(Order $order): Order
    {
        if ($order->status->isRevisionLocked()) {
            throw new DomainException('Status desain sudah dikunci karena pesanan telah masuk produksi.');
        }

        if ($order->current_mockup_url === null) {
            throw new DomainException('Belum ada mockup desain yang dapat disetujui.');
        }

        $order->update([
            'design_status' => DesignStatus::APPROVED,
        ]);

        return $order->fresh();
    }

    public function requestRevision(Order $order, string $clientNote): Order
    {
        if ($order->status->isRevisionLocked()) {
            throw new DomainException('Revisi desain dikunci setelah pesanan masuk Antre Produksi.');
        }

        $trimmedNote = trim($clientNote);
        if ($trimmedNote === '') {
            throw new DomainException('Catatan revisi pelanggan wajib diisi.');
        }

        return DB::transaction(function () use ($order, $trimmedNote): Order {
            $latestRevision = $order->revisions()->first();
            if ($latestRevision !== null) {
                $latestRevision->update(['client_note' => $trimmedNote]);
            }

            $order->update([
                'design_status' => DesignStatus::REVISION_REQUESTED,
                'revision_count' => $order->revision_count + 1,
            ]);

            return $order->fresh(['revisions']);
        });
    }
}
