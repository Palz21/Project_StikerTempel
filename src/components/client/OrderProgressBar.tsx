"use client";

import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/wa-templates";
import { Check } from "lucide-react";

const STAGES = [
  "PENDING_REVIEW",
  "WAITING_ACC_PAYMENT",
  "PRODUCTION_QUEUE",
  "IN_PROGRESS",
  "READY_FOR_PICKUP",
  "COMPLETED",
] as const;

const STAGE_INDEX: Record<string, number> = {};
STAGES.forEach((s, i) => {
  STAGE_INDEX[s] = i;
});

export function OrderProgressBar({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const isCancelled = status === "CANCELLED";
  const currentIndex = STAGE_INDEX[status] ?? -1;

  if (isCancelled) {
    return (
      <div
        className={cn(
          "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700",
          className
        )}
        role="status"
      >
        Pesanan Dibatalkan
      </div>
    );
  }

  return (
    <nav aria-label="Tahap pesanan" className={className}>
      <ol className="flex w-full items-center">
        {STAGES.map((stage, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          const label = STATUS_LABELS[stage] ?? stage;

          return (
            <li
              key={stage}
              className={cn("flex flex-1 items-center", index > 0 && "pl-0")}
            >
              {/* Connector line before step (except first) */}
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 w-full",
                    isDone || isCurrent ? "bg-slate-900" : "bg-slate-200"
                  )}
                  aria-hidden="true"
                />
              )}

              <div className="flex flex-col items-center gap-1.5 min-w-0">
                {/* Step circle */}
                <div
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                    isDone && "border-slate-900 bg-slate-900 text-white",
                    isCurrent && "border-slate-900 bg-white text-slate-900",
                    !isDone && !isCurrent && "border-slate-200 bg-white text-slate-400"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isDone ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Label visible on md+ */}
                <span
                  className={cn(
                    "hidden text-center text-[10px] leading-tight md:block",
                    isDone && "font-medium text-slate-900",
                    isCurrent && "font-semibold text-slate-900",
                    !isDone && !isCurrent && "text-slate-400"
                  )}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Mobile: show current label */}
      <p className="mt-3 text-center text-sm font-medium text-slate-900 md:hidden">
        Tahap {currentIndex + 1} dari {STAGES.length}:{" "}
        {STATUS_LABELS[status] ?? status}
      </p>
    </nav>
  );
}
