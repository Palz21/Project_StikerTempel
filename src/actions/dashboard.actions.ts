"use server";

import {
  CashFlowType,
  DesignStatus,
  OrderStatus,
  ServiceCategory,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, type SessionRole } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { calculatePaymentSummary } from "@/lib/formatters";
import type { MonthlyCashFlowPoint } from "./finance.actions";

export interface ServiceBreakdownItem {
  category: ServiceCategory;
  label: string;
  itemCount: number;
  totalSubtotal: number;
}

export interface LowStockMaterialItem {
  id: string;
  name: string;
  category: ServiceCategory;
  stockQty: number;
  minStock: number;
  unit: string;
}

export interface DashboardOverviewData {
  role: SessionRole;
  kpis: {
    monthlyRevenue: number;
    monthlyNetProfit: number | null;
    activeReceivables: number;
    needsActionCount: number;
  };
  monthlySeries: MonthlyCashFlowPoint[] | null;
  serviceBreakdown: ServiceBreakdownItem[];
  lowStockMaterials: LowStockMaterialItem[];
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  CUP: "Gelas Cup",
  PLASTIK: "Plastik Kemasan",
  DTF_BAJU: "Sablon DTF Baju",
  LAINNYA: "Lainnya",
};

/**
 * Aggregate KPI cards, 6-month Recharts cash flow series (OWNER only),
 * service category donut breakdown, and low-stock materials for /admin.
 */
export async function getDashboardOverviewAction(): Promise<
  ActionResult<DashboardOverviewData>
> {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const isOwner = session.role === "OWNER";
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

  const [cashFlows, activeOrders, needsActionCount, orderItems, materials] =
    await Promise.all([
      prisma.cashFlow.findMany({
        where: { date: { gte: sixMonthsStart } },
        select: { type: true, amount: true, date: true },
      }),
      prisma.order.findMany({
        where: {
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.PENDING_REVIEW],
          },
        },
        select: {
          totalPrice: true,
          payments: { select: { amount: true } },
        },
      }),
      prisma.order.count({
        where: {
          status: { not: OrderStatus.CANCELLED },
          OR: [
            { status: OrderStatus.PENDING_REVIEW },
            { designStatus: DesignStatus.REVISION_REQUESTED },
          ],
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { not: OrderStatus.CANCELLED },
          },
        },
        select: { category: true, subtotal: true },
      }),
      prisma.rawMaterial.findMany({
        orderBy: { stockQty: "asc" },
      }),
    ]);

  let monthlyRevenue = 0;
  let monthlyExpense = 0;

  for (const cf of cashFlows) {
    if (cf.date >= currentMonthStart) {
      if (cf.type === CashFlowType.INCOME) {
        monthlyRevenue += cf.amount;
      } else {
        monthlyExpense += cf.amount;
      }
    }
  }

  const activeReceivables = activeOrders.reduce((sum, order) => {
    const summary = calculatePaymentSummary(order.totalPrice, order.payments);
    return sum + summary.remaining;
  }, 0);

  let monthlySeries: MonthlyCashFlowPoint[] | null = null;
  if (isOwner) {
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

    for (const cf of cashFlows) {
      const key = `${cf.date.getFullYear()}-${String(cf.date.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (cf.type === CashFlowType.INCOME) {
        bucket.income += cf.amount;
      } else {
        bucket.expense += cf.amount;
      }
      bucket.netProfit = bucket.income - bucket.expense;
    }

    monthlySeries = Array.from(buckets.values());
  }

  const categoryTotals = new Map<
    ServiceCategory,
    { itemCount: number; totalSubtotal: number }
  >();
  for (const item of orderItems) {
    const current = categoryTotals.get(item.category) ?? {
      itemCount: 0,
      totalSubtotal: 0,
    };
    current.itemCount += 1;
    current.totalSubtotal += item.subtotal;
    categoryTotals.set(item.category, current);
  }

  const serviceBreakdown: ServiceBreakdownItem[] = Array.from(
    categoryTotals.entries()
  ).map(([category, stats]) => ({
    category,
    label: CATEGORY_LABELS[category],
    itemCount: stats.itemCount,
    totalSubtotal: stats.totalSubtotal,
  }));

  const lowStockMaterials: LowStockMaterialItem[] = materials
    .filter((mat) => mat.stockQty <= mat.minStock)
    .map((mat) => ({
      id: mat.id,
      name: mat.name,
      category: mat.category,
      stockQty: mat.stockQty,
      minStock: mat.minStock,
      unit: mat.unit,
    }));

  return ok({
    role: session.role,
    kpis: {
      monthlyRevenue,
      monthlyNetProfit: isOwner ? monthlyRevenue - monthlyExpense : null,
      activeReceivables,
      needsActionCount,
    },
    monthlySeries,
    serviceBreakdown,
    lowStockMaterials,
  });
}
