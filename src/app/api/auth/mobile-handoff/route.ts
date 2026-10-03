import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/db";
import { staff, usedNonces } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { getJwtSecretBytes } from "@thaiba/auth";
import { checkDistributedRateLimit, extractIp } from "@/lib/api/rate-limit";
import { eq } from "drizzle-orm";

function redirectWithError(code: string, message: string) {
  const url = `/auth/error?code=${encodeURIComponent(code)}&message=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(url, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}

export async function POST(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = await checkDistributedRateLimit(ip, "auth");
    if (!rl.allowed) {
      return redirectWithError("rate_limited", "Too many requests. Please try again later.");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return redirectWithError("missing_nonce", "Missing authentication token.");
    }

    const nonce = authHeader.split(" ")[1];

    let payload;
    try {
      const result = await jwtVerify(nonce, getJwtSecretBytes("session"), {
        algorithms: ["HS256"],
      });
      payload = result.payload as Record<string, unknown>;
    } catch {
      return redirectWithError("invalid_nonce", "Invalid or expired authentication token.");
    }

    const jti = payload.jti as string | undefined;
    if (!jti) {
      return redirectWithError("invalid_nonce", "Token missing identifier.");
    }

    const expiresAt = payload.exp as number | undefined;
    try {
      await db.insert(usedNonces).values({
        jti,
        expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : new Date(Date.now() + 60_000).toISOString(),
      }).run();
    } catch (err: unknown) {
      console.warn("[Security Audit] Nonce replay attempt blocked - Unique constraint failure:", {
        jti,
        ip,
        error: err instanceof Error ? err.message : String(err),
      });
      return redirectWithError("replay_detected", "Token has already been used.");
    }

    const staffId = payload.staffId as string;
    if (!staffId) {
      return redirectWithError("invalid_token", "Token missing user identifier.");
    }

    const user = await db
      .select({
        id: staff.id,
        email: staff.email,
        role: staff.role,
        employeeId: staff.employeeId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        isActive: staff.isActive,
        tokenVersion: staff.tokenVersion,
      })
      .from(staff)
      .where(eq(staff.id, staffId))
      .get();

    if (!user) {
      return redirectWithError("user_not_found", "User account not found.");
    }

    if (!user.isActive) {
      return redirectWithError("account_deactivated", "Account has been deactivated.");
    }

    const tokenVersion = payload.tokenVersion as number | undefined;
    if (tokenVersion !== undefined && user.tokenVersion !== tokenVersion) {
      return redirectWithError("session_invalid", "Session is no longer valid. Please login again.");
    }

    const rawRedirect = new URL(request.url).searchParams.get("redirect") || "/";
    // Validate redirect is a same-origin relative path (no protocol-relative or absolute URLs)
    let redirectPath = "/";
    if (
      rawRedirect.startsWith("/") &&
      !rawRedirect.startsWith("//") &&
      !rawRedirect.startsWith("/\\") &&
      !rawRedirect.startsWith("\\/")
    ) {
      redirectPath = rawRedirect;
    }

    await createSession({
      staffId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      name: `${user.firstName} ${user.lastName}`,
      tokenVersion: user.tokenVersion,
    });

    return NextResponse.redirect(new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
      status: 302,
    });
  } catch (error) {
    console.error("Mobile handoff error:", error);
    return redirectWithError("handoff_failed", "An unexpected error occurred during authentication.");
  }
}
