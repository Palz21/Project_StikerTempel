<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShopSetting extends Model
{
    protected $fillable = [
        'shop_name',
        'whatsapp_number',
        'address',
        'maps_url',
        'bank_info',
    ];

    /**
     * Retrieve or lazily create the singleton Cindy Advertising settings row (id = 1).
     */
    public static function current(): self
    {
        return static::query()->firstOrCreate(
            ['id' => 1],
            [
                'shop_name' => 'Cindy Advertising',
                'whatsapp_number' => '6281234567890',
                'address' => 'Sidoarjo, Jawa Timur',
                'maps_url' => null,
                'bank_info' => 'BCA 1234567890 a.n. Cindy Advertising',
            ]
        );
    }
}
