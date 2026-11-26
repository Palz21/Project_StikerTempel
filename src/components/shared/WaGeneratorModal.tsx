"use client";

import { useState, useCallback, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  waTemplateOrderCreated,
  waTemplateStatusUpdate,
  buildWaLink,
  STATUS_LABELS,
} from "@/lib/wa-templates";
import { Check, Copy, ExternalLink } from "lucide-react";

interface WaGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "created" | "status-update";
  orderCode: string;
  customerName: string;
  customerWa: string;
  shopName: string;
  trackingUrl: string;
  totalPrice: number;
  totalPaid: number;
  remaining: number;
  status?: string;
  trackingNumber?: string | null;
  bankInfo?: string;
}

export function WaGeneratorModal({
  open,
  onOpenChange,
  mode,
  orderCode,
  customerName,
  customerWa,
  shopName,
  trackingUrl,
  totalPrice,
  totalPaid,
  remaining,
  status,
  trackingNumber,
  bankInfo,
}: WaGeneratorModalProps) {
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const ctx = {
    orderCode,
    customerName,
    shopName,
    trackingUrl,
    totalPrice,
    totalPaid,
    remaining,
    trackingNumber,
    bankInfo,
  };

  const message =
    mode === "created"
      ? waTemplateOrderCreated(ctx)
      : waTemplateStatusUpdate({
          ...ctx,
          statusLabel: STATUS_LABELS[status ?? ""] ?? status ?? "",
        });

  const waLink = buildWaLink(customerWa, message);

  const handleCopy = useCallback(() => {
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopied(false);
      }
    });
  }, [message]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Kirim Pesan WhatsApp</DialogTitle>
          <DialogDescription>
            Salin teks di bawah atau langsung buka WhatsApp untuk mengirim ke pelanggan.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
            {message}
          </pre>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="min-h-11 flex-1 cursor-pointer sm:min-h-9"
          >
            {copied ? (
              <>
                <Check className="size-4" aria-hidden="true" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden="true" />
                Salin Teks
              </>
            )}
          </Button>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              className: "min-h-11 flex-1 cursor-pointer sm:min-h-9",
            })}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Buka WhatsApp
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
