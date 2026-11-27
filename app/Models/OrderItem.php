<?php

namespace App\Models;

use App\Enums\ServiceCategory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'category',
        'raw_material_id',
        'item_name',
        'specs',
        'qty',
        'unit_price',
        'subtotal',
        'logo_url',
    ];

    protected function casts(): array
    {
        return [
            'category' => ServiceCategory::class,
            'specs' => 'array',
            'qty' => 'integer',
            'unit_price' => 'integer',
            'subtotal' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (OrderItem $item): void {
            if ($item->unit_price >= 0 && $item->qty >= 0) {
                $item->subtotal = $item->qty * $item->unit_price;
            }
        });
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function rawMaterial(): BelongsTo
    {
        return $this->belongsTo(RawMaterial::class);
    }
}
