"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  advanceOrderStatusAction,
  confirmPendingOrderAction,
  updateOrderItemsAction,
} from "@/actions/order.actions";
import { uploadMockupRevisionAction } from "@/actions/revision.actions";
import { formatRupiah, type PaymentSummary } from "@/lib/formatters";
import { compressAndUploadImage } from "@/lib/client-upload";
import {
  CATEGORY_LABELS,
  PICKUP_METHOD_LABELS,
  STATUS_LABELS,
} from "@/lib/wa-templates";
import { OrderProgressBar } from "@/components/client/OrderProgressBar";
import {
  DesignStatusBadge,
  OrderStatusBadge,
  PaymentBadge,
} from "@/components/shared/StatusBadge";
import { QuickPaymentModal } from "@/components/admin/QuickPaymentModal";
import { CancelOrderModal } from "@/components/admin/CancelOrderModal";
import { WaGeneratorModal } from "@/components/shared/WaGeneratorModal";
import type { MaterialOption } from "@/components/admin/DynamicItemForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  Copy,
  CreditCard,
  MessageCircle,
  Upload,
} from "lucide-react";

const selectClassName =
  "h-11 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-slate-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9";

const NEXT_STAGE_MAP: Record<
  string,
  "PRODUCTION_QUEUE" | "IN_PROGRESS" | "READY_FOR_PICKUP" | "COMPLETED" | null
> = {
  WAITING_ACC_PAYMENT: "PRODUCTION_QUEUE",
  PRODUCTION_QUEUE: "IN_PROGRESS",
  IN_PROGRESS: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "COMPLETED",
};

export interface OrderDetailData {
  id: string;
  uuid: string;
  orderCode: string;
  source: "ADMIN" | "CLIENT_LINK";
  customerName: string;
  customerWa: string;
  status: string;
  designStatus: string;
  revisionCount: number;
  pickupMethod: string;
  trackingNumber: string | null;
  totalPrice: number;
  currentMockupUrl: string | null;
  notes: string | null;
  stockDeducted: boolean;
  cancelledAt: Date | string | null;
  cancelReason: string | null;
  refundAmount: number;
  createdAt: Date | string;
  items: Array<{
    id: string;
    category: string;
    rawMaterialId: string | null;
    itemName: string;
    specs: unknown;
    qty: number;
    unitPrice: number;
    subtotal: number;
    logoUrl: string | null;
    rawMaterial: {
      id: string;
      name: string;
      stockQty: number;
      unit: string;
    } | null;
  }>;
  revisions: Array<{
    id: string;
    version: number;
    mockupUrl: string;
    clientNote: string | null;
    adminNote: string | null;
    createdAt: Date | string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    proofUrl: string | null;
    note: string | null;
    paidAt: Date | string;
  }>;
  paymentSummary: PaymentSummary;
}

interface OrderDetailClientProps {
  order: OrderDetailData;
  materials: MaterialOption[];
  shopName: string;
  bankInfo: string;
  appUrl: string;
}

