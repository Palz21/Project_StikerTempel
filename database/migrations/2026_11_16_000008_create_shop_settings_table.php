<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_settings', function (Blueprint $table) {
            $table->id();
            $table->string('shop_name')->default('Cindy Advertising');
            $table->string('whatsapp_number', 25)->default('6281234567890');
            $table->text('address')->default('Sidoarjo, Jawa Timur');
            $table->string('maps_url')->nullable();
            $table->text('bank_info')->default('BCA 1234567890 a.n. Cindy Advertising');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_settings');
    }
};
