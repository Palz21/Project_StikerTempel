"use server";

import { revalidatePath } from "next/cache";
import { CashFlowType, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { calculatePaymentSummary, type PaymentSummary } from "@/lib/formatters";
import { addPaymentSchema, type AddPaymentInput } from "@/lib/validations";

/**
 * Record a direct-amount payment into order_payments and atomically sync an INCOME
 * entry to cash_flows within a single Prisma transaction.
 */
export async function addOrderPaymentAction(input: AddPaymentInput): Promise<
  ActionResult<{
    paymentId: string;
    cashFlowId: string;
    paymentSummary: PaymentSummary;
  }>
> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = addPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data pembayaran tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { orderId, amount, paymentMethod, proofUrl, note } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: { select: { amount: true } },
    },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (order.status === OrderStatus.CANCELLED) {
    return fail("Tidak dapat mencatat pembayaran pada pesanan yang dibatalkan.");
  }

  if (order.status === OrderStatus.PENDING_REVIEW || order.totalPrice <= 0) {
    return fail(
      "Konfirmasi pesanan dan tetapkan total harga sebelum mencatat pembayaran."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.orderPayment.create({
      data: {
        orderId: order.id,
        amount,
        paymentMethod,
        proofUrl: proofUrl || null,
        note: note || null,
      },
    });

    const cashFlow = await tx.cashFlow.create({
      data: {
        type: CashFlowType.INCOME,
        category: "Pembayaran Order",
        amount: payment.amount,
        orderPaymentId: payment.id,
        orderId: order.id,
        description: `Pembayaran ${order.orderCode} - ${order.customerName}`,
        date: payment.paidAt,
      },
    });

    return { payment, cashFlow };
  });

  const paymentSummary = calculatePaymentSummary(order.totalPrice, [
    ...order.payments,
    { amount: result.payment.amount },
  ]);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  revalidatePath(`/track/${order.uuid}`);

  return ok(
    {
      paymentId: result.payment.id,
      cashFlowId: result.cashFlow.id,
      paymentSummary,
    },
    "Pembayaran berhasil dicatat dan tersinkron ke arus kas."
  );
}
