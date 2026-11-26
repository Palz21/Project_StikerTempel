"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DesignStatusBadge } from "@/components/shared/StatusBadge";
import {
  approveDesignByClientAction,
  requestRevisionByClientAction,
} from "@/actions/revision.actions";
import { Check, RotateCcw } from "lucide-react";

interface MockupReviewCardProps {
  uuid: string;
  designStatus: string;
  currentMockupUrl: string | null;
  canReviewDesign: boolean;
  revisions: Array<{
    version: number;
    mockupUrl: string;
    clientNote: string | null;
    adminNote: string | null;
    createdAt: Date;
  }>;
}

export function MockupReviewCard({
  uuid,
  designStatus,
  currentMockupUrl,
  canReviewDesign,
  revisions,
}: MockupReviewCardProps) {
  const router = useRouter();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [clientNote, setClientNote] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    setFeedback(null);
    startTransition(async () => {
      const result = await approveDesignByClientAction({ uuid });
      if (result.success) {
        setFeedback({ type: "success", message: result.message ?? "Desain disetujui." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  function handleRevision() {
    if (clientNote.trim().length < 3) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await requestRevisionByClientAction({
        uuid,
        clientNote: clientNote.trim(),
      });
      if (result.success) {
        setFeedback({
          type: "success",
          message: result.message ?? "Permintaan revisi terkirim.",
        });
        setShowRevisionForm(false);
        setClientNote("");
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  if (!currentMockupUrl && revisions.length === 0) {
    return (
      <section
        aria-labelledby="mockup-heading"
        className="rounded-lg border border-slate-200 bg-white p-5"
      >
        <h3 id="mockup-heading" className="text-sm font-semibold text-slate-900">
          Pratinjau Desain
        </h3>
        <div className="mt-3 flex items-center gap-2">
          <DesignStatusBadge status={designStatus} />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          Admin belum mengunggah mockup desain. Anda akan melihat pratinjau di sini
          setelah desain dikirim.
        </p>
      </section>
    );
  }

  const latestRevision = revisions[0];

  return (
    <section
      aria-labelledby="mockup-heading"
      className="rounded-lg border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="mockup-heading" className="text-sm font-semibold text-slate-900">
          Pratinjau Desain
        </h3>
        <DesignStatusBadge status={designStatus} />
      </div>

      {/* Current mockup image */}
      {currentMockupUrl && (
        <div className="mt-3 overflow-hidden rounded-md border border-slate-100">
          <img
            src={currentMockupUrl}
            alt={`Mockup desain pesanan versi ${latestRevision?.version ?? 1}`}
            className="w-full object-contain"
            width={600}
            height={400}
          />
        </div>
      )}

      {/* Admin note if present */}
      {latestRevision?.adminNote && (
        <div className="mt-3 rounded-md bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Catatan Admin:</p>
          <p className="mt-0.5 text-sm text-slate-700">{latestRevision.adminNote}</p>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          role="alert"
          className={`mt-3 rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* ACC / Revisi actions (only when canReviewDesign) */}
      {canReviewDesign && feedback?.type !== "success" && (
        <div className="mt-4 space-y-3">
          {!showRevisionForm ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="min-h-11 flex-1 cursor-pointer sm:min-h-9"
              >
                <Check className="size-4" aria-hidden="true" />
                {isPending ? "Memproses..." : "Setujui Desain (ACC)"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRevisionForm(true)}
                disabled={isPending}
                className="min-h-11 flex-1 cursor-pointer sm:min-h-9"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Ajukan Revisi
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="revision-note">Catatan Revisi</Label>
              <Textarea
                id="revision-note"
                value={clientNote}
                onChange={(e) => setClientNote(e.target.value)}
                placeholder="Jelaskan perubahan yang diinginkan..."
                rows={3}
                minLength={3}
                maxLength={1000}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleRevision}
                  disabled={isPending || clientNote.trim().length < 3}
                  className="min-h-11 flex-1 cursor-pointer sm:min-h-9"
                >
                  {isPending ? "Mengirim..." : "Kirim Permintaan Revisi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowRevisionForm(false);
                    setClientNote("");
                  }}
                  disabled={isPending}
                  className="min-h-11 cursor-pointer sm:min-h-9"
                >
                  Batal
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revision history */}
      {revisions.length > 1 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            Riwayat Revisi ({revisions.length} versi)
          </summary>
          <ul className="mt-2 space-y-2">
            {revisions.map((rev) => (
              <li
                key={rev.version}
                className="flex items-start gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600"
              >
                <span className="shrink-0 font-semibold">v{rev.version}</span>
                <div className="min-w-0 flex-1">
                  {rev.clientNote && <p>Catatan: {rev.clientNote}</p>}
                  {rev.adminNote && <p>Admin: {rev.adminNote}</p>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
