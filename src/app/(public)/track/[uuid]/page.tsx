import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicOrderByUuidAction } from "@/actions/tracking.actions";
import { formatRupiah } from "@/lib/formatters";
import {
  CATEGORY_LABELS,
  PICKUP_METHOD_LABELS,
  buildWaLink,
} from "@/lib/wa-templates";
import { OrderProgressBar } from "@/components/client/OrderProgressBar";
import { MockupReviewCard } from "@/components/client/MockupReviewCard";
import {
  OrderStatusBadge,
  PaymentBadge,
} from "@/components/shared/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  MapPin,
  MessageCircle,
  Package,
  Truck,
  Store,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function renderSpecsLines(category: string, specs: unknown): string[] {
  if (!specs || typeof specs !== "object") return [];
  const s = specs as Record<string, unknown>;

  if (category === "CUP") {
    return [
      s.size ? `Ukuran: ${String(s.size)}` : "",
      s.cupType ? `Tipe: ${String(s.cupType)}` : "",
      s.colorCount ? `Jumlah Warna: ${String(s.colorCount)} warna` : "",
      s.lidType ? `Tutup: ${String(s.lidType)}` : "",
    ].filter(Boolean);
  }

  if (category === "PLASTIK") {
    return [
      s.size ? `Ukuran: ${String(s.size)}` : "",
      s.plasticColor ? `Warna Plastik: ${String(s.plasticColor)}` : "",
      s.colorCount ? `Jumlah Warna: ${String(s.colorCount)} warna` : "",
      s.sides ? `Sisi Cetak: ${String(s.sides)}` : "",
    ].filter(Boolean);
  }

  if (category === "DTF_BAJU") {
    return [
      s.apparelType ? `Jenis Pakaian: ${String(s.apparelType)}` : "",
      typeof s.bringOwnApparel === "boolean"
        ? `Bahan: ${s.bringOwnApparel ? "Bawa Baju Sendiri" : "Dari Workshop"}`
        : "",
      s.printArea ? `Area Cetak: ${String(s.printArea)}` : "",
      s.sizeBreakdown ? `Rincian Ukuran: ${String(s.sizeBreakdown)}` : "",
    ].filter(Boolean);
  }

  if (s.description) {
    return [String(s.description)];
  }

  return [];
}

