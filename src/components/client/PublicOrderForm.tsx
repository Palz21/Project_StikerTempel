"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { OrderItemInput } from "@/lib/validations";
import { createClientOrderAction } from "@/actions/order.actions";
import { buildWaLink } from "@/lib/wa-templates";
import {
  DynamicItemForm,
  createDefaultItem,
} from "@/components/admin/DynamicItemForm";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, ExternalLink } from "lucide-react";

const selectClassName =
  "h-11 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-slate-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9";

interface PublicOrderFormProps {
  shopName: string;
  shopWhatsapp: string;
}

export function PublicOrderForm({
  shopName,
  shopWhatsapp,
}: PublicOrderFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerWa, setCustomerWa] = useState("");
  const [pickupMethod, setPickupMethod] = useState<
    "SELF_PICKUP" | "INSTANT_COURIER" | "EXPEDITION"
  >("SELF_PICKUP");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItemInput[]>([
    createDefaultItem("CUP"),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{
    uuid: string;
    orderCode: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createClientOrderAction({
        customerName,
        customerWa,
        pickupMethod,
        notes: notes.trim() || undefined,
        items,
      });

      if (!result.success || !result.data) {
        if (result.success) {
          setError("Gagal mengirim pesanan.");
        } else {
          const detail = result.fieldErrors
            ? Object.values(result.fieldErrors).flat()[0]
            : undefined;
          setError(detail ? `${result.error} (${detail})` : result.error);
        }
        return;
      }

      setSubmitted(result.data);
    });
  }

  if (submitted) {
    const waConfirmLink = buildWaLink(
      shopWhatsapp,
      `Halo Admin ${shopName}, saya ${customerName} baru saja mengirim pesanan *${submitted.orderCode}*. Mohon dicek dan dikonfirmasi harganya. Terima kasih.`
    );

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-full bg-green-50 text-green-700">
          <Check className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Pesanan Diterima ({submitted.orderCode})
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Pesanan Anda masuk ke antrean pengecekan admin. Harga final dan
          pratinjau desain akan dikirim melalui halaman pelacakan di bawah ini.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href={`/track/${submitted.uuid}`}
            className={buttonVariants({
              className: "min-h-11 flex-1 cursor-pointer sm:min-h-9",
            })}
          >
            Buka Halaman Pelacakan
          </Link>
          <a
            href={waConfirmLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "outline",
              className: "min-h-11 flex-1 cursor-pointer sm:min-h-9",
            })}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Kabari Admin via WhatsApp
          </a>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitted(null);
            setCustomerName("");
            setCustomerWa("");
            setNotes("");
            setItems([createDefaultItem("CUP")]);
          }}
          className="mt-4 cursor-pointer text-xs font-medium text-slate-500 underline hover:text-slate-700"
        >
          Buat pesanan lain
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Identitas Pelanggan */}
      <section
        aria-labelledby="customer-section-title"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2
          id="customer-section-title"
          className="text-sm font-semibold text-slate-900"
        >
          Data Pemesan
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customer-name">Nama Lengkap / Nama Usaha</Label>
            <Input
              id="customer-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Kopi Senja Surabaya"
              className="h-11 sm:h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-wa">Nomor WhatsApp Aktif</Label>
            <Input
              id="customer-wa"
              type="tel"
              required
              value={customerWa}
              onChange={(e) => setCustomerWa(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="h-11 sm:h-9"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pickup-method">Metode Pengambilan / Pengiriman</Label>
            <select
              id="pickup-method"
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
              <option value="SELF_PICKUP">Ambil Sendiri di Workshop</option>
              <option value="INSTANT_COURIER">Kurir Instan</option>
              <option value="EXPEDITION">Ekspedisi</option>
            </select>
          </div>
        </div>
      </section>

      {/* Rincian Item */}
      <section aria-labelledby="items-section-title" className="space-y-3">
        <h2
          id="items-section-title"
          className="text-sm font-semibold text-slate-900"
        >
          Rincian Pesanan
        </h2>
        <DynamicItemForm mode="client" items={items} onChange={setItems} />
      </section>

      {/* Catatan */}
      <section
        aria-labelledby="notes-section-title"
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <Label htmlFor="order-notes" id="notes-section-title">
          Catatan Tambahan (Opsional)
        </Label>
        <Textarea
          id="order-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: Deadline tanggal 15, atau permintaan posisi logo..."
          rows={3}
          className="mt-2"
        />
      </section>

      <Button
        type="submit"
        disabled={isPending}
        className="min-h-11 w-full cursor-pointer sm:min-h-10"
      >
        {isPending ? "Mengirim Pesanan..." : "Kirim Pesanan"}
      </Button>
    </form>
  );
}
