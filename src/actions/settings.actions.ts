"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAuth, requireOwner } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { normalizeWhatsapp } from "@/lib/formatters";
import {
  createUserSchema,
  shopSettingSchema,
  toggleUserActiveSchema,
  type CreateUserInput,
  type ShopSettingInput,
} from "@/lib/validations";

/**
 * Fetch singleton ShopSetting row (id = 1), creating defaults if absent.
 */
export async function getShopSettings() {
  return prisma.shopSetting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

/**
 * Update workshop profile, WhatsApp number, address, Maps URL, and bank info.
 */
export async function updateShopSettingsAction(
  input: ShopSettingInput
): Promise<ActionResult<{ id: number }>> {
  try {
    await requireAuth();
  } catch {
    return fail("Sesi berakhir. Silakan login kembali.");
  }

  const parsed = shopSettingSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data pengaturan workshop tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const normalizedWa = normalizeWhatsapp(parsed.data.whatsappNumber);
  if (normalizedWa.length < 10) {
    return fail("Nomor WhatsApp tidak valid.", {
      whatsappNumber: ["Nomor WhatsApp minimal 10 digit."],
    });
  }

  await prisma.shopSetting.upsert({
    where: { id: 1 },
    update: {
      shopName: parsed.data.shopName,
      whatsappNumber: normalizedWa,
      address: parsed.data.address,
      mapsUrl: parsed.data.mapsUrl || null,
      bankInfo: parsed.data.bankInfo,
    },
    create: {
      id: 1,
      shopName: parsed.data.shopName,
      whatsappNumber: normalizedWa,
      address: parsed.data.address,
      mapsUrl: parsed.data.mapsUrl || null,
      bankInfo: parsed.data.bankInfo,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/order");
  return ok({ id: 1 }, "Pengaturan workshop berhasil diperbarui.");
}

export interface SafeUserRow {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN";
  isActive: boolean;
  createdAt: Date;
}

/**
 * List all internal accounts (OWNER only). Password hashes are never returned.
 */
export async function listUsersAction(): Promise<ActionResult<SafeUserRow[]>> {
  try {
    await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat mengelola akun."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return ok(users);
}

/**
 * Create a new ADMIN or OWNER account (OWNER only).
 */
export async function createUserAction(
  input: CreateUserInput
): Promise<ActionResult<SafeUserRow>> {
  try {
    await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat menambah akun."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Data pengguna tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return fail("Email sudah terdaftar.", {
      email: ["Gunakan alamat email lain."],
    });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const created = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  revalidatePath("/admin/settings");
  return ok(created, "Akun baru berhasil dibuat.");
}

/**
 * Activate or deactivate an account (OWNER only, cannot deactivate self).
 */
export async function toggleUserActiveAction(input: {
  userId: string;
  isActive: boolean;
}): Promise<ActionResult<{ id: string; isActive: boolean }>> {
  let session;
  try {
    session = await requireOwner();
  } catch (err) {
    const message =
      err instanceof Error && err.message === "FORBIDDEN"
        ? "Hanya OWNER yang dapat mengubah status akun."
        : "Sesi berakhir. Silakan login kembali.";
    return fail(message);
  }

  const parsed = toggleUserActiveSchema.safeParse(input);
  if (!parsed.success) {
    return fail("Parameter tidak valid.");
  }

  if (parsed.data.userId === session.userId && !parsed.data.isActive) {
    return fail("Anda tidak dapat menonaktifkan akun sendiri.");
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { isActive: parsed.data.isActive },
    select: { id: true, isActive: true },
  });

  revalidatePath("/admin/settings");
  return ok(
    updated,
    updated.isActive ? "Akun diaktifkan." : "Akun dinonaktifkan."
  );
}
