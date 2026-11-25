"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  getCurrentSession,
  setSessionCookie,
  verifyPassword,
  type SessionPayload,
} from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { loginSchema, type LoginInput } from "@/lib/validations";

/**
 * Authenticate an internal user (OWNER or ADMIN) and set httpOnly JWT cookie.
 */
export async function loginAction(
  input: LoginInput
): Promise<ActionResult<SessionPayload>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      "Input login tidak valid.",
      parsed.error.flatten().fieldErrors
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return fail("Email atau password salah.");
  }

  if (!user.isActive) {
    return fail("Akun ini sedang dinonaktifkan. Hubungi Owner.");
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return fail("Email atau password salah.");
  }

  const session: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  await setSessionCookie(session);
  return ok(session, "Berhasil masuk.");
}

/**
 * Clear session cookie and redirect to /login.
 */
export async function logoutAction(): Promise<never> {
  await clearSessionCookie();
  redirect("/login");
}

/**
 * Read current authenticated session for client/server consumers.
 */
export async function getSessionAction(): Promise<SessionPayload | null> {
  return getCurrentSession();
}