export default async function PublicTrackOrderPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const order = await getPublicOrderByUuidAction(uuid);

  if (!order) {
    notFound();
  }

  const waHelpLink = buildWaLink(
    order.shop.whatsappNumber,
    `Halo Admin ${order.shop.shopName}, saya ${order.customerName} ingin menanyakan pesanan ${order.orderCode}.`
  );

  const formattedDate = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(order.createdAt));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {order.shop.shopName}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
              Pelacakan Pesanan {order.orderCode}
            </h1>
          </div>
          <a
            href={waHelpLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "min-h-11 shrink-0 cursor-pointer sm:min-h-8",
            })}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            <span>Chat Admin</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {/* Ringkasan & Progress */}
        <section
          aria-labelledby="progress-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="progress-heading"
                className="text-sm font-semibold text-slate-900"
              >
                Status Produksi
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pemesan: {order.customerName} · Dibuat {formattedDate}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="mt-5">
            <OrderProgressBar status={order.status} />
          </div>

          {order.status === "CANCELLED" && order.cancelReason && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Alasan Pembatalan:</p>
                <p className="mt-0.5">{order.cancelReason}</p>
              </div>
            </div>
          )}

          {order.status === "PENDING_REVIEW" && (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Pesanan Anda sedang ditinjau oleh admin untuk pengecekan desain dan
              penetapan harga final.
            </p>
          )}
        </section>

        {/* Pratinjau Desain & ACC/Revisi */}
        {order.status !== "CANCELLED" && (
          <MockupReviewCard
            uuid={order.uuid}
            designStatus={order.designStatus}
            currentMockupUrl={order.currentMockupUrl}
            canReviewDesign={order.canReviewDesign}
            revisions={order.revisions}
          />
        )}

        {/* Tagihan & Rekening */}
        <section
          aria-labelledby="payment-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="payment-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Ringkasan Pembayaran
            </h2>
            {order.totalPrice > 0 && (
              <PaymentBadge
                state={order.paymentSummary.state}
                label={order.paymentSummary.label}
              />
            )}
          </div>

          {order.totalPrice <= 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Total tagihan akan tampil setelah admin mengonfirmasi harga pesanan.
            </p>
          ) : (
            <>
              <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Total Tagihan</dt>
                  <dd className="mt-0.5 text-base font-semibold text-slate-900">
                    {formatRupiah(order.paymentSummary.totalPrice)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Sudah Dibayar</dt>
                  <dd className="mt-0.5 text-base font-semibold text-slate-900">
                    {formatRupiah(order.paymentSummary.totalPaid)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Sisa Tagihan</dt>
                  <dd
                    className={`mt-0.5 text-base font-semibold ${
                      order.paymentSummary.remaining > 0
                        ? "text-amber-700"
                        : "text-green-700"
                    }`}
                  >
                    {formatRupiah(order.paymentSummary.remaining)}
                  </dd>
                </div>
              </dl>

              {order.paymentSummary.remaining > 0 && (
                <div className="mt-4 rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-700">
                    Rekening Pembayaran Workshop
                  </p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-slate-600">
                    {order.shop.bankInfo}
                  </pre>
                  <p className="mt-2 text-xs text-slate-500">
                    Setelah transfer, kirim bukti pembayaran ke admin melalui WhatsApp.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {/* Rincian Item */}
        <section
          aria-labelledby="items-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Package className="size-4 text-slate-500" aria-hidden="true" />
            <h2
              id="items-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Rincian Item ({order.items.length})
            </h2>
          </div>

          <ul className="mt-4 divide-y divide-slate-100">
            {order.items.map((item) => {
              const specsLines = renderSpecsLines(item.category, item.specs);
              return (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {item.itemName}
                      </p>
                      {specsLines.length > 0 && (
                        <p className="mt-1 text-xs text-slate-600">
                          {specsLines.join(" · ")}
                        </p>
                      )}
                      {item.logoUrl && (
                        <div className="mt-2">
                          <img
                            src={item.logoUrl}
                            alt={`Logo referensi ${item.itemName}`}
                            className="h-14 w-14 rounded border border-slate-200 object-contain bg-slate-50"
                            width={56}
                            height={56}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {item.qty} pcs
                      </p>
                      {item.subtotal > 0 && (
                        <p className="text-xs text-slate-500">
                          {formatRupiah(item.subtotal)}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Metode Pengambilan / Pengiriman */}
        <section
          aria-labelledby="pickup-heading"
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            {order.pickupMethod === "SELF_PICKUP" ? (
              <Store className="size-4 text-slate-500" aria-hidden="true" />
            ) : (
              <Truck className="size-4 text-slate-500" aria-hidden="true" />
            )}
            <h2
              id="pickup-heading"
              className="text-sm font-semibold text-slate-900"
            >
              Pengambilan: {PICKUP_METHOD_LABELS[order.pickupMethod] ?? order.pickupMethod}
            </h2>
          </div>

          {order.pickupMethod === "SELF_PICKUP" && (
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>{order.shop.address}</p>
              {order.shop.mapsUrl && (
                <a
                  href={order.shop.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "min-h-11 cursor-pointer sm:min-h-8",
                  })}
                >
                  <MapPin className="size-4" aria-hidden="true" />
                  Buka Lokasi di Google Maps
                </a>
              )}
            </div>
          )}

          {order.pickupMethod === "EXPEDITION" && (
            <div className="mt-3 text-sm text-slate-600">
              {order.trackingNumber ? (
                <p>
                  Nomor Resi:{" "}
                  <span className="font-semibold text-slate-900">
                    {order.trackingNumber}
                  </span>
                </p>
              ) : (
                <p>Nomor resi akan ditampilkan setelah paket dikirim.</p>
              )}
            </div>
          )}

          {order.pickupMethod === "INSTANT_COURIER" && (
            <p className="mt-3 text-sm text-slate-600">
              Pengiriman menggunakan kurir instan dari workshop ({order.shop.address}).
            </p>
          )}
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-slate-500">
        <Link href="/order" className="underline hover:text-slate-700">
          Buat pesanan baru
        </Link>
      </footer>
    </div>
  );
}
