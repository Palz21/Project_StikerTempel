<?php

use App\Enums\PaymentMethod;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->unsignedBigInteger('amount');
            $table->string('payment_method', 20)->default(PaymentMethod::TRANSFER->value);
            $table->string('proof_url')->nullable();
            $table->string('note')->nullable();
            $table->timestamp('paid_at')->useCurrent();
            $table->timestamps();

            $table->index('order_id');
            $table->index('paid_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payments');
    }
};
