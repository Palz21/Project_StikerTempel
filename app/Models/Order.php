<?php

namespace App\Models;

use App\Enums\DesignStatus;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PickupMethod;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'order_code',
        'source',
        'customer_name',
        'customer_wa',
        'status',
        'design_status',
        'revision_count',
        'pickup_method',
        'tracking_number',
        'total_price',
        'current_mockup_url',
        'notes',
        'stock_deducted',
        'cancelled_at',
        'cancel_reason',
        'refund_amount',
    ];

    protected function casts(): array
    {
        return [
            'source' => OrderSource::class,
            'status' => OrderStatus::class,
            'design_status' => DesignStatus::class,
            'pickup_method' => PickupMethod::class,
            'revision_count' => 'integer',
            'total_price' => 'integer',
            'stock_deducted' => 'boolean',
            'cancelled_at' => 'datetime',
            'refund_amount' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Order $order): void {
            if (empty($order->uuid)) {
                $order->uuid = (string) Str::uuid();
            }

            if (empty($order->order_code)) {
                $order->order_code = static::generateOrderCode();
            }

            if (! empty($order->customer_wa)) {
                $order->customer_wa = static::normalizeWhatsApp($order->customer_wa);
            }
        });

        static::updating(function (Order $order): void {
            if ($order->isDirty('customer_wa') && ! empty($order->customer_wa)) {
                $order->customer_wa = static::normalizeWhatsApp($order->customer_wa);
            }
        });
    }

    public static function generateOrderCode(): string
    {
        $prefix = 'ORD-'.now()->format('ym').'-';

        $latestCode = static::query()
            ->where('order_code', 'like', $prefix.'%')
            ->orderByDesc('order_code')
            ->value('order_code');

        $nextNumber = $latestCode
            ? ((int) substr($latestCode, strlen($prefix))) + 1
            : 1;

        return $prefix.str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT);
    }

    public static function normalizeWhatsApp(string $rawPhone): string
    {
        $digits = preg_replace('/\D+/', '', $rawPhone) ?? '';

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        if (str_starts_with($digits, '8')) {
            return '62'.$digits;
        }

        return $digits;
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(OrderRevision::class)->orderByDesc('version');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)->orderByDesc('paid_at');
    }

    public function cashFlows(): HasMany
    {
        return $this->hasMany(CashFlow::class);
    }

    public function getTotalPaidAttribute(): int
    {
        if ($this->relationLoaded('payments')) {
            return (int) $this->payments->sum('amount');
        }

        return (int) $this->payments()->sum('amount');
    }

    public function getRemainingBalanceAttribute(): int
    {
        return max(0, (int) $this->total_price - $this->total_paid);
    }

    public function getIsFullyPaidAttribute(): bool
    {
        return $this->total_price > 0 && $this->total_paid >= $this->total_price;
    }

    public function getPaymentStatusLabelAttribute(): string
    {
        $paid = $this->total_paid;

        if ($paid <= 0) {
            return 'Belum Bayar';
        }

        if ($paid < $this->total_price) {
            $remaining = number_format($this->remaining_balance, 0, ',', '.');

            return "Kurang Rp{$remaining}";
        }

        return 'Lunas';
    }

    public function getPaymentStatusColorAttribute(): string
    {
        $paid = $this->total_paid;

        if ($paid <= 0) {
            return 'gray';
        }

        if ($paid < $this->total_price) {
            return 'warning';
        }

        return 'success';
    }
}
