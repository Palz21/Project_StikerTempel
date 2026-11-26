"use server";

import { revalidatePath } from "next/cache";
import { DesignStatus, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  clientApproveDesignSchema,
  clientRequestRevisionSchema,
  uploadMockupSchema,
  type UploadMockupInput,
} from "@/lib/validations";

const REVISION_ALLOWED_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING_REVIEW,
  OrderStatus.WAITING_ACC_PAYMENT,
];

/**
 * Admin uploads a new mockup version (v1, v2, v3...) and sets designStatus to WAITING_ACC.
 */
export async function uploadMockupRevisionAction(
  input: UploadMockupInput
): Promise<ActionResult<{ revisionId: string; version: number; mockupUrl: string }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = uploadMockupSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data unggah mockup tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { orderId, mockupUrl, adminNote } = parsed.data;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, uuid: true, status: true },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (!REVISION_ALLOWED_STATUSES.includes(order.status)) {
    return fail(
      "Mockup tidak dapat diubah karena pesanan sudah masuk tahap produksi atau selesai."
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    const latest = await tx.orderRevision.findFirst({
      where: { orderId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (latest?.version ?? 0) + 1;

    const revision = await tx.orderRevision.create({
      data: {
        orderId,
        version: nextVersion,
        mockupUrl,
        adminNote: adminNote || null,
      },
      select: { id: true, version: true, mockupUrl: true },
    });

    await tx.order.update({
      where: { id: orderId },
      data: {
        currentMockupUrl: mockupUrl,
        designStatus: DesignStatus.WAITING_ACC,
      },
    });

    return revision;
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/track/${order.uuid}`);

  return ok(
    {
      revisionId: created.id,
      version: created.version,
      mockupUrl: created.mockupUrl,
    },
    `Mockup v${created.version} berhasil diunggah.`
  );
}

/**
 * Public client action on /track/[uuid]: approve the latest mockup (ACC).
 */
export async function approveDesignByClientAction(input: {
  uuid: string;
}): Promise<ActionResult<{ designStatus: DesignStatus }>> {
  const parsed = clientApproveDesignSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Link tracking tidak valid.");
  }

  const order = await prisma.order.findUnique({
    where: { uuid: parsed.data.uuid },
    select: { id: true, uuid: true, status: true, designStatus: true },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (!REVISION_ALLOWED_STATUSES.includes(order.status)) {
    return fail("Desain sudah terkunci karena pesanan memasuki tahap produksi.");
  }

  if (order.designStatus !== DesignStatus.WAITING_ACC) {
    return fail("Tidak ada mockup yang menunggu persetujuan saat ini.");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { designStatus: DesignStatus.APPROVED },
  });

  revalidatePath(`/track/${order.uuid}`);
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin/orders");

  return ok(
    { designStatus: DesignStatus.APPROVED },
    "Desain berhasil disetujui (ACC)."
  );
}

/**
 * Public client action on /track/[uuid]: request a mockup revision with note.
 * Strictly blocked once the order enters PRODUCTION_QUEUE or later.
 */
export async function requestRevisionByClientAction(input: {
  uuid: string;
  clientNote: string;
}): Promise<ActionResult<{ designStatus: DesignStatus; revisionCount: number }>> {
  const parsed = clientRequestRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Catatan revisi tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const order = await prisma.order.findUnique({
    where: { uuid: parsed.data.uuid },
    select: { id: true, uuid: true, status: true, designStatus: true },
  });

  if (!order) {
    return fail("Pesanan tidak ditemukan.");
  }

  if (!REVISION_ALLOWED_STATUSES.includes(order.status)) {
    return fail(
      "Revisi desain dikunci permanen setelah pesanan masuk Antre Produksi."
    );
  }

  if (order.designStatus !== DesignStatus.WAITING_ACC) {
    return fail("Saat ini tidak ada mockup yang sedang menunggu konfirmasi.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const latestRevision = await tx.orderRevision.findFirst({
      where: { orderId: order.id },
      orderBy: { version: "desc" },
      select: { id: true },
    });

    if (latestRevision) {
      await tx.orderRevision.update({
        where: { id: latestRevision.id },
        data: { clientNote: parsed.data.clientNote },
      });
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        designStatus: DesignStatus.REVISION_REQUESTED,
        revisionCount: { increment: 1 },
      },
      select: {
        designStatus: true,
        revisionCount: true,
      },
    });
  });

  revalidatePath(`/track/${order.uuid}`);
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return ok(updated, "Permintaan revisi berhasil dikirim ke admin.");
}
