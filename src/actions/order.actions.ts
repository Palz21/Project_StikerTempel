"use server";

import { revalidatePath } from "next/cache";
import {
  CashFlowType,
  DesignStatus,
  OrderSource,
  OrderStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  calculatePaymentSummary,
  generateOrderCode,
  normalizeWhatsapp,
} from "@/lib/formatters";
import {
  advanceOrderStatusSchema,
  cancelOrderSchema,
  confirmPendingOrderSchema,
  createAdminOrderSchema,
  createClientOrderSchema,
  updateOrderItemsSchema,
  type AdvanceOrderStatusInput,
  type CancelOrderInput,
  type ConfirmPendingOrderInput,
  type CreateAdminOrderInput,
  type CreateClientOrderInput,
  type UpdateOrderItemsInput,
} from "@/lib/validations";

const STAGE_ORDER: Record<OrderStatus, number> = {
  PENDING_REVIEW: 1,
  WAITING_ACC_PAYMENT: 2,
  PRODUCTION_QUEUE: 3,
  IN_PROGRESS: 4,
  READY_FOR_PICKUP: 5,
  COMPLETED: 6,
  CANCELLED: 99,
};

async function allocateOrderCode(tx: Prisma.TransactionClient): Promise<string> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `ORD-${yy}${mm}-`;

  const latest = await tx.order.findFirst({
    where: { orderCode: { startsWith: prefix } },
    orderBy: { orderCode: "desc" },
    select: { orderCode: true },
  });

  const lastSeq = latest
    ? Number.parseInt(latest.orderCode.slice(prefix.length), 10) || 0
    : 0;

  return generateOrderCode(lastSeq + 1, now);
}

/**
 * Idempotent stock deduction inside an active Prisma transaction.
 */
async function deductStockForOrderTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  items: Array<{ rawMaterialId: string | null; qty: number }>
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { stockDeducted: true },
  });

  if (!order || order.stockDeducted) {
    return;
  }

  const requiredByMaterial = new Map<string, number>();
  for (const item of items) {
    if (!item.rawMaterialId) continue;
    requiredByMaterial.set(
      item.rawMaterialId,
      (requiredByMaterial.get(item.rawMaterialId) ?? 0) + item.qty
    );
  }

  for (const [materialId, requiredQty] of requiredByMaterial.entries()) {
    const material = await tx.rawMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, name: true, stockQty: true, unit: true },
    });

    if (!material) {
      throw new Error("Bahan baku tertaut tidak ditemukan di inventori.");
    }

    if (material.stockQty < requiredQty) {
      throw new Error(
        `Stok "${material.name}" tidak mencukupi (tersedia ${material.stockQty} ${material.unit}, dibutuhkan ${requiredQty} ${material.unit}).`
      );
    }

    await tx.rawMaterial.update({
      where: { id: materialId },
      data: { stockQty: { decrement: requiredQty } },
    });
  }

  await tx.order.update({
    where: { id: orderId },
    data: { stockDeducted: true },
  });
}

/**
 * Scenario A — Admin Fast Input Order.
 * Atomically creates Order, OrderItems, optional initial payment -> CashFlow,
 * and deducts stock if started directly in PRODUCTION_QUEUE.
 */
export async function createAdminOrderAction(
  input: CreateAdminOrderInput
): Promise<
  ActionResult<{ id: string; uuid: string; orderCode: string; totalPrice: number }>
> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = createAdminOrderSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data pesanan tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;
  const normalizedWa = normalizeWhatsapp(data.customerWa);
  if (normalizedWa.length < 10) {
    return fail("Nomor WhatsApp pelanggan tidak valid.", {
      customerWa: ["Nomor WhatsApp minimal 10 digit."],
    });
  }

  const preparedItems = data.items.map((item) => {
    const isBringOwnApparel =
      item.category === "DTF_BAJU" && item.specs.bringOwnApparel;
    const subtotal = item.qty * item.unitPrice;
    return {
      category: item.category,
      rawMaterialId: isBringOwnApparel ? null : (item.rawMaterialId ?? null),
      itemName: item.itemName,
      specs: item.specs as Prisma.InputJsonValue,
      qty: item.qty,
      unitPrice: item.unitPrice,
      subtotal,
      logoUrl: item.logoUrl ?? null,
    };
  });

  const totalPrice = preparedItems.reduce((sum, item) => sum + item.subtotal, 0);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const orderCode = await allocateOrderCode(tx);
      const isDirectProduction = data.initialStatus === "PRODUCTION_QUEUE";

      const order = await tx.order.create({
        data: {
          orderCode,
          source: OrderSource.ADMIN,
          customerName: data.customerName,
          customerWa: normalizedWa,
          status: data.initialStatus,
          designStatus: isDirectProduction
            ? DesignStatus.APPROVED
            : DesignStatus.PENDING,
          pickupMethod: data.pickupMethod,
          totalPrice,
          notes: data.notes || null,
          stockDeducted: false,
          items: {
            create: preparedItems,
          },
        },
        select: {
          id: true,
          uuid: true,
          orderCode: true,
          totalPrice: true,
        },
      });

      if (isDirectProduction) {
        await deductStockForOrderTx(tx, order.id, preparedItems);
      }

      if (data.initialPaymentAmount > 0) {
        const payment = await tx.orderPayment.create({
          data: {
            orderId: order.id,
            amount: data.initialPaymentAmount,
            paymentMethod: data.initialPaymentMethod,
            note: data.initialPaymentNote || "Pembayaran awal",
          },
        });

        await tx.cashFlow.create({
          data: {
            type: CashFlowType.INCOME,
            category: "Pembayaran Order",
            amount: payment.amount,
            orderPaymentId: payment.id,
            orderId: order.id,
            description: `Pembayaran ${order.orderCode} - ${data.customerName}`,
            date: payment.paidAt,
          },
        });
      }

      return order;
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/finance");
    revalidatePath("/admin");

    return ok(created, "Pesanan berhasil dibuat.");
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Gagal membuat pesanan baru."
    );
  }
}

