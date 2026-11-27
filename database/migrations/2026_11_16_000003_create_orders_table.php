<?php

use App\Enums\DesignStatus;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PickupMethod;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('order_code', 32)->unique();
            $table->string('source', 20)->default(OrderSource::ADMIN->value);
            $table->string('customer_name');
            $table->string('customer_wa', 25);
            $table->string('status', 30)->default(OrderStatus::WAITING_ACC_PAYMENT->value);
            $table->string('design_status', 30)->default(DesignStatus::PENDING->value);
            $table->unsignedInteger('revision_count')->default(0);
            $table->string('pickup_method', 30)->default(PickupMethod::SELF_PICKUP->value);
            $table->string('tracking_number')->nullable();
            $table->unsignedBigInteger('total_price')->default(0);
            $table->string('current_mockup_url')->nullable();
            $table->text('notes')->nullable();

            // Idempotency guard to prevent duplicate stock deduction
            $table->boolean('stock_deducted')->default(false);

            // Soft cancellation & refund tracking (no hard delete)
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->unsignedBigInteger('refund_amount')->default(0);

            $table->timestamps();

            $table->index('status');
            $table->index('design_status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
