<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('category', 30);
            $table->foreignId('raw_material_id')->nullable()->constrained('raw_materials')->nullOnDelete();
            $table->string('item_name');
            $table->json('specs')->nullable();
            $table->unsignedInteger('qty');
            $table->unsignedBigInteger('unit_price')->default(0);
            $table->unsignedBigInteger('subtotal')->default(0);
            $table->string('logo_url')->nullable();
            $table->timestamps();

            $table->index('order_id');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
