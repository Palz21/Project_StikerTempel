import { formatRupiah } from "./formatters";

interface WaOrderContext {
  orderCode: string;
  customerName: string;
  shopName: string;
  trackingUrl: string;
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  trackingNumber?: string | null;
  bankInfo?: string;
}

/**
 * Template saat order baru dibuat (Skenario A) atau dikonfirmasi (Skenario B).
 */
export function waTemplateOrderCreated(ctx: WaOrderContext): string {
  const lines = [
    `Halo ${ctx.customerName},`,
    ``,
    `Pesanan Anda di *${ctx.shopName}* telah dicatat.`,
    `Kode Pesanan: *${ctx.orderCode}*`,
    `Total: *${formatRupiah(ctx.totalPrice)}*`,
  ];

  if (ctx.totalPaid > 0) {
    lines.push(`Terbayar: ${formatRupiah(ctx.totalPaid)}`);
  }

  if (ctx.remaining > 0) {
    lines.push(`Sisa Tagihan: ${formatRupiah(ctx.remaining)}`);
  }

  if (ctx.bankInfo) {
    lines.push(``, `Rekening:`, ctx.bankInfo);
  }

  lines.push(
    ``,
    `Pantau status pesanan Anda di:`,
    ctx.trackingUrl,
    ``,
    `Terima kasih!`
  );

  return lines.join("\n");
}

/**
 * Template saat status dinaikkan (mockup siap di-review, produksi, siap ambil).
 */
export function waTemplateStatusUpdate(
  ctx: WaOrderContext & { statusLabel: string }
): string {
  const lines = [
    `Halo ${ctx.customerName},`,
    ``,
    `Update pesanan *${ctx.orderCode}*:`,
    `Status: *${ctx.statusLabel}*`,
  ];

  if (ctx.remaining > 0) {
    lines.push(`Sisa Tagihan: ${formatRupiah(ctx.remaining)}`);
  }

  if (ctx.trackingNumber) {
    lines.push(`No. Resi: ${ctx.trackingNumber}`);
  }

  lines.push(``, `Cek detail:`, ctx.trackingUrl, ``, `Terima kasih!`);

  return lines.join("\n");
}

/**
 * Build wa.me deep link from normalized 628... number and message text.
 */
export function buildWaLink(waNumber: string, message: string): string {
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
}

/** Map OrderStatus enum to Indonesian label for WA messages. */
export const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pesanan Masuk",
  WAITING_ACC_PAYMENT: "Menunggu ACC & Bayar",
  PRODUCTION_QUEUE: "Antre Produksi",
  IN_PROGRESS: "Proses Pengerjaan",
  READY_FOR_PICKUP: "Siap Diambil / Dikirim",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const DESIGN_STATUS_LABELS: Record<string, string> = {
  PENDING: "Belum Ada Mockup",
  WAITING_ACC: "Menunggu ACC",
  REVISION_REQUESTED: "Revisi Diminta",
  APPROVED: "Desain Disetujui",
};

export const PICKUP_METHOD_LABELS: Record<string, string> = {
  SELF_PICKUP: "Ambil Sendiri",
  INSTANT_COURIER: "Kurir Instan",
  EXPEDITION: "Ekspedisi",
};

export const CATEGORY_LABELS: Record<string, string> = {
  CUP: "Gelas Cup",
  PLASTIK: "Plastik",
  DTF_BAJU: "Sablon DTF Baju",
  LAINNYA: "Lainnya",
};
