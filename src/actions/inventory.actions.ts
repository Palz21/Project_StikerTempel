"use server";

import { revalidatePath } from "next/cache";
import { CashFlowType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  rawMaterialSchema,
  restockMaterialSchema,
  updateRawMaterialSchema,
  type RawMaterialInput,
  type RestockMaterialInput,
} from "@/lib/validations";

export interface RawMaterialRow {
  id: string;
  name: string;
  category: "CUP" | "PLASTIK" | "DTF_BAJU" | "LAINNYA";
  stockQty: number;
  minStock: number;
  unit: string;
  isLowStock: boolean;
  updatedAt: Date;
}

/**
 * List all raw materials with computed low-stock flag.
 */
export async function listRawMaterialsAction(): Promise<
  ActionResult<RawMaterialRow[]>
> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const rows = await prisma.rawMaterial.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return ok(
    rows.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      stockQty: item.stockQty,
      minStock: item.minStock,
      unit: item.unit,
      isLowStock: item.stockQty <= item.minStock,
      updatedAt: item.updatedAt,
    }))
  );
}

/**
 * Create a new raw material entry.
 */
export async function createRawMaterialAction(
  input: RawMaterialInput
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = rawMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data bahan baku tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const created = await prisma.rawMaterial.create({
    data: parsed.data,
    select: { id: true },
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return ok(created, "Bahan baku berhasil ditambahkan.");
}

/**
 * Update an existing raw material's metadata or stock threshold.
 */
export async function updateRawMaterialAction(
  input: RawMaterialInput & { id: string }
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = updateRawMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data perubahan bahan baku tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { id, ...data } = parsed.data;
  const existing = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!existing) {
    return fail("Bahan baku tidak ditemukan.");
  }

  await prisma.rawMaterial.update({
    where: { id },
    data,
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return ok({ id }, "Data bahan baku berhasil diperbarui.");
}

/**
 * Delete a raw material (linked OrderItems have rawMaterialId set to null automatically).
 */
export async function deleteRawMaterialAction(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const existing = await prisma.rawMaterial.findUnique({ where: { id } });
  if (!existing) {
    return fail("Bahan baku tidak ditemukan.");
  }

  await prisma.rawMaterial.delete({ where: { id } });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  return ok({ id }, "Bahan baku berhasil dihapus.");
}

/**
 * Restock raw material atomically and optionally record purchase expense in cash_flows.
 */
export async function restockMaterialAction(
  input: RestockMaterialInput
): Promise<ActionResult<{ id: string; stockQty: number; cashFlowId: string | null }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = restockMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data restock tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const { rawMaterialId, addedQty, recordExpense, expenseAmount, description } =
    parsed.data;

  const existing = await prisma.rawMaterial.findUnique({
    where: { id: rawMaterialId },
  });
  if (!existing) {
    return fail("Bahan baku tidak ditemukan.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.rawMaterial.update({
      where: { id: rawMaterialId },
      data: {
        stockQty: { increment: addedQty },
      },
      select: { id: true, name: true, unit: true, stockQty: true },
    });

    let cashFlowId: string | null = null;
    if (recordExpense && expenseAmount > 0) {
      const cf = await tx.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          category: "Kulakan Bahan",
          amount: expenseAmount,
          description:
            description && description.length > 0
              ? description
              : `Restock ${updated.name} (+${addedQty} ${updated.unit})`,
          date: new Date(),
        },
        select: { id: true },
      });
      cashFlowId = cf.id;
    }

    return {
      id: updated.id,
      stockQty: updated.stockQty,
      cashFlowId,
    };
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/finance");
  revalidatePath("/admin");

  return ok(
    result,
    recordExpense
      ? "Stok bertambah dan biaya kulakan tercatat di arus kas."
      : "Stok bahan baku berhasil ditambahkan."
  );
}