function formatSpecsSummary(category: string, specs: unknown): string {
  if (!specs || typeof specs !== "object") return "-";
  const s = specs as Record<string, unknown>;
  if (category === "CUP") {
    return [s.size, s.cupType, `${s.colorCount ?? 1} warna`, s.lidType]
      .filter(Boolean)
      .join(" · ");
  }
  if (category === "PLASTIK") {
    return [s.size, s.plasticColor, `${s.colorCount ?? 1} warna`, s.sides]
      .filter(Boolean)
      .join(" · ");
  }
  if (category === "DTF_BAJU") {
    return [
      s.apparelType,
      s.bringOwnApparel ? "Bawa Sendiri" : "Bahan Workshop",
      s.printArea,
      s.sizeBreakdown,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return s.description ? String(s.description) : "-";
}

export function OrderDetailClient({
  order,
  materials,
  shopName,
  bankInfo,
  appUrl,
}: OrderDetailClientProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [waModal, setWaModal] = useState<{
    mode: "created" | "status-update";
    status?: string;
    trackingNumber?: string | null;
  } | null>(null);

  // Item edits (used for PENDING_REVIEW confirm OR Stage 2-3 item qty/price edit)
  const [itemEdits, setItemEdits] = useState(() =>
    order.items.map((item) => ({
      itemId: item.id,
      rawMaterialId: item.rawMaterialId ?? "",
      qty: item.qty,
      unitPrice: item.unitPrice,
    }))
  );
  const [confirmNotes, setConfirmNotes] = useState(order.notes ?? "");

  // Advance status state
  const nextStatus = NEXT_STAGE_MAP[order.status] ?? null;
  const [trackingNumber, setTrackingNumber] = useState(
    order.trackingNumber ?? ""
  );

  // Mockup upload state
  const [mockupAdminNote, setMockupAdminNote] = useState("");
  const [uploadingMockup, setUploadingMockup] = useState(false);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItemEdits(
      order.items.map((item) => ({
        itemId: item.id,
        rawMaterialId: item.rawMaterialId ?? "",
        qty: item.qty,
        unitPrice: item.unitPrice,
      }))
    );
    setConfirmNotes(order.notes ?? "");
    setTrackingNumber(order.trackingNumber ?? "");
  }, [order.items, order.notes, order.trackingNumber]);

  const baseUrl =
    appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const trackingUrl = `${baseUrl}/track/${order.uuid}`;
  const isPendingReview = order.status === "PENDING_REVIEW";
  const canEditItems =
    order.status === "WAITING_ACC_PAYMENT" ||
    order.status === "PRODUCTION_QUEUE";
  const canUploadMockup =
    order.status === "PENDING_REVIEW" ||
    order.status === "WAITING_ACC_PAYMENT";
  const canPay =
    order.status !== "CANCELLED" &&
    order.status !== "PENDING_REVIEW" &&
    order.totalPrice > 0;
  const canCancel =
    order.status !== "CANCELLED" && order.status !== "COMPLETED";

  const editedTotal = itemEdits.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0
  );

  async function handleCopyTracking() {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({
        type: "error",
        message: `Gagal menyalin otomatis. Salin manual: ${trackingUrl}`,
      });
    }
  }

  function handleConfirmPending(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);

    if (itemEdits.some((it) => it.qty < 1 || it.unitPrice < 1)) {
      setFeedback({
        type: "error",
        message: "Pastikan jumlah dan harga satuan semua item minimal 1.",
      });
      return;
    }

    startTransition(async () => {
      const result = await confirmPendingOrderAction({
        orderId: order.id,
        items: itemEdits.map((it) => ({
          itemId: it.itemId,
          rawMaterialId: it.rawMaterialId || null,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
        notes: confirmNotes.trim() || undefined,
      });

      if (!result.success) {
        const detail = result.fieldErrors
          ? Object.values(result.fieldErrors).flat()[0]
          : undefined;
        setFeedback({
          type: "error",
          message: detail ? `${result.error} (${detail})` : result.error,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Order dikonfirmasi.",
      });
      setWaModal({ mode: "created" });
      router.refresh();
    });
  }

  function handleSaveItemEdits() {
    setFeedback(null);
    if (itemEdits.some((it) => it.qty < 1)) {
      setFeedback({
        type: "error",
        message: "Jumlah setiap item minimal 1 pcs.",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateOrderItemsAction({
        orderId: order.id,
        items: itemEdits.map((it) => ({
          itemId: it.itemId,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
      });

      if (!result.success) {
        const detail = result.fieldErrors
          ? Object.values(result.fieldErrors).flat()[0]
          : undefined;
        setFeedback({
          type: "error",
          message: detail ? `${result.error} (${detail})` : result.error,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Rincian item diperbarui.",
      });
      router.refresh();
    });
  }

  function handleAdvanceStatus() {
    if (!nextStatus) return;
    setFeedback(null);

    startTransition(async () => {
      const result = await advanceOrderStatusAction({
        orderId: order.id,
        nextStatus,
        trackingNumber:
          nextStatus === "READY_FOR_PICKUP" &&
          order.pickupMethod === "EXPEDITION" &&
          trackingNumber.trim().length > 0
            ? trackingNumber.trim()
            : undefined,
      });

      if (!result.success) {
        setFeedback({ type: "error", message: result.error });
        return;
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Status pesanan diperbarui.",
      });
      setWaModal({
        mode: "status-update",
        status: nextStatus,
        trackingNumber: trackingNumber.trim() || order.trackingNumber,
      });
      router.refresh();
    });
  }

  async function handleMockupFileChange(file: File | undefined) {
    if (!file) return;
    setFeedback(null);
    setUploadingMockup(true);

    const uploadRes = await compressAndUploadImage(file);
    if (!uploadRes.success) {
      setUploadingMockup(false);
      setFeedback({ type: "error", message: uploadRes.error });
      return;
    }

    const actionRes = await uploadMockupRevisionAction({
      orderId: order.id,
      mockupUrl: uploadRes.url,
      adminNote: mockupAdminNote.trim() || undefined,
    });

    setUploadingMockup(false);

    if (!actionRes.success) {
      setFeedback({ type: "error", message: actionRes.error });
      return;
    }

    setMockupAdminNote("");
    setFeedback({
      type: "success",
      message: actionRes.message ?? "Mockup berhasil diunggah.",
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {order.orderCode}
              </h1>
              <OrderStatusBadge status={order.status} />
              <DesignStatusBadge status={order.designStatus} />
              {order.totalPrice > 0 && (
                <PaymentBadge
                  state={order.paymentSummary.state}
                  label={order.paymentSummary.label}
                />
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {order.customerName} · {order.customerWa} ·{" "}
              {PICKUP_METHOD_LABELS[order.pickupMethod] ?? order.pickupMethod}
            </p>
            {order.stockDeducted && (
              <p className="mt-1 text-xs text-slate-500">
                Stok bahan baku sudah dipotong dari gudang.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCopyTracking()}
              className="min-h-10 cursor-pointer sm:min-h-8"
            >
              {copied ? (
                <Check className="size-4 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              <span>{copied ? "Link Tersalin" : "Salin Link Tracking"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setWaModal({
                  mode:
                    order.status === "WAITING_ACC_PAYMENT"
                      ? "created"
                      : "status-update",
                  status: order.status,
                  trackingNumber: order.trackingNumber,
                })
              }
              className="min-h-10 cursor-pointer sm:min-h-8"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              <span>Generator WA</span>
            </Button>

            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setCancelOpen(true)}
                className="min-h-10 cursor-pointer sm:min-h-8"
              >
                <Ban className="size-4" aria-hidden="true" />
                <span>Batalkan</span>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5">
          <OrderProgressBar status={order.status} />
        </div>

        {order.status === "CANCELLED" && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium">
              Pesanan Dibatalkan · Refund:{" "}
              {formatRupiah(order.refundAmount)}
            </p>
            {order.cancelReason && (
              <p className="mt-0.5">Alasan: {order.cancelReason}</p>
            )}
          </div>
        )}
      </section>

      {feedback && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Advance Status Control (Stages 2-5) */}
      {nextStatus && (
        <section
          aria-labelledby="advance-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2
            id="advance-heading"
            className="text-sm font-semibold text-slate-900"
          >
            Kontrol Tahap Berikutnya
          </h2>

          {nextStatus === "READY_FOR_PICKUP" &&
            order.paymentSummary.remaining > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Peringatan: Pesanan masih memiliki sisa tagihan{" "}
                  <strong>{formatRupiah(order.paymentSummary.remaining)}</strong>.
                  Pastikan pelanggan melunasi saat barang diambil/dikirim.
                </span>
              </div>
            )}

          {nextStatus === "COMPLETED" && order.paymentSummary.remaining > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                Pesanan belum bisa diselesaikan sebelum sisa tagihan{" "}
                <strong>{formatRupiah(order.paymentSummary.remaining)}</strong>{" "}
                dilunasi.
              </span>
            </div>
          )}

          {nextStatus === "READY_FOR_PICKUP" &&
            order.pickupMethod === "EXPEDITION" && (
              <div className="mt-3 max-w-sm space-y-1.5">
                <Label htmlFor="detail-tracking-number">
                  Nomor Resi Ekspedisi (Opsional)
                </Label>
                <Input
                  id="detail-tracking-number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Contoh: JNE-882910331"
                  className="h-11 sm:h-9"
                />
              </div>
            )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              {nextStatus === "PRODUCTION_QUEUE" && !order.stockDeducted
                ? "Menaikkan ke Antre Produksi akan otomatis memotong stok bahan baku tertaut dan mengunci revisi client."
                : `Naikkan status dari ${STATUS_LABELS[order.status]} ke ${STATUS_LABELS[nextStatus]}.`}
            </p>
            <Button
              type="button"
              disabled={
                isPending ||
                (nextStatus === "COMPLETED" &&
                  order.paymentSummary.remaining > 0)
              }
              onClick={handleAdvanceStatus}
              className="min-h-11 cursor-pointer sm:min-h-9"
            >
              <span>
                {isPending
                  ? "Memproses..."
                  : `Naikkan ke ${STATUS_LABELS[nextStatus]}`}
              </span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      )}

      {/* Skenario B Confirmation OR Items List / Editor */}
      {isPendingReview ? (
        <form
          onSubmit={handleConfirmPending}
          className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Verifikasi & Tetapkan Harga (Pesanan Masuk)
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Tautkan bahan baku gudang dan isi harga satuan sebelum mengirim
            tagihan ke pelanggan.
          </p>

          <div className="mt-4 space-y-4">
            {order.items.map((item, idx) => {
              const edit = itemEdits[idx];
              const categoryMaterials = materials.filter(
                (m) => m.category === item.category
              );
              const isOwnApparel =
                item.category === "DTF_BAJU" &&
                typeof item.specs === "object" &&
                item.specs !== null &&
                (item.specs as { bringOwnApparel?: boolean }).bringOwnApparel ===
                  true;

              return (
                <div
                  key={item.id}
                  className="rounded-md border border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.itemName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {formatSpecsSummary(item.category, item.specs)}
                      </p>
                    </div>
                    {item.logoUrl && (
                      <a
                        href={item.logoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <img
                          src={item.logoUrl}
                          alt={`Logo ${item.itemName}`}
                          className="h-12 w-12 rounded border border-slate-200 bg-white object-contain"
                          width={48}
                          height={48}
                        />
                      </a>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {!isOwnApparel && (
                      <div className="space-y-1">
                        <Label htmlFor={`confirm-mat-${idx}`}>
                          Bahan Baku Gudang
                        </Label>
                        <select
                          id={`confirm-mat-${idx}`}
                          value={edit.rawMaterialId}
                          onChange={(e) => {
                            const copy = [...itemEdits];
                            copy[idx] = {
                              ...copy[idx],
                              rawMaterialId: e.target.value,
                            };
                            setItemEdits(copy);
                          }}
                          className={selectClassName}
                        >
                          <option value="">Tidak ditautkan</option>
                          {categoryMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.stockQty} {m.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label htmlFor={`confirm-qty-${idx}`}>Jumlah (pcs)</Label>
                      <Input
                        id={`confirm-qty-${idx}`}
                        type="number"
                        min={1}
                        required
                        value={edit.qty || ""}
                        onChange={(e) => {
                          const copy = [...itemEdits];
                          copy[idx] = {
                            ...copy[idx],
                            qty: Math.max(
                              0,
                              Number.parseInt(e.target.value || "0", 10)
                            ),
                          };
                          setItemEdits(copy);
                        }}
                        className="h-11 sm:h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor={`confirm-price-${idx}`}>
                        Harga Satuan (Rp)
                      </Label>
                      <Input
                        id={`confirm-price-${idx}`}
                        type="number"
                        min={1}
                        required
                        value={edit.unitPrice || ""}
                        onChange={(e) => {
                          const copy = [...itemEdits];
                          copy[idx] = {
                            ...copy[idx],
                            unitPrice: Math.max(
                              0,
                              Number.parseInt(e.target.value || "0", 10)
                            ),
                          };
                          setItemEdits(copy);
                        }}
                        placeholder="Contoh: 1200"
                        className="h-11 sm:h-9"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="confirm-notes">Catatan Pesanan</Label>
            <Textarea
              id="confirm-notes"
              value={confirmNotes}
              onChange={(e) => setConfirmNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-900">
              Total Final: {formatRupiah(editedTotal)}
            </p>
            <Button
              type="submit"
              disabled={isPending || editedTotal <= 0}
              className="min-h-11 cursor-pointer sm:min-h-9"
            >
              {isPending
                ? "Mengonfirmasi..."
                : "Konfirmasi Order & Buat Teks WA"}
            </Button>
          </div>
        </form>
      ) : (
        <section
          aria-labelledby="detail-items-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="detail-items-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Rincian Item ({order.items.length})
            </h2>
            <p className="text-sm font-semibold text-slate-900">
              Total: {formatRupiah(canEditItems ? editedTotal : order.totalPrice)}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {order.items.map((item, idx) => {
              const edit = itemEdits[idx];
              return (
                <div
                  key={item.id}
                  className="rounded-md border border-slate-100 bg-slate-50/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                        {item.rawMaterial &&
                          ` · Bahan: ${item.rawMaterial.name}`}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.itemName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {formatSpecsSummary(item.category, item.specs)}
                      </p>
                    </div>
                    {item.logoUrl && (
                      <a
                        href={item.logoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={item.logoUrl}
                          alt={`Logo ${item.itemName}`}
                          className="h-12 w-12 rounded border border-slate-200 bg-white object-contain"
                          width={48}
                          height={48}
                        />
                      </a>
                    )}
                  </div>

                  {canEditItems ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label htmlFor={`edit-qty-${idx}`}>Jumlah</Label>
                        <Input
                          id={`edit-qty-${idx}`}
                          type="number"
                          min={1}
                          value={edit.qty || ""}
                          onChange={(e) => {
                            const copy = [...itemEdits];
                            copy[idx] = {
                              ...copy[idx],
                              qty: Math.max(
                                0,
                                Number.parseInt(e.target.value || "0", 10)
                              ),
                            };
                            setItemEdits(copy);
                          }}
                          className="h-10 sm:h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`edit-price-${idx}`}>
                          Harga Satuan (Rp)
                        </Label>
                        <Input
                          id={`edit-price-${idx}`}
                          type="number"
                          min={0}
                          value={edit.unitPrice || ""}
                          onChange={(e) => {
                            const copy = [...itemEdits];
                            copy[idx] = {
                              ...copy[idx],
                              unitPrice: Math.max(
                                0,
                                Number.parseInt(e.target.value || "0", 10)
                              ),
                            };
                            setItemEdits(copy);
                          }}
                          className="h-10 sm:h-8"
                        />
                      </div>
                      <div className="flex items-end justify-end">
                        <p className="text-sm font-medium text-slate-900">
                          {formatRupiah(edit.qty * edit.unitPrice)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        {item.qty} pcs x {formatRupiah(item.unitPrice)}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {canEditItems && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                {order.status === "PRODUCTION_QUEUE"
                  ? "Perubahan jumlah di Antre Produksi otomatis menyesuaikan selisih stok gudang."
                  : "Jumlah dan harga masih bisa disesuaikan sebelum naik produksi."}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={handleSaveItemEdits}
                className="min-h-10 cursor-pointer sm:min-h-8"
              >
                {isPending ? "Menyimpan..." : "Simpan Perubahan Item"}
              </Button>
            </div>
          )}

          {order.notes && (
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-medium text-slate-700">Catatan:</span>{" "}
              {order.notes}
            </div>
          )}
        </section>
      )}

      {/* Two-Column Lower Grid: Mockups & Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Mockup & Revisi */}
        <section
          aria-labelledby="detail-mockup-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="detail-mockup-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Mockup & Revisi ({order.revisions.length})
            </h2>
            <DesignStatusBadge status={order.designStatus} />
          </div>

          {canUploadMockup ? (
            <div className="mt-4 space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="space-y-1">
                <Label htmlFor="mockup-admin-note">
                  Catatan Admin untuk Versi Baru (Opsional)
                </Label>
                <Input
                  id="mockup-admin-note"
                  value={mockupAdminNote}
                  onChange={(e) => setMockupAdminNote(e.target.value)}
                  placeholder="Contoh: Logo sudah diperbesar sesuai permintaan"
                  className="h-10 bg-white sm:h-8"
                />
              </div>

              <div>
                <label
                  htmlFor="mockup-upload-input"
                  className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50 sm:min-h-9"
                >
                  <Upload className="size-4" aria-hidden="true" />
                  <span>
                    {uploadingMockup
                      ? "Mengunggah Mockup..."
                      : `Unggah Mockup v${order.revisions.length + 1}`}
                  </span>
                </label>
                <input
                  id="mockup-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingMockup}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleMockupFileChange(file);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Unggah mockup dikunci karena pesanan sudah masuk tahap produksi
              atau selesai.
            </p>
          )}

          {order.revisions.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Belum ada mockup yang diunggah.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {order.revisions.map((rev) => (
                <li
                  key={rev.id}
                  className="rounded-md border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-900">
                      Versi {rev.version}
                    </span>
                    <span className="text-slate-500">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(rev.createdAt))}
                    </span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded border border-slate-100">
                    <img
                      src={rev.mockupUrl}
                      alt={`Mockup versi ${rev.version}`}
                      className="max-h-48 w-full bg-slate-50 object-contain"
                      width={400}
                      height={192}
                    />
                  </div>
                  {rev.adminNote && (
                    <p className="mt-2 text-xs text-slate-600">
                      <span className="font-medium">Admin:</span>{" "}
                      {rev.adminNote}
                    </p>
                  )}
                  {rev.clientNote && (
                    <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                      <span className="font-medium">Revisi Client:</span>{" "}
                      {rev.clientNote}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment Ledger */}
        <section
          aria-labelledby="detail-payment-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              id="detail-payment-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Buku Pembayaran
            </h2>
            {canPay && order.paymentSummary.remaining > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => setPayOpen(true)}
                className="min-h-10 cursor-pointer sm:min-h-8"
              >
                <CreditCard className="size-3.5" aria-hidden="true" />
                <span>+ Bayar</span>
              </Button>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-slate-50 p-3">
            <div>
              <dt className="text-xs text-slate-500">Total</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatRupiah(order.totalPrice)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Terbayar</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                {formatRupiah(order.paymentSummary.totalPaid)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Sisa</dt>
              <dd
                className={`mt-0.5 text-sm font-semibold ${
                  order.paymentSummary.remaining > 0
                    ? "text-amber-700"
                    : "text-green-700"
                }`}
              >
                {formatRupiah(order.paymentSummary.remaining)}
              </dd>
            </div>
          </dl>

          {order.payments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Belum ada pembayaran tercatat.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {order.payments.map((pay) => (
                <li
                  key={pay.id}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRupiah(pay.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {pay.paymentMethod} ·{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(pay.paidAt))}
                    </p>
                    {pay.note && (
                      <p className="mt-0.5 text-xs text-slate-600">{pay.note}</p>
                    )}
                  </div>
                  {pay.proofUrl && (
                    <a
                      href={pay.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-slate-700 underline hover:text-slate-900"
                    >
                      Lihat Bukti
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Modals */}
      <QuickPaymentModal
        open={payOpen}
        onOpenChange={setPayOpen}
        orderId={order.id}
        orderCode={order.orderCode}
        customerName={order.customerName}
        totalPrice={order.totalPrice}
        totalPaid={order.paymentSummary.totalPaid}
        remaining={order.paymentSummary.remaining}
      />

      <CancelOrderModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderId={order.id}
        orderCode={order.orderCode}
        orderStatus={order.status}
        stockDeducted={order.stockDeducted}
        totalPaid={order.paymentSummary.totalPaid}
      />

      {waModal && (
        <WaGeneratorModal
          open={Boolean(waModal)}
          onOpenChange={(open) => {
            if (!open) setWaModal(null);
          }}
          mode={waModal.mode}
          orderCode={order.orderCode}
          customerName={order.customerName}
          customerWa={order.customerWa}
          shopName={shopName}
          trackingUrl={trackingUrl}
          totalPrice={order.totalPrice}
          totalPaid={order.paymentSummary.totalPaid}
          remaining={order.paymentSummary.remaining}
          status={waModal.status}
          trackingNumber={waModal.trackingNumber}
          bankInfo={bankInfo}
        />
      )}
    </div>
  );
}
