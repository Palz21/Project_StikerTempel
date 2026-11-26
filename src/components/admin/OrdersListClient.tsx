"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { advanceOrderStatusAction } from "@/actions/order.actions";
import { formatRupiah, type PaymentSummary } from "@/lib/formatters";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/wa-templates";
import {
  DesignStatusBadge,
  OrderStatusBadge,
  PaymentBadge,
} from "@/components/shared/StatusBadge";
import { QuickPaymentModal } from "@/components/admin/QuickPaymentModal";
import { WaGeneratorModal } from "@/components/shared/WaGeneratorModal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  Plus,
  Search,
} from "lucide-react";

export interface OrderListRow {
  id: string;
  uuid: string;
  orderCode: string;
  source: "ADMIN" | "CLIENT_LINK";
  customerName: string;
  customerWa: string;
  status: string;
  designStatus: string;
  pickupMethod: string;
  trackingNumber: string | null;
  totalPrice: number;
  createdAt: Date | string;
  items: Array<{
    id: string;
    category: string;
    itemName: string;
    qty: number;
  }>;
  paymentSummary: PaymentSummary;
}

type FilterTab =
  | "ALL"
  | "PENDING_REVIEW"
  | "REVISION_REQUESTED"
  | "ACTIVE_PRODUCTION"
  | "READY_FOR_PICKUP"
  | "UNPAID"
  | "COMPLETED"
  | "CANCELLED";

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "ALL", label: "Semua" },
  { key: "PENDING_REVIEW", label: "Perlu Review" },
  { key: "REVISION_REQUESTED", label: "Revisi Desain" },
  { key: "ACTIVE_PRODUCTION", label: "Antre & Proses" },
  { key: "READY_FOR_PICKUP", label: "Siap Diambil" },
  { key: "UNPAID", label: "Belum Lunas" },
  { key: "COMPLETED", label: "Selesai" },
  { key: "CANCELLED", label: "Dibatalkan" },
];

const NEXT_STAGE_MAP: Record<
  string,
  "PRODUCTION_QUEUE" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | null
> = {
  WAITING_ACC_PAYMENT: "PRODUCTION_QUEUE",
  PRODUCTION_QUEUE: "IN_PROGRESS",
  IN_PROGRESS: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "COMPLETED",
};

interface OrdersListClientProps {
  orders: OrderListRow[];
  shopName: string;
  bankInfo: string;
  appUrl: string;
}

