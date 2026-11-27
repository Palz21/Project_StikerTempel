<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_flows', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20);
            $table->string('category', 80);
            $table->unsignedBigInteger('amount');
            $table->foreignId('order_payment_id')->nullable()->unique()->constrained('order_payments')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->text('description')->nullable();
            $table->timestamp('date')->useCurrent();
            $table->timestamps();

            $table->index(['date', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_flows');
    }
};
