<?php

namespace Tests\Feature;

use App\Enums\CashFlowType;
use App\Enums\DesignStatus;
use App\Enums\OrderSource;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\ServiceCategory;
use App\Enums\UserRole;
use App\Models\CashFlow;
use App\Models\RawMaterial;
use App\Models\ShopSetting;
use App\Models\User;
use App\Services\FinanceAnalyticsService;
use App\Services\InventoryService;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Services\RevisionService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CoreBackendTest extends TestCase
{
    use RefreshDatabase;

    public function test_root_route_redirects_to_admin_panel(): void
    {
        $this->get('/')->assertRedirect('/admin');
    }

    public function test_baseline_seeder_is_idempotent(): void
    {
        $this->seed();
        $this->seed();

        $this->assertDatabaseHas('users', ['email' => 'owner@cindyadv.local', 'role' => UserRole::OWNER->value]);
        $this->assertDatabaseHas('users', ['email' => 'admin@cindyadv.local', 'role' => UserRole::ADMIN->value]);
        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseHas('shop_settings', ['id' => 1, 'shop_name' => 'Cindy Advertising']);
    }

    public function test_scenario_1_idempotent_stock_deduction_on_production_queue(): void
    {
        $cupMaterial = RawMaterial::create([
            'name' => 'Cup 16oz Oval',
            'category' => ServiceCategory::CUP,
            'stock_qty' => 1000,
            'min_stock' => 100,
            'unit' => 'pcs',
        ]);

        $orderService = app(OrderService::class);
        $order = $orderService->createFromAdmin(
            [
                'customer_name' => 'Kedai Contoh',
                'customer_wa' => '081234567890',
                'status' => OrderStatus::WAITING_ACC_PAYMENT,
            ],
            [
                [
                    'category' => ServiceCategory::CUP->value,
                    'raw_material_id' => $cupMaterial->id,
                    'item_name' => 'Sablon Cup 16oz Oval',
                    'specs' => ['size' => '16oz', 'cupType' => 'Oval', 'colorCount' => 1, 'lidType' => 'Flat'],
                    'qty' => 300,
                    'unit_price' => 1000,
                ],
            ]
        );

        $this->assertSame('6281234567890', $order->customer_wa);
        $this->assertFalse($order->stock_deducted);
        $this->assertSame(1000, $cupMaterial->fresh()->stock_qty);

        // Transition to PRODUCTION_QUEUE deducts stock exactly once
        $order = $orderService->transitionStatus($order, OrderStatus::PRODUCTION_QUEUE);
        $this->assertTrue($order->stock_deducted);
        $this->assertSame(700, $cupMaterial->fresh()->stock_qty);

        // Transition to IN_PROGRESS must NOT deduct again
        $order = $orderService->transitionStatus($order, OrderStatus::IN_PROGRESS);
        $this->assertTrue($order->stock_deducted);
        $this->assertSame(700, $cupMaterial->fresh()->stock_qty);
    }

    public function test_scenario_2_payment_ledger_and_auto_cash_flow_sync(): void
    {
        $orderService = app(OrderService::class);
        $paymentService = app(PaymentService::class);

        $order = $orderService->createFromAdmin(
            [
                'customer_name' => 'Pelanggan Stiker',
                'customer_wa' => '81299998888',
            ],
            [
                [
                    'category' => ServiceCategory::STIKER->value,
                    'item_name' => 'Stiker Vinyl A3+ Kiss-Cut',
                    'specs' => [
                        'material' => 'Vinyl',
                        'size' => 'A3+',
                        'cutType' => 'Kiss-Cut',
                        'lamination' => 'Glossy',
                    ],
                    'qty' => 50,
                    'unit_price' => 10000,
                ],
            ]
        );

        $this->assertSame(500000, $order->total_price);
        $this->assertSame('Belum Bayar', $order->payment_status_label);

        // Partial payment Rp150.000
        $paymentService->recordPayment($order, 150000, PaymentMethod::TRANSFER, 'DP awal');
        $order->refresh();
        $this->assertSame(150000, $order->total_paid);
        $this->assertSame(350000, $order->remaining_balance);
        $this->assertSame('Kurang Rp350.000', $order->payment_status_label);

        // Pay remaining balance ("Isi Sisa Tagihan")
        $paymentService->payRemainingBalance($order, PaymentMethod::TUNAI);
        $order->refresh();
        $this->assertSame(500000, $order->total_paid);
        $this->assertSame(0, $order->remaining_balance);
        $this->assertTrue($order->is_fully_paid);
        $this->assertSame('Lunas', $order->payment_status_label);

        // Verify two INCOME cash_flows auto-created
        $this->assertSame(2, CashFlow::where('order_id', $order->id)->where('type', CashFlowType::INCOME)->count());
        $this->assertSame(500000, (int) CashFlow::where('order_id', $order->id)->sum('amount'));
    }

    public function test_scenario_3_revision_versioning_and_lock_on_production(): void
    {
        $orderService = app(OrderService::class);
        $revisionService = app(RevisionService::class);

        $order = $orderService->createFromClientLink(
            ['customer_name' => 'Klien Mandiri', 'customer_wa' => '08111112222'],
            [
                [
                    'category' => ServiceCategory::DTF_BAJU->value,
                    'item_name' => 'Sablon DTF Kaos',
                    'specs' => ['apparelType' => 'Kaos', 'bringOwnApparel' => true, 'printArea' => 'A3', 'sizeBreakdown' => 'L:10, XL:10'],
                    'qty' => 20,
                ],
            ]
        );

        $this->assertSame(OrderSource::CLIENT_LINK, $order->source);
        $this->assertSame(OrderStatus::PENDING_REVIEW, $order->status);

        $rev1 = $revisionService->uploadMockup($order, '/files/mockup-v1.png', 'Draft pertama');
        $this->assertSame(1, $rev1->version);
        $this->assertSame(DesignStatus::WAITING_ACC, $order->fresh()->design_status);

        $order = $revisionService->requestRevision($order->fresh(), 'Logo mohon diperbesar 2 cm');
        $this->assertSame(DesignStatus::REVISION_REQUESTED, $order->design_status);
        $this->assertSame(1, $order->revision_count);

        $rev2 = $revisionService->uploadMockup($order, '/files/mockup-v2.png', 'Sudah diperbesar');
        $this->assertSame(2, $rev2->version);

        $order = $revisionService->approveDesign($order->fresh());
        $this->assertSame(DesignStatus::APPROVED, $order->design_status);

        // Move to PRODUCTION_QUEUE -> client revision MUST be locked
        $order = $orderService->transitionStatus($order, OrderStatus::PRODUCTION_QUEUE);
        $this->assertTrue($order->status->isRevisionLocked());

        $this->expectException(DomainException::class);
        $revisionService->requestRevision($order, 'Mau ubah warna lagi');
    }

    public function test_scenario_4_soft_cancel_refund_and_net_profit_accuracy(): void
    {
        $material = RawMaterial::create([
            'name' => 'Plastik 20x35',
            'category' => ServiceCategory::PLASTIK,
            'stock_qty' => 500,
            'min_stock' => 50,
            'unit' => 'pcs',
        ]);

        $orderService = app(OrderService::class);
        $analytics = app(FinanceAnalyticsService::class);

        $order = $orderService->createFromAdmin(
            [
                'customer_name' => 'Order Batal',
                'customer_wa' => '08133334444',
                'status' => OrderStatus::PRODUCTION_QUEUE,
            ],
            [
                [
                    'category' => ServiceCategory::PLASTIK->value,
                    'raw_material_id' => $material->id,
                    'item_name' => 'Plastik 20x35 1 Sisi',
                    'specs' => ['size' => '20x35', 'plasticColor' => 'Putih', 'colorCount' => 1, 'sides' => '1 Sisi'],
                    'qty' => 100,
                    'unit_price' => 3000,
                ],
            ],
            initialPayment: 200000
        );

        $this->assertSame(400, $material->fresh()->stock_qty);

        // Soft cancel with Rp150.000 refund and blank stock return
        $cancelled = $orderService->cancelOrder($order, 'Pelanggan batal sebelum cetak', 150000, restoreStock: true);

        $this->assertSame(OrderStatus::CANCELLED, $cancelled->status);
        $this->assertNotNull($cancelled->cancelled_at);
        $this->assertSame(150000, $cancelled->refund_amount);
        $this->assertSame(500, $material->fresh()->stock_qty);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => OrderStatus::CANCELLED->value]);

        // Net profit reflects Rp200.000 income - Rp150.000 refund = Rp50.000
        $summary = $analytics->summary();
        $this->assertSame(200000, $summary['income']);
        $this->assertSame(150000, $summary['expense']);
        $this->assertSame(50000, $summary['net_profit']);
    }

    public function test_scenario_5_rbac_policies_and_auto_cashflow_immutability(): void
    {
        $owner = User::factory()->create(['role' => UserRole::OWNER, 'is_active' => true]);
        $admin = User::factory()->create(['role' => UserRole::ADMIN, 'is_active' => true]);

        $order = app(OrderService::class)->createFromAdmin(
            ['customer_name' => 'Tes Policy', 'customer_wa' => '08155556666'],
            [['category' => ServiceCategory::CUP->value, 'item_name' => 'Cup', 'qty' => 10, 'unit_price' => 5000]],
            initialPayment: 50000
        );

        $autoCashFlow = CashFlow::where('order_id', $order->id)->firstOrFail();
        $manualCashFlow = CashFlow::create([
            'type' => CashFlowType::EXPENSE,
            'category' => 'Tinta',
            'amount' => 25000,
            'description' => 'Beli tinta hitam',
            'date' => now(),
        ]);

        // CashFlowPolicy: OWNER allowed, ADMIN denied, auto row immutable even for OWNER
        $this->assertTrue($owner->can('viewAny', CashFlow::class));
        $this->assertFalse($admin->can('viewAny', CashFlow::class));
        $this->assertFalse($owner->can('update', $autoCashFlow));
        $this->assertFalse($owner->can('delete', $autoCashFlow));
        $this->assertTrue($owner->can('update', $manualCashFlow));
        $this->assertTrue($owner->can('delete', $manualCashFlow));

        // UserPolicy: OWNER only
        $this->assertTrue($owner->can('viewAny', User::class));
        $this->assertFalse($admin->can('viewAny', User::class));
        $this->assertFalse($owner->can('delete', $owner));
        $this->assertTrue($owner->can('delete', $admin));

        // OrderPolicy: no hard delete for anyone
        $this->assertFalse($owner->can('delete', $order));
        $this->assertFalse($admin->can('delete', $order));

        // Inventory restock with cashflow expense
        $material = RawMaterial::create(['name' => 'Vinyl A3+', 'category' => ServiceCategory::STIKER, 'stock_qty' => 10, 'min_stock' => 20, 'unit' => 'lembar']);
        app(InventoryService::class)->restock($material, 100, recordExpense: true, totalCost: 300000);
        $this->assertSame(110, $material->fresh()->stock_qty);
        $this->assertDatabaseHas('cash_flows', ['category' => 'Kulakan Bahan', 'amount' => 300000]);

        // Singleton shop settings
        $setting = ShopSetting::current();
        $this->assertSame('Cindy Advertising', $setting->shop_name);
    }

    public function test_scenario_6_secure_upload_validation_and_path_traversal_protection(): void
    {
        Storage::fake('local_uploads');

        // Reject non-image file
        $badFile = UploadedFile::fake()->create('malware.php', 10, 'application/x-php');
        $this->postJson(route('files.upload'), ['file' => $badFile])
            ->assertStatus(422);

        // Reject image > 2 MB
        $tooBig = UploadedFile::fake()->image('huge.jpg')->size(3000);
        $this->postJson(route('files.upload'), ['file' => $tooBig])
            ->assertStatus(422);

        // Accept valid PNG <= 2 MB and serve it safely
        $validImg = UploadedFile::fake()->image('logo.png', 200, 200);
        $uploadRes = $this->postJson(route('files.upload'), ['file' => $validImg])
            ->assertCreated()
            ->assertJsonStructure(['filename', 'url']);

        $filename = $uploadRes->json('filename');
        Storage::disk('local_uploads')->assertExists($filename);

        $this->get(route('files.show', ['filename' => $filename]))
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        // Path traversal attempt must return 404
        $this->get('/files/..%2F.env')->assertNotFound();
        $this->get('/files/nonexistent.png')->assertNotFound();
    }
}
