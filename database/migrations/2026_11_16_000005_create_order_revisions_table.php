<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->unsignedInteger('version');
            $table->string('mockup_url');
            $table->text('client_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_revisions');
    }
};
