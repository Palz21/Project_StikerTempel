/**
 * Format integer IDR amount into Indonesian Rupiah currency string.
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Normalize Indonesian phone numbers into `628...` format suitable for wa.me deep links.
 */
export function normalizeWhatsapp(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }
  if (digits.startsWith("8")) {
    return `62${digits}`;
  }
  return digits;
}

/**
 * Generate a human-readable order code in the format `ORD-YYMM-XXX`.
 */
export function generateOrderCode(sequence: number, date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(sequence).padStart(3, "0");
  return `ORD-${yy}${mm}-${seq}`;
}

export type PaymentBadgeState = "UNPAID" | "PARTIAL" | "PAID";

export interface PaymentSummary {
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  state: PaymentBadgeState;
  label: string;
}

/**
 * Compute payment ledger totals and badge state from order totalPrice and payment rows.
 */
export function calculatePaymentSummary(
  totalPrice: number,
  payments: Array<{ amount: number }>
): PaymentSummary {
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, totalPrice - totalPaid);

  if (totalPaid <= 0) {
    return {
      totalPrice,
      totalPaid: 0,
      remaining: totalPrice,
      state: "UNPAID",
      label: "Belum Bayar",
    };
  }

  if (totalPaid < totalPrice) {
    return {
      totalPrice,
      totalPaid,
      remaining,
      state: "PARTIAL",
      label: `Kurang ${formatRupiah(remaining)}`,
    };
  }

  return {
    totalPrice,
    totalPaid,
    remaining: 0,
    state: "PAID",
    label: "Lunas",
  };
}
