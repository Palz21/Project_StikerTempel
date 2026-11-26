"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrderAction } from "@/actions/order.actions";
import { formatRupiah } from "@/lib/formatters";
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
import { Textarea } from "@/components/ui/textarea";

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderCode: string;
  orderStatus: string;
  stockDeducted: boolean;
  totalPaid: number;
  onSuccess?: () => void;
}

export function CancelOrderModal({
  open,
  onOpenChange,
  orderId,
  orderCode,
  orderStatus,
  stockDeducted,
  totalPaid,
  onSuccess,
}: CancelOrderModalProps) {
  const router = useRouter();
  const [cancelReason, setCancelReason] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("0");
  const [restoreStock, setRestoreStock] = useState(
    orderStatus === "PRODUCTION_QUEUE"
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setRestoreStock(orderStatus === "PRODUCTION_QUEUE");
      setError(null);
    }
  }, [open, orderStatus]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const parsedRefund = Number.parseInt(refundAmount || "0", 10);
    if (!Number.isFinite(parsedRefund) || parsedRefund < 0) {
      setError("Nominal refund tidak boleh negatif.");
      return;
    }

    if (parsedRefund > totalPaid) {
      setError(
        `Nominal refund tidak boleh melebihi total terbayar (${formatRupiah(totalPaid)}).`
      );
      return;
    }

    startTransition(async () => {
      const result = await cancelOrderAction({
        orderId,
        cancelReason: cancelReason.trim(),
        refundAmount: totalPaid > 0 ? parsedRefund : 0,
        restoreStock: stockDeducted ? restoreStock : false,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setCancelReason("");
      setRefundAmount("0");
      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Batalkan Pesanan ({orderCode})</DialogTitle>
          <DialogDescription>
            Pesanan akan diubah ke status Dibatalkan (soft cancel) untuk menjaga
            jejak audit keuangan.
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
            <Label htmlFor="cancel-reason">Alasan Pembatalan</Label>
            <Textarea
              id="cancel-reason"
              required
              minLength={3}
              maxLength={500}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: Pelanggan membatalkan sebelum naik cetak"
              rows={3}
            />
          </div>

          {totalPaid > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="refund-amount">Nominal Refund (Rp)</Label>
                <span className="text-xs text-slate-500">
                  Terbayar: {formatRupiah(totalPaid)}
                </span>
              </div>
              <Input
                id="refund-amount"
                type="number"
                min={0}
                max={totalPaid}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="h-11 sm:h-9"
              />
              <p className="text-xs text-slate-500">
                Pemasukan lama tetap tersimpan; refund lebih dari Rp0 akan
                dicatat sebagai pengeluaran kategori Refund Pembatalan.
              </p>
            </div>
          )}

          {stockDeducted && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="mt-0.5 size-4 cursor-pointer rounded border-amber-400"
                />
                <span>
                  Kembalikan stok bahan baku polosan ke gudang?
                  <span className="mt-0.5 block text-xs text-amber-800">
                    Centang jika bahan masih polosan (Antre Produksi). Jangan
                    centang jika sudah terkena tinta/rusak.
                  </span>
                </span>
              </label>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="min-h-11 cursor-pointer sm:min-h-9"
            >
              Tutup
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isPending || cancelReason.trim().length < 3}
              className="min-h-11 cursor-pointer sm:min-h-9"
            >
              {isPending ? "Membatalkan..." : "Konfirmasi Pembatalan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