/**
 * Scenario B — Public Client Self-Service Order (/order).
 * Enters as PENDING_REVIEW with zero stock deduction and zero revenue impact.
 */
export async function createClientOrderAction(
  input: CreateClientOrderInput
): Promise<ActionResult<{ uuid: string; orderCode: string }>> {
  const parsed = createClientOrderSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Formulir pemesanan belum lengkap atau tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const data = parsed.data;
  const normalizedWa = normalizeWhatsapp(data.customerWa);
  if (normalizedWa.length < 10) {
    return fail("Nomor WhatsApp tidak valid.", {
      customerWa: ["Masukkan nomor WhatsApp aktif minimal 10 digit."],
    });
  }

  const preparedItems = data.items.map((item) => {
    const isBringOwnApparel =
      item.category === "DTF_BAJU" && item.specs.bringOwnApparel;
    return {
      category: item.category,
      rawMaterialId: isBringOwnApparel ? null : (item.rawMaterialId ?? null),
      itemName: item.itemName,
      specs: item.specs as Prisma.InputJsonValue,
      qty: item.qty,
      unitPrice: 0,
      subtotal: 0,
      logoUrl: item.logoUrl ?? null,
    };
  });

  const created = await prisma.$transaction(async (tx) => {
    const orderCode = await allocateOrderCode(tx);

    return tx.order.create({
      data: {
        orderCode,
        source: OrderSource.CLIENT_LINK,
        customerName: data.customerName,
        customerWa: normalizedWa,
        status: OrderStatus.PENDING_REVIEW,
        designStatus: DesignStatus.PENDING,
        pickupMethod: data.pickupMethod,
        totalPrice: 0,
        notes: data.notes || null,
        stockDeducted: false,
        items: {
          create: preparedItems,
        },
      },
      select: {
        uuid: true,
        orderCode: true,
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return ok(created, "Pesanan masuk dan menunggu verifikasi admin.");
}

/**
 * Admin confirms a PENDING_REVIEW order (Scenario B), sets final prices,
 * and moves it to WAITING_ACC_PAYMENT.
 */
export async function confirmPendingOrderAction(
  input: ConfirmPendingOrderInput
): Promise<ActionResult<{ id: string; uuid: string; totalPrice: number }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = confirmPendingOrderSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data konfirmasi pesanan tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { orderId, items, notes } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (order.status !== OrderStatus.PENDING_REVIEW) {
    return fail("Hanya pesanan berstatus Pesanan Masuk yang dapat dikonfirmasi.");
  }

  const itemIds = new Set(order.items.map((item) => item.id));
  for (const item of items) {
    if (!itemIds.has(item.itemId)) {
      return fail("Terdapat item yang tidak termasuk dalam pesanan ini.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let totalPrice = 0;

    for (const item of items) {
      const subtotal = item.qty * item.unitPrice;
      totalPrice += subtotal;

      await tx.orderItem.update({
        where: { id: item.itemId },
        data: {
          rawMaterialId: item.rawMaterialId ?? null,
          qty: item.qty,
          unitPrice: item.unitPrice,
          subtotal,
        },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        totalPrice,
        status: OrderStatus.WAITING_ACC_PAYMENT,
        notes: notes !== undefined ? notes : order.notes,
      },
      select: { id: true, uuid: true, totalPrice: true },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/track/${result.uuid}`);
  revalidatePath("/admin");

  return ok(result, "Pesanan berhasil dikonfirmasi dan siap ditagihkan.");
}

/**
 * Edit item quantities/prices in Stage 1-2, or Stage 3 with atomic stock delta adjustment.
 */
export async function updateOrderItemsAction(
  input: UpdateOrderItemsInput
): Promise<ActionResult<{ id: string; totalPrice: number }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = updateOrderItemsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data perubahan item tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { orderId, items } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  const editableStatuses: OrderStatus[] = [
    OrderStatus.PENDING_REVIEW,
    OrderStatus.WAITING_ACC_PAYMENT,
    OrderStatus.PRODUCTION_QUEUE,
  ];
  if (!editableStatuses.includes(order.status)) {
    return fail(
      "Item dan harga sudah terkunci permanen setelah masuk Proses Pengerjaan."
    );
  }

  const existingById = new Map(order.items.map((item) => [item.id, item]));
  for (const patch of items) {
    if (!existingById.has(patch.itemId)) {
      return fail("Item tidak ditemukan pada pesanan ini.");
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      let newTotalPrice = 0;

      for (const patch of items) {
        const current = existingById.get(patch.itemId)!;
        const deltaQty = patch.qty - current.qty;

        if (order.stockDeducted && current.rawMaterialId && deltaQty !== 0) {
          const material = await tx.rawMaterial.findUnique({
            where: { id: current.rawMaterialId },
            select: { name: true, stockQty: true, unit: true },
          });

          if (!material) {
            throw new Error("Bahan baku tertaut tidak ditemukan.");
          }

          if (deltaQty > 0 && material.stockQty < deltaQty) {
            throw new Error(
              `Stok "${material.name}" kurang untuk penambahan ${deltaQty} ${material.unit}.`
            );
          }

          await tx.rawMaterial.update({
            where: { id: current.rawMaterialId },
            data:
              deltaQty > 0
                ? { stockQty: { decrement: deltaQty } }
                : { stockQty: { increment: Math.abs(deltaQty) } },
          });
        }

        const subtotal = patch.qty * patch.unitPrice;
        newTotalPrice += subtotal;

        await tx.orderItem.update({
          where: { id: patch.itemId },
          data: {
            qty: patch.qty,
            unitPrice: patch.unitPrice,
            subtotal,
          },
        });
      }

      // Include untouched items in totalPrice if partial update was sent
      const patchedIds = new Set(items.map((i) => i.itemId));
      for (const item of order.items) {
        if (!patchedIds.has(item.id)) {
          newTotalPrice += item.subtotal;
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { totalPrice: newTotalPrice },
        select: { id: true, uuid: true, totalPrice: true },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/inventory");
    revalidatePath(`/track/${updated.uuid}`);

    return ok(
      { id: updated.id, totalPrice: updated.totalPrice },
      "Rincian item dan total harga berhasil diperbarui."
    );
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Gagal memperbarui item pesanan."
    );
  }
}

/**
 * Advance order through the 6-stage FSM with atomic idempotent stock deduction
 * when entering PRODUCTION_QUEUE.
 */
export async function advanceOrderStatusAction(
  input: AdvanceOrderStatusInput
): Promise<
  ActionResult<{
    id: string;
    uuid: string;
    status: OrderStatus;
    stockDeducted: boolean;
    hasUnpaidBalance: boolean;
  }>
> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = advanceOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Parameter perubahan status tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { orderId, nextStatus, trackingNumber } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { rawMaterialId: true, qty: true } },
      payments: { select: { amount: true } },
    },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (order.status === OrderStatus.CANCELLED) {
    return fail("Pesanan yang dibatalkan tidak dapat diubah statusnya.");
  }

  if (order.status === OrderStatus.COMPLETED) {
    return fail("Pesanan sudah selesai.");
  }

  if (STAGE_ORDER[nextStatus] <= STAGE_ORDER[order.status]) {
    return fail("Perubahan status harus maju ke tahap berikutnya.");
  }

  if (
    order.status === OrderStatus.PENDING_REVIEW &&
    order.totalPrice <= 0
  ) {
    return fail(
      "Tetapkan harga final terlebih dahulu sebelum menaikkan status pesanan."
    );
  }

  const paymentSummary = calculatePaymentSummary(
    order.totalPrice,
    order.payments
  );
  if (
    nextStatus === OrderStatus.COMPLETED &&
    paymentSummary.remaining > 0
  ) {
    return fail(
      "Pesanan belum dapat diselesaikan karena masih terdapat sisa tagihan."
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (
        STAGE_ORDER[nextStatus] >= STAGE_ORDER.PRODUCTION_QUEUE &&
        !order.stockDeducted
      ) {
        await deductStockForOrderTx(tx, order.id, order.items);
      }

      const nextDesignStatus =
        STAGE_ORDER[nextStatus] >= STAGE_ORDER.PRODUCTION_QUEUE
          ? DesignStatus.APPROVED
          : order.designStatus;

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          designStatus: nextDesignStatus,
          trackingNumber:
            trackingNumber !== undefined && trackingNumber.length > 0
              ? trackingNumber
              : order.trackingNumber,
        },
        select: {
          id: true,
          uuid: true,
          status: true,
          stockDeducted: true,
        },
      });
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/inventory");
    revalidatePath("/admin");
    revalidatePath(`/track/${updated.uuid}`);

    return ok(
      {
        ...updated,
        hasUnpaidBalance: paymentSummary.remaining > 0,
      },
      "Status pesanan berhasil diperbarui."
    );
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Gagal memperbarui status pesanan."
    );
  }
}

/**
 * Soft-cancel an order (never hard-deleted), optionally restoring raw material stock
 * and recording a Refund Pembatalan EXPENSE row in cash_flows.
 */
export async function cancelOrderAction(
  input: CancelOrderInput
): Promise<ActionResult<{ id: string; status: OrderStatus; refundAmount: number }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data pembatalan tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { orderId, cancelReason, refundAmount, restoreStock } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { rawMaterialId: true, qty: true } },
      payments: { select: { amount: true } },
    },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (order.status === OrderStatus.CANCELLED) {
    return fail("Pesanan ini sudah dibatalkan sebelumnya.");
  }

  if (order.status === OrderStatus.COMPLETED) {
    return fail("Pesanan yang sudah selesai tidak dapat dibatalkan.");
  }

  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  if (refundAmount > totalPaid) {
    return fail(
      `Nominal refund tidak boleh melebihi total yang sudah dibayar (${totalPaid}).`,
      { refundAmount: ["Melebihi total pembayaran pelanggan."] }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    let stockDeductedAfter = order.stockDeducted;

    if (order.stockDeducted && restoreStock) {
      const restoreByMaterial = new Map<string, number>();
      for (const item of order.items) {
        if (!item.rawMaterialId) continue;
        restoreByMaterial.set(
          item.rawMaterialId,
          (restoreByMaterial.get(item.rawMaterialId) ?? 0) + item.qty
        );
      }

      for (const [materialId, qty] of restoreByMaterial.entries()) {
        await tx.rawMaterial.update({
          where: { id: materialId },
          data: { stockQty: { increment: qty } },
        });
      }
      stockDeductedAfter = false;
    }

    if (refundAmount > 0) {
      await tx.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          category: "Refund Pembatalan",
          amount: refundAmount,
          orderId: order.id,
          description: `Refund pembatalan ${order.orderCode} - ${order.customerName} (${cancelReason})`,
          date: new Date(),
        },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason,
        refundAmount,
        stockDeducted: stockDeductedAfter,
      },
      select: {
        id: true,
        uuid: true,
        status: true,
        refundAmount: true,
      },
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  revalidatePath(`/track/${updated.uuid}`);

  return ok(
    {
      id: updated.id,
      status: updated.status,
      refundAmount: updated.refundAmount,
    },
    "Pesanan berhasil dibatalkan."
  );
}

/**
 * List orders with computed payment summary for Admin Order Management table.
 */
export async function listOrdersAction(params?: {
  status?: OrderStatus;
  designStatus?: DesignStatus;
  unpaidOnly?: boolean;
  search?: string;
}) {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const where: Prisma.OrderWhereInput = {};
  if (params?.status) where.status = params.status;
  if (params?.designStatus) where.designStatus = params.designStatus;
  if (params?.search && params.search.trim().length > 0) {
    const q = params.search.trim();
    where.OR = [
      { orderCode: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerWa: { contains: q } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        select: { id: true, category: true, itemName: true, qty: true },
      },
      payments: {
        select: { amount: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = orders.map((order) => ({
    ...order,
    paymentSummary: calculatePaymentSummary(order.totalPrice, order.payments),
  }));

  const filtered = params?.unpaidOnly
    ? mapped.filter(
        (order) =>
          order.status !== OrderStatus.CANCELLED &&
          order.status !== OrderStatus.PENDING_REVIEW &&
          order.paymentSummary.remaining > 0
      )
    : mapped;

  return ok(filtered);
}

/**
 * Fetch full order detail (items, revisions, payments, payment summary) for /admin/orders/[id].
 */
export async function getOrderDetailAction(orderId: string) {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          rawMaterial: {
            select: { id: true, name: true, stockQty: true, unit: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      revisions: {
        orderBy: { version: "desc" },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  return ok({
    ...order,
    paymentSummary: calculatePaymentSummary(order.totalPrice, order.payments),
  });
}
