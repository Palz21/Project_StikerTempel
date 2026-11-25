import {
  CashFlowType,
  DesignStatus,
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PickupMethod,
  PrismaClient,
  Role,
  ServiceCategory,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function monthsAgo(months: number, day: number = 12): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, day, 10, 0, 0, 0);
}

async function main() {
  console.log("Seeding database...");

  // 1. Default accounts (OWNER & ADMIN)
  const ownerPasswordHash = await bcrypt.hash("owner123", 10);
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "owner@sablon.local" },
    update: {
      name: "Pemilik Workshop",
      role: Role.OWNER,
      isActive: true,
    },
    create: {
      name: "Pemilik Workshop",
      email: "owner@sablon.local",
      passwordHash: ownerPasswordHash,
      role: Role.OWNER,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@sablon.local" },
    update: {
      name: "Admin Operasional",
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      name: "Admin Operasional",
      email: "admin@sablon.local",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // 2. Singleton ShopSetting (id = 1)
  await prisma.shopSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: "StikerTempel Custom Print & Sablon",
      whatsappNumber: "6281234567890",
      address: "Jl. Raya Teknik Industri No. 21, Surabaya",
      mapsUrl: "https://maps.google.com/?q=-7.257472,112.752090",
      bankInfo: "BCA 1234567890 a.n. StikerTempel Custom\nBRI 0987654321 a.n. StikerTempel Custom",
    },
  });

  // 3. Raw Materials (5 items, including low-stock samples for overview alert)
  const materialsData = [
    {
      id: "mat-cup-12oz-datar",
      name: "Cup 12oz Datar Polos",
      category: ServiceCategory.CUP,
      stockQty: 1800,
      minStock: 500,
      unit: "pcs",
    },
    {
      id: "mat-cup-16oz-oval",
      name: "Cup 16oz Oval Polos",
      category: ServiceCategory.CUP,
      stockQty: 350, // Below minStock for low-stock alert widget
      minStock: 500,
      unit: "pcs",
    },
    {
      id: "mat-plastik-20x35",
      name: "Plastik Kresek 20x35 Putih",
      category: ServiceCategory.PLASTIK,
      stockQty: 2400,
      minStock: 600,
      unit: "pcs",
    },
    {
      id: "mat-plastik-25x40",
      name: "Plastik Polymailer 25x40 Hitam",
      category: ServiceCategory.PLASTIK,
      stockQty: 250, // Below minStock for low-stock alert widget
      minStock: 400,
      unit: "pcs",
    },
    {
      id: "mat-kaos-combed-30s",
      name: "Kaos Polos Cotton Combed 30s",
      category: ServiceCategory.DTF_BAJU,
      stockQty: 120,
      minStock: 30,
      unit: "pcs",
    },
  ];

  for (const mat of materialsData) {
    await prisma.rawMaterial.upsert({
      where: { id: mat.id },
      update: {
        name: mat.name,
        category: mat.category,
        minStock: mat.minStock,
        unit: mat.unit,
      },
      create: mat,
    });
  }

  // 4. Orders + OrderItems + OrderPayments + synced CashFlows across 6 months
  const seedOrders = [
    {
      orderCode: "ORD-SEED-001",
      source: OrderSource.ADMIN,
      customerName: "Kopi Kenangan Lokal",
      customerWa: "628111000101",
      status: OrderStatus.COMPLETED,
      designStatus: DesignStatus.APPROVED,
      pickupMethod: PickupMethod.SELF_PICKUP,
      totalPrice: 1250000,
      stockDeducted: true,
      createdAt: monthsAgo(5, 8),
      items: [
        {
          category: ServiceCategory.CUP,
          rawMaterialId: "mat-cup-16oz-oval",
          itemName: "Sablon Cup 16oz Oval 1 Warna",
          specs: {
            size: "16oz",
            cupType: "Oval",
            colorCount: 1,
            lidType: "Dome",
          },
          qty: 1000,
          unitPrice: 1250,
          subtotal: 1250000,
        },
      ],
      payments: [
        {
          amount: 500000,
          paymentMethod: PaymentMethod.TRANSFER,
          note: "DP Awal",
          paidAt: monthsAgo(5, 8),
        },
        {
          amount: 750000,
          paymentMethod: PaymentMethod.TRANSFER,
          note: "Pelunasan saat ambil",
          paidAt: monthsAgo(5, 14),
        },
      ],
    },
    {
      orderCode: "ORD-SEED-002",
      source: OrderSource.ADMIN,
      customerName: "Bakery Melati",
      customerWa: "628111000102",
      status: OrderStatus.COMPLETED,
      designStatus: DesignStatus.APPROVED,
      pickupMethod: PickupMethod.EXPEDITION,
      trackingNumber: "JNE-882910331",
      totalPrice: 900000,
      stockDeducted: true,
      createdAt: monthsAgo(4, 10),
      items: [
        {
          category: ServiceCategory.PLASTIK,
          rawMaterialId: "mat-plastik-20x35",
          itemName: "Sablon Plastik Kresek 20x35",
          specs: {
            size: "20x35",
            plasticColor: "Putih Susu",
            colorCount: 1,
            sides: "2 Sisi",
          },
          qty: 1500,
          unitPrice: 600,
          subtotal: 900000,
        },
      ],
      payments: [
        {
          amount: 900000,
          paymentMethod: PaymentMethod.QRIS,
          note: "Bayar lunas di awal",
          paidAt: monthsAgo(4, 10),
        },
      ],
    },
    {
      orderCode: "ORD-SEED-003",
      source: OrderSource.CLIENT_LINK,
      customerName: "Komunitas Sepeda Nusantara",
      customerWa: "628111000103",
      status: OrderStatus.COMPLETED,
      designStatus: DesignStatus.APPROVED,
      pickupMethod: PickupMethod.INSTANT_COURIER,
      totalPrice: 1800000,
      stockDeducted: true,
      createdAt: monthsAgo(3, 15),
      items: [
        {
          category: ServiceCategory.DTF_BAJU,
          rawMaterialId: "mat-kaos-combed-30s",
          itemName: "Sablon DTF Kaos Komunitas",
          specs: {
            apparelType: "Kaos",
            bringOwnApparel: false,
            printArea: "A3 Belakang + Logo Dada",
            sizeBreakdown: "S:4, M:10, L:10, XL:6",
          },
          qty: 30,
          unitPrice: 60000,
          subtotal: 1800000,
        },
      ],
      payments: [
        {
          amount: 1000000,
          paymentMethod: PaymentMethod.TRANSFER,
          note: "DP Produksi",
          paidAt: monthsAgo(3, 15),
        },
        {
          amount: 800000,
          paymentMethod: PaymentMethod.TRANSFER,
          note: "Pelunasan",
          paidAt: monthsAgo(3, 22),
        },
      ],
    },
    {
      orderCode: "ORD-SEED-004",
      source: OrderSource.ADMIN,
      customerName: "Es Teh Segar Jaya",
      customerWa: "628111000104",
      status: OrderStatus.READY_FOR_PICKUP,
      designStatus: DesignStatus.APPROVED,
      pickupMethod: PickupMethod.SELF_PICKUP,
      totalPrice: 1100000,
      stockDeducted: true,
      createdAt: monthsAgo(2, 18),
      items: [
        {
          category: ServiceCategory.CUP,
          rawMaterialId: "mat-cup-12oz-datar",
          itemName: "Sablon Cup 12oz Datar 2 Warna",
          specs: {
            size: "12oz",
            cupType: "Datar",
            colorCount: 2,
            lidType: "Flat",
          },
          qty: 1000,
          unitPrice: 1100,
          subtotal: 1100000,
        },
      ],
      payments: [
        {
          amount: 600000,
          paymentMethod: PaymentMethod.TUNAI,
          note: "DP Tunai",
          paidAt: monthsAgo(2, 18),
        },
      ],
    },
    {
      orderCode: "ORD-SEED-005",
      source: OrderSource.ADMIN,
      customerName: "Distro Lokal Streetwear",
      customerWa: "628111000105",
      status: OrderStatus.IN_PROGRESS,
      designStatus: DesignStatus.APPROVED,
      pickupMethod: PickupMethod.SELF_PICKUP,
      totalPrice: 750000,
      stockDeducted: true,
      createdAt: monthsAgo(1, 11),
      items: [
        {
          category: ServiceCategory.DTF_BAJU,
          rawMaterialId: null, // Client brings own apparel
          itemName: "Jasa Press DTF Hoodie (Bawa Sendiri)",
          specs: {
            apparelType: "Hoodie",
            bringOwnApparel: true,
            printArea: "A3",
            sizeBreakdown: "M:5, L:10, XL:10",
          },
          qty: 25,
          unitPrice: 30000,
          subtotal: 750000,
        },
      ],
      payments: [
        {
          amount: 400000,
          paymentMethod: PaymentMethod.TRANSFER,
          note: "DP Awal",
          paidAt: monthsAgo(1, 11),
        },
      ],
    },
    {
      orderCode: "ORD-SEED-006",
      source: OrderSource.CLIENT_LINK,
      customerName: "Boba House Cabang Timur",
      customerWa: "628111000106",
      status: OrderStatus.PENDING_REVIEW,
      designStatus: DesignStatus.PENDING,
      pickupMethod: PickupMethod.EXPEDITION,
      totalPrice: 0,
      stockDeducted: false,
      createdAt: monthsAgo(0, 5),
      items: [
        {
          category: ServiceCategory.PLASTIK,
          rawMaterialId: "mat-plastik-25x40",
          itemName: "Plastik Polymailer Custom Logo",
          specs: {
            size: "25x40",
            plasticColor: "Hitam",
            colorCount: 1,
            sides: "1 Sisi",
          },
          qty: 500,
          unitPrice: 0,
          subtotal: 0,
        },
      ],
      payments: [],
    },
  ];

  for (const orderSeed of seedOrders) {
    const existing = await prisma.order.findUnique({
      where: { orderCode: orderSeed.orderCode },
    });

    if (existing) {
      continue;
    }

    const createdOrder = await prisma.order.create({
      data: {
        orderCode: orderSeed.orderCode,
        source: orderSeed.source,
        customerName: orderSeed.customerName,
        customerWa: orderSeed.customerWa,
        status: orderSeed.status,
        designStatus: orderSeed.designStatus,
        pickupMethod: orderSeed.pickupMethod,
        trackingNumber: orderSeed.trackingNumber ?? null,
        totalPrice: orderSeed.totalPrice,
        stockDeducted: orderSeed.stockDeducted,
        createdAt: orderSeed.createdAt,
        items: {
          create: orderSeed.items,
        },
      },
    });

    for (const paymentSeed of orderSeed.payments) {
      const createdPayment = await prisma.orderPayment.create({
        data: {
          orderId: createdOrder.id,
          amount: paymentSeed.amount,
          paymentMethod: paymentSeed.paymentMethod,
          note: paymentSeed.note,
          paidAt: paymentSeed.paidAt,
        },
      });

      await prisma.cashFlow.create({
        data: {
          type: CashFlowType.INCOME,
          category: "Pembayaran Order",
          amount: createdPayment.amount,
          orderPaymentId: createdPayment.id,
          orderId: createdOrder.id,
          description: `Pembayaran ${createdOrder.orderCode} - ${createdOrder.customerName}`,
          date: paymentSeed.paidAt,
        },
      });
    }
  }

  // 5. Operational Expense CashFlows across 6 months (idempotent via deterministic IDs)
  const monthlyExpenses = [
    {
      id: "cf-exp-month-5",
      category: "Kulakan Bahan",
      amount: 650000,
      description: "Restock Cup 16oz Oval & Tinta Sablon",
      date: monthsAgo(5, 5),
    },
    {
      id: "cf-exp-month-4",
      category: "Tinta/DTF",
      amount: 420000,
      description: "Beli tinta plastisol & screen sablon",
      date: monthsAgo(4, 7),
    },
    {
      id: "cf-exp-month-3",
      category: "Kulakan Bahan",
      amount: 950000,
      description: "Kulakan Kaos Polos Combed 30s & PET Film DTF",
      date: monthsAgo(3, 9),
    },
    {
      id: "cf-exp-month-2",
      category: "Listrik & Operasional",
      amount: 380000,
      description: "Tagihan listrik mesin press & curing",
      date: monthsAgo(2, 12),
    },
    {
      id: "cf-exp-month-1",
      category: "Tinta/DTF",
      amount: 310000,
      description: "Powder DTF & tinta putih CMYK",
      date: monthsAgo(1, 8),
    },
    {
      id: "cf-exp-month-0",
      category: "Listrik & Operasional",
      amount: 275000,
      description: "Biaya operasional workshop bulan berjalan",
      date: monthsAgo(0, 3),
    },
  ];

  for (const exp of monthlyExpenses) {
    await prisma.cashFlow.upsert({
      where: { id: exp.id },
      update: {},
      create: {
        id: exp.id,
        type: CashFlowType.EXPENSE,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        date: exp.date,
      },
    });
  }

  console.log("Seeding completed.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
