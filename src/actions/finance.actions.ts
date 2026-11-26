"use server";

import { revalidatePath } from "next/cache";
import { CashFlowType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { createExpenseSchema, type CreateExpenseInput } from "@/lib/validations";

export interface CashFlowJournalRow {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  description: string | null;
  date: Date;
  isAutoLocked: boolean;
  orderCode: string | null;
  customerName: string | null;
}

export interface FinanceSummaryResult {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  entries: CashFlowJournalRow[];
}

export interface MonthlyCashFlowPoint {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  netProfit: number;
}

/**
 * Fetch cash flow ledger & net profit summary for an optional date window (OWNER only).
 */
export async function getFinanceSummaryAction(params?: {
  startDate?: string | Date;
  endDate?: string | Date;
}): Promise<ActionResult<FinanceSummaryResult>> {
  try {
    await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat mengakses data keuangan."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const whereDate: { gte?: Date; lte?: Date } = {};
  if (params?.startDate) {
    const d = new Date(params.startDate);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      whereDate.gte = d;
    }
  }
  if (params?.endDate) {
    const d = new Date(params.endDate);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      whereDate.lte = d;
    }
  }

  const rows = await prisma.cashFlow.findMany({
    where: Object.keys(whereDate).length > 0 ? { date: whereDate } : undefined,
    include: {
      order: {
        select: {
          orderCode: true,
          customerName: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  let totalIncome = 0;
  let totalExpense = 0;

  const entries: CashFlowJournalRow[] = rows.map((row) => {
    if (row.type === CashFlowType.INCOME) {
      totalIncome += row.amount;
    } else {
      totalExpense += row.amount;
    }

    return {
      id: row.id,
      type: row.type,
      category: row.category,
      amount: row.amount,
      description: row.description,
      date: row.date,
      isAutoLocked: Boolean(row.orderPaymentId || row.orderId),
      orderCode: row.order?.orderCode ?? null,
      customerName: row.order?.customerName ?? null,
    };
  });

  return ok({
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    entries,
  });
}

/**
 * Record a manual operational expense (OWNER only).
 */
export async function createExpenseAction(
  input: CreateExpenseInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat mencatat pengeluaran."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data pengeluaran tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const created = await prisma.cashFlow.create({
    data: {
      type: CashFlowType.EXPENSE,
      category: parsed.data.category,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
      date: parsed.data.date ?? new Date(),
    },
    select: { id: true },
  });

  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  return ok(created, "Pengeluaran operasional berhasil dicatat.");
}

/**
 * Delete a manual cash flow entry (OWNER only).
 * Auto-synced order payments and refund rows are permanently locked for audit integrity.
 */
export async function deleteManualCashFlowAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat menghapus transaksi manual."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const existing = await prisma.cashFlow.findUnique({
    where: { id },
    select: { id: true, orderPaymentId: true, orderId: true },
  });

  if (!existing) {
    return fail("Data arus kas tidak ditemukan.");
  }

  if (existing.orderPaymentId || existing.orderId) {
    return fail(
      "Transaksi otomatis dari pembayaran/refund order terkunci dan tidak boleh dihapus."
    );
  }

  await prisma.cashFlow.delete({ where: { id } });

  revalidatePath("/admin/finance");
  revalidatePath("/admin");
  return ok({ id }, "Catatan pengeluaran manual berhasil dihapus.");
}

/**
 * Aggregate income, expense, and net profit over the last 6 months for Recharts (OWNER only).
 */
export async function getSixMonthCashFlowSeriesAction(): Promise<
  ActionResult<MonthlyCashFlowPoint[]>
> {
  try {
    await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat mengakses analitik laba."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

  const rows = await prisma.cashFlow.findMany({
    where: { date: { gte: startMonth } },
    select: { type: true, amount: true, date: true },
  });

  const monthFormatter = new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
  });

  const buckets = new Map<string, MonthlyCashFlowPoint>();
  for (let offset = 5; offset >= 0; offset--) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      monthKey: key,
      label: monthFormatter.format(d),
      income: 0,
      expense: 0,
      netProfit: 0,
    });
  }

  for (const row of rows) {
    const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;

    if (row.type === CashFlowType.INCOME) {
      bucket.income += row.amount;
    } else {
      bucket.expense += row.amount;
    }
    bucket.netProfit = bucket.income - bucket.expense;
  }

  return ok(Array.from(buckets.values()));
}
