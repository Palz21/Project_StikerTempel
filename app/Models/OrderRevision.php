<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'version',
        'mockup_url',
        'client_note',
        'admin_note',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
