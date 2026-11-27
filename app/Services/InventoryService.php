<?php

namespace App\Services;

use App\Enums\CashFlowType;
use App\Models\CashFlow;
use App\Models\RawMaterial;
use DomainException;
use Illuminate\Support\Facades\DB;

class InventoryService
{
    public function restock(
        RawMaterial $material,
        int $addedQty,
        bool $recordExpense = false,
        int $totalCost = 0,
        ?string $note = null
    ): RawMaterial {
        if ($addedQty <= 0) {
            throw new DomainException('Jumlah restock harus lebih dari nol.');
        }

        if ($recordExpense && $totalCost <= 0) {
            throw new DomainException('Nominal biaya kulakan harus lebih dari nol jika dicatat ke arus kas.');
        }

        return DB::transaction(function () use ($material, $addedQty, $recordExpense, $totalCost, $note): RawMaterial {
            $lockedMaterial = RawMaterial::query()->lockForUpdate()->findOrFail($material->id);
            $lockedMaterial->increment('stock_qty', $addedQty);

            if ($recordExpense) {
                $desc = "Restock {$lockedMaterial->name} (+{$addedQty} {$lockedMaterial->unit})";
                if (! empty($note)) {
                    $desc .= " - {$note}";
                }

                CashFlow::create([
                    'type' => CashFlowType::EXPENSE,
                    'category' => 'Kulakan Bahan',
                    'amount' => $totalCost,
                    'description' => $desc,
                    'date' => now(),
                ]);
            }

            return $lockedMaterial->fresh();
        });
    }
}
