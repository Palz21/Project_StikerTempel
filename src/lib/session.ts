import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "stiker_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionRole = "OWNER" | "ADMIN";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: SessionRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "AUTH_SECRET environment variable is missing or shorter than 16 characters."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Edge-safe JWT signer using `jose` HS256.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

/**
 * Edge-safe JWT verifier for middleware and Server Components/Actions.
 */
export async function verifySessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    const userId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;

    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      (role !== "OWNER" && role !== "ADMIN")
    ) {
      return null;
    }

    return { userId, email, name, role };
  } catch {
    return null;
  }
}
