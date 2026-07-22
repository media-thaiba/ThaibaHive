import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { authConfig } from "./config";
import { db, staff } from "@thaiba/db";
import { eq } from "drizzle-orm";

const sessionPayloadSchema = z.object({
  staffId: z.string(),
  email: z.string(),
  role: z.string(),
  employeeId: z.string(),
  name: z.string(),
  tokenVersion: z.number(),
});

const secret = new TextEncoder().encode(authConfig.jwtSecret);

export type SessionPayload = {
  staffId: string;
  email: string;
  role: string;
  employeeId: string;
  name: string;
  tokenVersion: number;
};

export async function createSession(payload: SessionPayload, extendSession = false) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(authConfig.sessionExpiry)
    .setIssuedAt()
    .sign(secret);

  const cookieStore = await cookies();
  const maxAge = extendSession
    ? 60 * 60 * 24 * 7  // 7 days with "Remember Me"
    : 60 * 60 * 24;     // 24 hours default

  const cookieOptions: Record<string, unknown> = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };

  if (process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }

  cookieStore.set(authConfig.cookieName, token, cookieOptions);

  return token;
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get(authConfig.cookieName)?.value;

  if (!token) {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const result = sessionPayloadSchema.safeParse(payload);
    if (!result.success) return null;
    const session = result.data;

    const user = await db
      .select({ isActive: staff.isActive, tokenVersion: staff.tokenVersion })
      .from(staff)
      .where(eq(staff.id, session.staffId))
      .get();

    if (!user || !user.isActive) return null;
    if (user.tokenVersion !== session.tokenVersion) return null;

    return session;
  } catch (error: any) {
    console.error("[Auth] Session verification failed:", error?.message || error);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(authConfig.cookieName);
}
