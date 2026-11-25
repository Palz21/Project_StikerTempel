<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\ShopSetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed baseline accounts and Cindy Advertising settings.
     * Extended dummy data (materials, 6-month orders, payments, cash flows) will be added by Anggota 3 (Naufal).
     */
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'owner@cindyadv.local'],
            [
                'name' => 'Ibu Diana (Owner)',
                'password' => Hash::make('owner123'),
                'role' => UserRole::OWNER,
                'is_active' => true,
            ]
        );

        User::query()->firstOrCreate(
            ['email' => 'admin@cindyadv.local'],
            [
                'name' => 'Admin Operasional',
                'password' => Hash::make('admin123'),
                'role' => UserRole::ADMIN,
                'is_active' => true,
            ]
        );

        ShopSetting::current();
    }
}
