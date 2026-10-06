import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { authConfig, getJwtSecretBytes } from "./config";
import { db, staff } from "@thaiba/db";
import { eq } from "drizzle-orm";

const sessionPayloadSchema = z.object({
  staffId: z.string(),
  email: z.string(),
  role: z.string(),
  employeeId: z.string(),
  name: z.string(),
  tokenVersion: z.union([z.number(), z.null(), z.undefined()]).transform((v) => v ?? 0),
  dpopEnabled: z.boolean().optional().default(false),
  institutionId: z.string().nullable().optional(),
});

export type SessionPayload = {
  staffId: string;
  email: string;
  role: string;
  employeeId: string;
  name: string;
  tokenVersion: number;
  dpopEnabled?: boolean;
  institutionId?: string | null;
};

export type DPoPSessionPayload = SessionPayload & {
  cnfJkt?: string;
};

export async function createSession(payload: SessionPayload, extendSession = false) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(authConfig.sessionExpiry)
    .setIssuedAt()
    .sign(getJwtSecretBytes("session"));

  try {
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
  } catch {
    // Non-request context (e.g. tests or background jobs)
  }

  return token;
}

export async function createDPoPSession(payload: SessionPayload, dpopThumbprint: string, _extendSession = false) {
  const enhancedPayload: DPoPSessionPayload = {
    ...payload,
    dpopEnabled: true,
  };

  const token = await new SignJWT({ ...enhancedPayload, cnf: { jkt: dpopThumbprint } })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("10m") // Access token TTL: 10 minutes for DPoP sessions
    .setIssuedAt()
    .sign(getJwtSecretBytes("session"));

  const cookieStore = await cookies();
  const maxAge = 10 * 60; // 10 minutes

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
  let token: string | undefined;
  try {
    const cookieStore = await cookies();
    token = cookieStore.get(authConfig.cookieName)?.value;
  } catch {
    // Missing request store in test environment
  }

  if (!token) {
    try {
      const headersList = await headers();
      const authHeader = headersList.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    } catch {
      // Missing request store in test environment
    }
  }

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes("session"));
    const result = sessionPayloadSchema.safeParse(payload);
    if (!result.success) return null;
    const session = result.data;

    const user = await db
      .select({ isActive: staff.isActive, tokenVersion: staff.tokenVersion })
      .from(staff)
      .where(eq(staff.id, session.staffId))
      .get();

    if (!user || !user.isActive) return null;
    if ((user.tokenVersion ?? 0) !== session.tokenVersion) return null;

    // Fast revocation check
    try {
      const { revocationStore } = await import("@/lib/identity/revocation-store");
      if (session.staffId && revocationStore.isRevoked(session.staffId)) {
        return null;
      }
    } catch {
      // Identity module not loaded
    }

    return session;
  } catch (error: unknown) {
    console.error("[Auth] Session verification failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(authConfig.cookieName);
}

export async function createStepUpToken(staffId: string, challengeId: string): Promise<string> {
  return await new SignJWT({ staffId, challengeId, stepUpPending: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getJwtSecretBytes("step-up"));
}

export async function verifyStepUpToken(token: string): Promise<{ staffId: string; challengeId?: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes("step-up"));
    if (payload.staffId && typeof payload.staffId === "string" && payload.stepUpPending === true) {
      return {
        staffId: payload.staffId,
        challengeId: typeof payload.challengeId === "string" ? payload.challengeId : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
