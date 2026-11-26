"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderItemInput } from "@/lib/validations";
import { createAdminOrderAction } from "@/actions/order.actions";
import { formatRupiah, normalizeWhatsapp } from "@/lib/formatters";
import {
  DynamicItemForm,
  createDefaultItem,
  type MaterialOption,
} from "@/components/admin/DynamicItemForm";
import { WaGeneratorModal } from "@/components/shared/WaGeneratorModal";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

const selectClassName =
  "h-11 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-slate-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9";

interface NewOrderFormProps {
  materials: MaterialOption[];
  shopName: string;
  bankInfo: string;
  appUrl: string;
}

export function NewOrderForm({
  materials,
  shopName,
  bankInfo,
  appUrl,
}: NewOrderFormProps) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [pickupMethod, setPickupMethod] = useState<
    "SELF_PICKUP" | "INSTANT_COURIER" | "EXPEDITION"
  >("SELF_PICKUP");
  const [initialStatus, setInitialStatus] = useState<
    "WAITING_ACC_PAYMENT" | "PRODUCTION_QUEUE"
  >("WAITING_ACC_PAYMENT");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItemInput[]>([
    createDefaultItem("CUP"),
  ]);

  const [initialPaymentAmount, setInitialPaymentAmount] = useState("0");
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<
    "TRANSFER" | "TUNAI" | "QRIS"
  >("TRANSFER");
  const [initialPaymentNote, setInitialPaymentNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [createdResult, setCreatedResult] = useState<{
    id: string;
    uuid: string;
    orderCode: string;
    totalPrice: number;
    paid: number;
    customerName: string;
    customerWa: string;
  } | null>(null);

  const computedTotal = items.reduce(
    (sum, item) => sum + item.qty * (item.unitPrice ?? 0),
    0
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedPay = Number.parseInt(initialPaymentAmount || "0", 10);
    if (!Number.isFinite(parsedPay) || parsedPay < 0) {
      setError("Nominal pembayaran awal tidak boleh negatif.");
      return;
    }

    startTransition(async () => {
      const result = await createAdminOrderAction({
        customerName,
        customerWa,
        pickupMethod,
        initialStatus,
        notes: notes.trim() || undefined,
        items,
        initialPaymentAmount: parsedPay,
        initialPaymentMethod,
        initialPaymentNote: initialPaymentNote.trim() || undefined,
      });

      if (!result.success || !result.data) {
        if (result.success) {
          setError("Gagal membuat pesanan.");
        } else {
          const detail = result.fieldErrors
            ? Object.values(result.fieldErrors).flat()[0]
            : undefined;
          setError(detail ? `${result.error} (${detail})` : result.error);
        }
        return;
      }

      setCreatedResult({
        id: result.data.id,
        uuid: result.data.uuid,
        orderCode: result.data.orderCode,
        totalPrice: result.data.totalPrice,
        paid: parsedPay,
        customerName,
        customerWa: normalizeWhatsapp(customerWa),
      });
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Pelanggan */}
        <section
          aria-labelledby="new-order-customer"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2
            id="new-order-customer"
            className="text-sm font-semibold text-slate-900"
          >
            Data Pelanggan
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-customer-name">Nama Pelanggan</Label>
              <Input
                id="admin-customer-name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Contoh: Kopi Kenangan Lokal"
                className="h-11 sm:h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-customer-wa">Nomor WhatsApp</Label>
              <Input
                id="admin-customer-wa"
                type="tel"
                required
                value={customerWa}
                onChange={(e) => setCustomerWa(e.target.value)}
                placeholder="081234567890"
                className="h-11 sm:h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-pickup-method">Metode Pengambilan</Label>
              <select
                id="admin-pickup-method"
                value={pickupMethod}
                onChange={(e) =>
                  setPickupMethod(
                    e.target.value as
                      | "SELF_PICKUP"
                      | "INSTANT_COURIER"
                      | "EXPEDITION"
                  )
                }
                className={selectClassName}
              >
                <option value="SELF_PICKUP">Ambil Sendiri</option>
                <option value="INSTANT_COURIER">Kurir Instan</option>
                <option value="EXPEDITION">Ekspedisi</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-initial-status">Status Awal</Label>
              <select
                id="admin-initial-status"
                value={initialStatus}
                onChange={(e) =>
                  setInitialStatus(
                    e.target.value as
                      | "WAITING_ACC_PAYMENT"
                      | "PRODUCTION_QUEUE"
                  )
                }
                className={selectClassName}
              >
                <option value="WAITING_ACC_PAYMENT">
                  Menunggu ACC & Bayar
                </option>
                <option value="PRODUCTION_QUEUE">
                  Langsung Antre Produksi (Potong Stok Sekarang)
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* Items */}
        <section aria-labelledby="new-order-items" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2
              id="new-order-items"
              className="text-sm font-semibold text-slate-900"
            >
              Rincian Item & Harga
            </h2>
            <p className="text-sm font-semibold text-slate-900">
              Total: {formatRupiah(computedTotal)}
            </p>
          </div>
          <DynamicItemForm
            mode="admin"
            items={items}
            onChange={setItems}
            materials={materials}
          />
        </section>

        {/* Pembayaran Awal */}
        <section
          aria-labelledby="new-order-payment"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="new-order-payment"
              className="text-sm font-semibold text-slate-900"
            >
              Pembayaran Awal (Opsional)
            </h2>
            {computedTotal > 0 && (
              <button
                type="button"
                onClick={() => setInitialPaymentAmount(String(computedTotal))}
                className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Isi Lunas ({formatRupiah(computedTotal)})
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="init-pay-amount">Nominal Dibayar (Rp)</Label>
              <Input
                id="init-pay-amount"
                type="number"
                min={0}
                value={initialPaymentAmount}
                onChange={(e) => setInitialPaymentAmount(e.target.value)}
                className="h-11 sm:h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="init-pay-method">Metode</Label>
              <select
                id="init-pay-method"
                value={initialPaymentMethod}
                onChange={(e) =>
                  setInitialPaymentMethod(
                    e.target.value as "TRANSFER" | "TUNAI" | "QRIS"
                  )
                }
                className={selectClassName}
              >
                <option value="TRANSFER">Transfer</option>
                <option value="TUNAI">Tunai</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="init-pay-note">Catatan Bayar</Label>
              <Input
                id="init-pay-note"
                value={initialPaymentNote}
                onChange={(e) => setInitialPaymentNote(e.target.value)}
                placeholder="Contoh: DP Awal"
                className="h-11 sm:h-9"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="admin-order-notes">Catatan Produksi (Opsional)</Label>
            <Textarea
              id="admin-order-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan khusus untuk tim produksi..."
              rows={2}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/admin/orders"
            className={buttonVariants({
              variant: "outline",
              className: "min-h-11 cursor-pointer sm:min-h-10",
            })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Kembali
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="min-h-11 cursor-pointer sm:min-h-10"
          >
            {isPending ? "Menyimpan Pesanan..." : "Simpan Pesanan & Buat Teks WA"}
          </Button>
        </div>
      </form>

      {createdResult && (
        <WaGeneratorModal
          open={Boolean(createdResult)}
          onOpenChange={(open) => {
            if (!open) {
              router.push(`/admin/orders/${createdResult.id}`);
            }
          }}
          mode="created"
          orderCode={createdResult.orderCode}
          customerName={createdResult.customerName}
          customerWa={createdResult.customerWa}
          shopName={shopName}
          trackingUrl={`${
            appUrl || (typeof window !== "undefined" ? window.location.origin : "")
          }/track/${createdResult.uuid}`}
          totalPrice={createdResult.totalPrice}
          totalPaid={createdResult.paid}
          remaining={Math.max(0, createdResult.totalPrice - createdResult.paid)}
          bankInfo={bankInfo}
        />
      )}
    </>
  );
}
