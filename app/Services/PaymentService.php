<?php

namespace App\Services;

use App\Enums\CashFlowType;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\CashFlow;
use App\Models\Order;
use App\Models\OrderPayment;
use DomainException;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function recordPayment(
        Order $order,
        int $amount,
        PaymentMethod $method = PaymentMethod::TRANSFER,
        ?string $note = null,
        ?string $proofUrl = null
    ): OrderPayment {
        if ($amount <= 0) {
            throw new DomainException('Nominal pembayaran harus lebih besar dari nol.');
        }

        if ($order->status === OrderStatus::CANCELLED) {
            throw new DomainException('Tidak dapat mencatat pembayaran pada pesanan yang sudah dibatalkan.');
        }

        return DB::transaction(function () use ($order, $amount, $method, $note, $proofUrl): OrderPayment {
            $payment = $order->payments()->create([
                'amount' => $amount,
                'payment_method' => $method,
                'proof_url' => $proofUrl,
                'note' => $note,
                'paid_at' => now(),
            ]);

            CashFlow::create([
                'type' => CashFlowType::INCOME,
                'category' => 'Pembayaran Order',
                'amount' => $amount,
                'order_payment_id' => $payment->id,
                'order_id' => $order->id,
                'description' => "Pembayaran {$order->order_code} ({$order->customer_name})",
                'date' => $payment->paid_at,
            ]);

            return $payment;
        });
    }

    /**
     * Convenience action backing the "Isi Sisa Tagihan" button.
     */
    public function payRemainingBalance(
        Order $order,
        PaymentMethod $method = PaymentMethod::TRANSFER,
        ?string $note = 'Pelunasan sisa tagihan',
        ?string $proofUrl = null
    ): OrderPayment {
        $remaining = $order->fresh()->remaining_balance;

        if ($remaining <= 0) {
            throw new DomainException('Pesanan ini sudah lunas.');
        }

        return $this->recordPayment($order, $remaining, $method, $note, $proofUrl);
    }
}
