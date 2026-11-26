"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addOrderPaymentAction } from "@/actions/payment.actions";
import { formatRupiah } from "@/lib/formatters";
import { compressAndUploadImage } from "@/lib/client-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

const selectClassName =
  "h-11 w-full cursor-pointer rounded-lg border border-input bg-white px-3 text-sm text-slate-900 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9";

interface QuickPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  customerName: string;
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  onSuccess?: () => void;
}

export function QuickPaymentModal({
  open,
  onOpenChange,
  orderId,
  orderCode,
  customerName,
  totalPrice,
  totalPaid,
  remaining,
  onSuccess,
}: QuickPaymentModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "TRANSFER" | "TUNAI" | "QRIS"
  >("TRANSFER");
  const [note, setNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFillRemaining() {
    if (remaining > 0) {
      setAmount(String(remaining));
    }
  }

  async function handleProofUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const res = await compressAndUploadImage(file);
    setUploading(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setProofUrl(res.url);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number.parseInt(amount || "0", 10);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      setError("Masukkan nominal pembayaran yang valid.");
      return;
    }

    startTransition(async () => {
      const result = await addOrderPaymentAction({
        orderId,
        amount: parsedAmount,
        paymentMethod,
        proofUrl,
        note: note.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setAmount("");
      setNote("");
      setProofUrl(null);
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran ({orderCode})</DialogTitle>
          <DialogDescription>
            {customerName} · Total {formatRupiah(totalPrice)} · Terbayar{" "}
            {formatRupiah(totalPaid)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="quick-pay-amount">Nominal Dibayar (Rp)</Label>
              {remaining > 0 && (
                <button
                  type="button"
                  onClick={handleFillRemaining}
                  className="cursor-pointer rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Isi Sisa Tagihan ({formatRupiah(remaining)})
                </button>
              )}
            </div>
            <Input
              id="quick-pay-amount"
              type="number"
              min={1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 250000"
              className="h-11 sm:h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-pay-method">Metode Pembayaran</Label>
            <select
              id="quick-pay-method"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(
                  e.target.value as "TRANSFER" | "TUNAI" | "QRIS"
                )
              }
              className={selectClassName}
            >
              <option value="TRANSFER">Transfer Bank</option>
              <option value="TUNAI">Tunai</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-pay-note">Catatan (Opsional)</Label>
            <Input
              id="quick-pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: DP Awal atau Pelunasan"
              className="h-11 sm:h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-pay-proof">Bukti Bayar (Opsional)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="quick-pay-proof"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 sm:min-h-9"
              >
                <Upload className="size-4" aria-hidden="true" />
                <span>{uploading ? "Mengunggah..." : "Unggah Bukti"}</span>
              </label>
              <input
                id="quick-pay-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleProofUpload(file);
                  e.target.value = "";
                }}
                className="sr-only"
              />
              {proofUrl && (
                <div className="flex items-center gap-1.5 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600">
                  <span>Bukti siap</span>
                  <button
                    type="button"
                    onClick={() => setProofUrl(null)}
                    aria-label="Hapus bukti pembayaran"
                    className="cursor-pointer text-slate-400 hover:text-slate-700"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="min-h-11 cursor-pointer sm:min-h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || uploading}
              className="min-h-11 cursor-pointer sm:min-h-9"
            >
              {isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
