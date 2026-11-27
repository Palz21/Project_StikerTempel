<?php

namespace App\Models;

use App\Enums\ServiceCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RawMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'stock_qty',
        'min_stock',
        'unit',
    ];

    protected function casts(): array
    {
        return [
            'category' => ServiceCategory::class,
            'stock_qty' => 'integer',
            'min_stock' => 'integer',
        ];
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function getIsLowStockAttribute(): bool
    {
        return $this->stock_qty <= $this->min_stock;
    }

    public function getStockStatusLabelAttribute(): string
    {
        return $this->is_low_stock ? 'Menipis' : 'Aman';
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock_qty', '<=', 'min_stock');
    }
}
