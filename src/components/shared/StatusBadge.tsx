"use client";

/**
 * TODO(anggota-3): Replace or reconcile with Anggota 3's `src/components/shared/StatusBadge.tsx` when PR #3 merges.
 */
import { cn } from "@/lib/utils";
import { STATUS_LABELS, DESIGN_STATUS_LABELS } from "@/lib/wa-templates";
import type { PaymentBadgeState } from "@/lib/formatters";

const ORDER_STATUS_STYLES: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING_ACC_PAYMENT: "bg-blue-50 text-blue-700 border-blue-200",
  PRODUCTION_QUEUE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  IN_PROGRESS: "bg-violet-50 text-violet-700 border-violet-200",
  READY_FOR_PICKUP: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const PAYMENT_STATE_STYLES: Record<PaymentBadgeState, string> = {
  UNPAID: "bg-slate-100 text-slate-600 border-slate-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
};

const DESIGN_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600 border-slate-200",
  WAITING_ACC: "bg-blue-50 text-blue-700 border-blue-200",
  REVISION_REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-green-50 text-green-700 border-green-200",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        ORDER_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PaymentBadge({
  state,
  label,
  className,
}: {
  state: PaymentBadgeState;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        PAYMENT_STATE_STYLES[state],
        className
      )}
    >
      {label}
    </span>
  );
}

export function DesignStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        DESIGN_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200",
        className
      )}
    >
      {DESIGN_STATUS_LABELS[status] ?? status}
    </span>
  );
}