export function OrdersListClient({
  orders,
  shopName,
  bankInfo,
  appUrl,
}: OrdersListClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const [payModalOrder, setPayModalOrder] = useState<OrderListRow | null>(null);
  const [waModalData, setWaModalData] = useState<{
    order: OrderListRow;
    nextStatus: string;
  } | null>(null);

  const counts = useMemo(() => {
    const map: Record<FilterTab, number> = {
      ALL: orders.length,
      PENDING_REVIEW: 0,
      REVISION_REQUESTED: 0,
      ACTIVE_PRODUCTION: 0,
      READY_FOR_PICKUP: 0,
      UNPAID: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    for (const o of orders) {
      if (o.status === "PENDING_REVIEW") map.PENDING_REVIEW++;
      if (o.designStatus === "REVISION_REQUESTED" && o.status !== "CANCELLED") {
        map.REVISION_REQUESTED++;
      }
      if (
        o.status === "WAITING_ACC_PAYMENT" ||
        o.status === "PRODUCTION_QUEUE" ||
        o.status === "IN_PROGRESS"
      ) {
        map.ACTIVE_PRODUCTION++;
      }
      if (o.status === "READY_FOR_PICKUP") map.READY_FOR_PICKUP++;
      if (
        o.status !== "CANCELLED" &&
        o.status !== "PENDING_REVIEW" &&
        o.paymentSummary.remaining > 0
      ) {
        map.UNPAID++;
      }
      if (o.status === "COMPLETED") map.COMPLETED++;
      if (o.status === "CANCELLED") map.CANCELLED++;
    }

    return map;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((o) => {
      if (activeTab === "PENDING_REVIEW" && o.status !== "PENDING_REVIEW") {
        return false;
      }
      if (
        activeTab === "REVISION_REQUESTED" &&
        (o.designStatus !== "REVISION_REQUESTED" || o.status === "CANCELLED")
      ) {
        return false;
      }
      if (
        activeTab === "ACTIVE_PRODUCTION" &&
        o.status !== "WAITING_ACC_PAYMENT" &&
        o.status !== "PRODUCTION_QUEUE" &&
        o.status !== "IN_PROGRESS"
      ) {
        return false;
      }
      if (activeTab === "READY_FOR_PICKUP" && o.status !== "READY_FOR_PICKUP") {
        return false;
      }
      if (
        activeTab === "UNPAID" &&
        (o.status === "CANCELLED" ||
          o.status === "PENDING_REVIEW" ||
          o.paymentSummary.remaining <= 0)
      ) {
        return false;
      }
      if (activeTab === "COMPLETED" && o.status !== "COMPLETED") {
        return false;
      }
      if (activeTab === "CANCELLED" && o.status !== "CANCELLED") {
        return false;
      }

      if (q.length > 0) {
        const matchCode = o.orderCode.toLowerCase().includes(q);
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchWa = o.customerWa.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchWa) return false;
      }

      return true;
    });
  }, [orders, activeTab, search]);

  async function handleCopyTracking(order: OrderListRow) {
    const baseUrl =
      appUrl || (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${baseUrl}/track/${order.uuid}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setActionError(`Gagal menyalin otomatis. Salin manual: ${url}`);
    }
  }

  function handleQuickAdvance(order: OrderListRow) {
    const nextStatus = NEXT_STAGE_MAP[order.status];
    if (!nextStatus) return;

    setActionError(null);
    setAdvancingId(order.id);

    startTransition(async () => {
      const result = await advanceOrderStatusAction({
        orderId: order.id,
        nextStatus,
      });
      setAdvancingId(null);

      if (!result.success) {
        setActionError(`${order.orderCode}: ${result.error}`);
        return;
      }

      setWaModalData({ order, nextStatus });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + New Order */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode order, nama, atau WA..."
            aria-label="Cari pesanan"
            className="h-11 pl-9 sm:h-9"
          />
        </div>

        <Link
          href="/admin/orders/new"
          className={buttonVariants({
            className: "min-h-11 cursor-pointer sm:min-h-9",
          })}
        >
          <Plus className="size-4" aria-hidden="true" />
          <span>Order Baru</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div
        role="tablist"
        aria-label="Filter status pesanan"
        className="flex flex-wrap gap-1.5"
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-9 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}{" "}
              <span
                className={
                  isActive ? "text-slate-300" : "text-slate-400"
                }
              >
                ({counts[tab.key]})
              </span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      {/* Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            Tidak ada pesanan ditemukan
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {search.trim().length > 0
              ? "Coba ubah kata kunci pencarian atau pilih tab lain."
              : "Belum ada pesanan pada kategori filter ini."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List (< md) */}
          <ul className="space-y-3 md:hidden">
            {filteredOrders.map((order) => {
              const nextStatus = NEXT_STAGE_MAP[order.status];
              const canPay =
                order.status !== "CANCELLED" &&
                order.status !== "PENDING_REVIEW" &&
                order.totalPrice > 0 &&
                order.paymentSummary.remaining > 0;

              return (
                <li
                  key={order.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm font-semibold text-slate-900 underline-offset-2 hover:underline"
                      >
                        {order.orderCode}
                      </Link>
                      <p className="mt-0.5 truncate text-sm font-medium text-slate-700">
                        {order.customerName}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {order.items
                      .map(
                        (i) =>
                          `${CATEGORY_LABELS[i.category] ?? i.category} (${i.qty} pcs)`
                      )
                      .join(", ")}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {order.totalPrice > 0
                          ? formatRupiah(order.totalPrice)
                          : "Belum ditetapkan"}
                      </p>
                    </div>
                    {order.totalPrice > 0 && (
                      <PaymentBadge
                        state={order.paymentSummary.state}
                        label={order.paymentSummary.label}
                      />
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "min-h-10 flex-1 cursor-pointer",
                      })}
                    >
                      Detail
                    </Link>

                    {canPay && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPayModalOrder(order)}
                        className="min-h-10 flex-1 cursor-pointer"
                      >
                        <CreditCard className="size-3.5" aria-hidden="true" />
                        Bayar
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCopyTracking(order)}
                      className="min-h-10 cursor-pointer"
                      aria-label={`Salin link tracking ${order.orderCode}`}
                    >
                      {copiedId === order.id ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="size-3.5" aria-hidden="true" />
                      )}
                    </Button>

                    {nextStatus && (
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          (isPending && advancingId === order.id) ||
                          (nextStatus === "COMPLETED" &&
                            order.paymentSummary.remaining > 0)
                        }
                        onClick={() => handleQuickAdvance(order)}
                        className="min-h-10 w-full cursor-pointer"
                        title={
                          nextStatus === "COMPLETED" &&
                          order.paymentSummary.remaining > 0
                            ? "Lunasi sisa tagihan terlebih dahulu"
                            : `Naikkan ke ${STATUS_LABELS[nextStatus]}`
                        }
                      >
                        <span>
                          {isPending && advancingId === order.id
                            ? "Memproses..."
                            : nextStatus === "COMPLETED" &&
                                order.paymentSummary.remaining > 0
                              ? "Lunasi Tagihan Dulu"
                              : `Naikkan ke ${STATUS_LABELS[nextStatus]}`}
                        </span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop Table (>= md) */}
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Order & Pelanggan</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Status & Desain</th>
                    <th className="px-4 py-3">Tagihan</th>
                    <th className="px-4 py-3 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const nextStatus = NEXT_STAGE_MAP[order.status];
                    const canPay =
                      order.status !== "CANCELLED" &&
                      order.status !== "PENDING_REVIEW" &&
                      order.totalPrice > 0 &&
                      order.paymentSummary.remaining > 0;

                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-3 align-top">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-semibold text-slate-900 hover:underline"
                          >
                            {order.orderCode}
                          </Link>
                          <p className="mt-0.5 font-medium text-slate-700">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {order.customerWa}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-top text-xs text-slate-600">
                          <ul className="space-y-0.5">
                            {order.items.map((item) => (
                              <li key={item.id}>
                                <span className="font-medium text-slate-800">
                                  {item.qty} pcs
                                </span>{" "}
                                {item.itemName}
                              </li>
                            ))}
                          </ul>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col items-start gap-1.5">
                            <OrderStatusBadge status={order.status} />
                            {order.status !== "CANCELLED" &&
                              order.status !== "COMPLETED" && (
                                <DesignStatusBadge status={order.designStatus} />
                              )}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">
                              {order.totalPrice > 0
                                ? formatRupiah(order.totalPrice)
                                : "Menunggu Harga"}
                            </p>
                            {order.totalPrice > 0 && (
                              <PaymentBadge
                                state={order.paymentSummary.state}
                                label={order.paymentSummary.label}
                              />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {canPay && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPayModalOrder(order)}
                                className="cursor-pointer"
                              >
                                + Bayar
                              </Button>
                            )}

                            {nextStatus && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={
                                  (isPending && advancingId === order.id) ||
                                  (nextStatus === "COMPLETED" &&
                                    order.paymentSummary.remaining > 0)
                                }
                                onClick={() => handleQuickAdvance(order)}
                                className="cursor-pointer"
                                title={
                                  nextStatus === "COMPLETED" &&
                                  order.paymentSummary.remaining > 0
                                    ? "Lunasi sisa tagihan terlebih dahulu"
                                    : `Naikkan ke ${STATUS_LABELS[nextStatus]}`
                                }
                              >
                                {isPending && advancingId === order.id
                                  ? "..."
                                  : STATUS_LABELS[nextStatus]}
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleCopyTracking(order)}
                              className="cursor-pointer"
                              aria-label={`Salin tautan pelacakan ${order.orderCode}`}
                              title="Salin Link Tracking"
                            >
                              {copiedId === order.id ? (
                                <Check className="size-3.5 text-green-600" aria-hidden="true" />
                              ) : (
                                <Copy className="size-3.5" aria-hidden="true" />
                              )}
                            </Button>

                            <Link
                              href={`/admin/orders/${order.id}`}
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                                className: "cursor-pointer",
                              })}
                            >
                              Detail
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {payModalOrder && (
        <QuickPaymentModal
          open={Boolean(payModalOrder)}
          onOpenChange={(open) => {
            if (!open) setPayModalOrder(null);
          }}
          orderId={payModalOrder.id}
          orderCode={payModalOrder.orderCode}
          customerName={payModalOrder.customerName}
          totalPrice={payModalOrder.totalPrice}
          totalPaid={payModalOrder.paymentSummary.totalPaid}
          remaining={payModalOrder.paymentSummary.remaining}
        />
      )}

      {waModalData && (
        <WaGeneratorModal
          open={Boolean(waModalData)}
          onOpenChange={(open) => {
            if (!open) setWaModalData(null);
          }}
          mode="status-update"
          orderCode={waModalData.order.orderCode}
          customerName={waModalData.order.customerName}
          customerWa={waModalData.order.customerWa}
          shopName={shopName}
          trackingUrl={`${
            appUrl || (typeof window !== "undefined" ? window.location.origin : "")
          }/track/${waModalData.order.uuid}`}
          totalPrice={waModalData.order.totalPrice}
          totalPaid={waModalData.order.paymentSummary.totalPaid}
          remaining={waModalData.order.paymentSummary.remaining}
          status={waModalData.nextStatus}
          trackingNumber={waModalData.order.trackingNumber}
          bankInfo={bankInfo}
        />
      )}
    </div>
  );
}
