<?php

namespace App\Services;

use App\Enums\CashFlowType;
use App\Enums\DesignStatus;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\CashFlow;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RawMaterial;
use DomainException;
use Illuminate\Support\Facades\DB;

class OrderService
{
    public function __construct(
        private readonly PaymentService $paymentService,
    ) {}

    /**
     * Scenario A: Fast Input Order by Admin/Owner.
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, array<string, mixed>>  $items
     */
    public function createFromAdmin(
        array $data,
        array $items,
        int $initialPayment = 0,
        PaymentMethod $paymentMethod = PaymentMethod::TRANSFER
    ): Order {
        if ($items === []) {
            throw new DomainException('Pesanan harus memiliki minimal satu item layanan.');
        }

        return DB::transaction(function () use ($data, $items, $initialPayment, $paymentMethod): Order {
            $targetStatus = $data['status'] ?? OrderStatus::WAITING_ACC_PAYMENT;
            if (is_string($targetStatus)) {
                $targetStatus = OrderStatus::from($targetStatus);
            }

            $order = Order::create([
                'source' => OrderSource::ADMIN,
                'customer_name' => $data['customer_name'],
                'customer_wa' => $data['customer_wa'],
                'status' => $targetStatus === OrderStatus::PRODUCTION_QUEUE
                    ? OrderStatus::WAITING_ACC_PAYMENT
                    : $targetStatus,
                'design_status' => $data['design_status'] ?? DesignStatus::PENDING,
                'pickup_method' => $data['pickup_method'] ?? 'SELF_PICKUP',
                'tracking_number' => $data['tracking_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'total_price' => 0,
                'stock_deducted' => false,
            ]);

            $total = 0;
            foreach ($items as $itemData) {
                $qty = (int) $itemData['qty'];
                $unitPrice = (int) ($itemData['unit_price'] ?? 0);
                $subtotal = $qty * $unitPrice;
                $total += $subtotal;

                $order->items()->create([
                    'category' => $itemData['category'],
                    'raw_material_id' => $itemData['raw_material_id'] ?? null,
                    'item_name' => $itemData['item_name'],
                    'specs' => $itemData['specs'] ?? [],
                    'qty' => $qty,
                    'unit_price' => $unitPrice,
                    'subtotal' => $subtotal,
                    'logo_url' => $itemData['logo_url'] ?? null,
                ]);
            }

            $order->update(['total_price' => $total]);

            if ($initialPayment > 0) {
                $this->paymentService->recordPayment(
                    $order,
                    $initialPayment,
                    $paymentMethod,
                    'Pembayaran awal saat pembuatan pesanan'
                );
            }

            if ($targetStatus === OrderStatus::PRODUCTION_QUEUE) {
                $order = $this->transitionStatus($order, OrderStatus::PRODUCTION_QUEUE);
            }

            return $order->fresh(['items', 'payments', 'revisions']);
        });
    }

    /**
     * Scenario B: Public self-order via /order (Gatekeeper pattern).
     * Never deducts stock or counts revenue until reviewed by Admin.
     *
     * @param  array<string, mixed>  $data
     * @param  array<int, array<string, mixed>>  $items
     */
    public function createFromClientLink(array $data, array $items): Order
    {
        if ($items === []) {
            throw new DomainException('Minimal satu layanan wajib dipilih.');
        }

        return DB::transaction(function () use ($data, $items): Order {
            $order = Order::create([
                'source' => OrderSource::CLIENT_LINK,
                'customer_name' => $data['customer_name'],
                'customer_wa' => $data['customer_wa'],
                'status' => OrderStatus::PENDING_REVIEW,
                'design_status' => DesignStatus::PENDING,
                'pickup_method' => $data['pickup_method'] ?? 'SELF_PICKUP',
                'notes' => $data['notes'] ?? null,
                'total_price' => 0,
                'stock_deducted' => false,
            ]);

            foreach ($items as $itemData) {
                $order->items()->create([
                    'category' => $itemData['category'],
                    'raw_material_id' => $itemData['raw_material_id'] ?? null,
                    'item_name' => $itemData['item_name'],
                    'specs' => $itemData['specs'] ?? [],
                    'qty' => (int) $itemData['qty'],
                    'unit_price' => 0,
                    'subtotal' => 0,
                    'logo_url' => $itemData['logo_url'] ?? null,
                ]);
            }

            return $order->fresh(['items']);
        });
    }

    /**
     * Advance order workflow stage with idempotent stock deduction on PRODUCTION_QUEUE.
     */
    public function transitionStatus(Order $order, OrderStatus $targetStatus): Order
    {
        if ($order->status === OrderStatus::CANCELLED) {
            throw new DomainException('Status pesanan yang sudah dibatalkan tidak dapat diubah.');
        }

        if ($targetStatus === OrderStatus::CANCELLED) {
            throw new DomainException('Gunakan cancelOrder() untuk membatalkan pesanan beserta pencatatan refund.');
        }

        return DB::transaction(function () use ($order, $targetStatus): Order {
            $lockedOrder = Order::query()->with('items')->lockForUpdate()->findOrFail($order->id);

            $shouldDeductStock = ! $lockedOrder->stock_deducted
                && in_array($targetStatus, [
                    OrderStatus::PRODUCTION_QUEUE,
                    OrderStatus::IN_PROGRESS,
                    OrderStatus::READY_FOR_PICKUP,
                    OrderStatus::COMPLETED,
                ], true);

            if ($shouldDeductStock) {
                foreach ($lockedOrder->items as $item) {
                    if ($item->raw_material_id === null) {
                        continue;
                    }

                    $material = RawMaterial::query()->lockForUpdate()->find($item->raw_material_id);
                    if ($material !== null) {
                        $material->decrement('stock_qty', $item->qty);
                    }
                }

                $lockedOrder->stock_deducted = true;
            }

            $lockedOrder->status = $targetStatus;
            $lockedOrder->save();

            return $lockedOrder->fresh(['items', 'payments', 'revisions']);
        });
    }

    /**
     * Update item quantity/price by Admin.
     * Stage 1-2: recalculates order total cleanly.
     * Stage 3 (PRODUCTION_QUEUE): adjusts raw material stock by delta atomically.
     * Stage 4+: locked permanently.
     */
    public function updateItemQuantity(OrderItem $item, int $newQty, ?int $newUnitPrice = null): Order
    {
        if ($newQty <= 0) {
            throw new DomainException('Jumlah item harus lebih dari nol.');
        }

        return DB::transaction(function () use ($item, $newQty, $newUnitPrice): Order {
            $lockedOrder = Order::query()->lockForUpdate()->findOrFail($item->order_id);

            if ($lockedOrder->status->isItemEditLocked()) {
                throw new DomainException('Item dan harga dikunci permanen setelah masuk tahap Proses Pengerjaan.');
            }

            $oldQty = $item->qty;
            $delta = $newQty - $oldQty;

            if ($lockedOrder->stock_deducted && $item->raw_material_id !== null && $delta !== 0) {
                $material = RawMaterial::query()->lockForUpdate()->find($item->raw_material_id);
                if ($material !== null) {
                    if ($delta > 0) {
                        $material->decrement('stock_qty', $delta);
                    } else {
                        $material->increment('stock_qty', abs($delta));
                    }
                }
            }

            $item->qty = $newQty;
            if ($newUnitPrice !== null) {
                $item->unit_price = $newUnitPrice;
            }
            $item->subtotal = $item->qty * $item->unit_price;
            $item->save();

            $newTotal = (int) $lockedOrder->items()->sum('subtotal');
            $lockedOrder->update(['total_price' => $newTotal]);

            return $lockedOrder->fresh(['items', 'payments']);
        });
    }

    /**
     * Soft-cancel order (never hard delete), optional blank stock return, and refund expense entry.
     */
    public function cancelOrder(
        Order $order,
        string $reason,
        int $refundAmount = 0,
        bool $restoreStock = false
    ): Order {
        if ($order->status === OrderStatus::CANCELLED) {
            throw new DomainException('Pesanan ini sudah berstatus dibatalkan.');
        }

        if ($refundAmount < 0) {
            throw new DomainException('Nominal refund tidak boleh negatif.');
        }

        return DB::transaction(function () use ($order, $reason, $refundAmount, $restoreStock): Order {
            $lockedOrder = Order::query()->with('items')->lockForUpdate()->findOrFail($order->id);

            $totalPaid = $lockedOrder->total_paid;
            if ($refundAmount > $totalPaid) {
                throw new DomainException('Nominal refund tidak boleh melebihi total pembayaran yang sudah masuk.');
            }

            if ($restoreStock && $lockedOrder->stock_deducted) {
                foreach ($lockedOrder->items as $item) {
                    if ($item->raw_material_id === null) {
                        continue;
                    }

                    $material = RawMaterial::query()->lockForUpdate()->find($item->raw_material_id);
                    if ($material !== null) {
                        $material->increment('stock_qty', $item->qty);
                    }
                }

                $lockedOrder->stock_deducted = false;
            }

            $lockedOrder->status = OrderStatus::CANCELLED;
            $lockedOrder->cancelled_at = now();
            $lockedOrder->cancel_reason = $reason;
            $lockedOrder->refund_amount = $refundAmount;
            $lockedOrder->save();

            if ($refundAmount > 0) {
                CashFlow::create([
                    'type' => CashFlowType::EXPENSE,
                    'category' => 'Refund Pembatalan',
                    'amount' => $refundAmount,
                    'order_id' => $lockedOrder->id,
                    'description' => "Refund pembatalan {$lockedOrder->order_code} ({$lockedOrder->customer_name}): {$reason}",
                    'date' => now(),
                ]);
            }

            return $lockedOrder->fresh(['items', 'payments', 'cashFlows']);
        });
    }
}
