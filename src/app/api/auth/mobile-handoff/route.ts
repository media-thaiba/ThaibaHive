import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, usedNonces } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { verifyMobileNonce } from "@/lib/auth/mobile-nonce-service";
import { checkDistributedRateLimit, extractIp } from "@/lib/api/rate-limit";
import { eq } from "drizzle-orm";

function redirectWithError(code: string, message: string) {
  const url = `/auth/error?code=${encodeURIComponent(code)}&message=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(url, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"), {
    status: 302,
  });
}

function sanitizeRedirect(rawRedirect?: string | null): string {
  if (!rawRedirect || typeof rawRedirect !== "string") return "/";
  try {
    const parsed = new URL(rawRedirect, "http://localhost");
    if (
      rawRedirect.startsWith("/") &&
      !rawRedirect.startsWith("//") &&
      !rawRedirect.includes("\\") &&
      !rawRedirect.includes("://") &&
      !rawRedirect.includes("\r") &&
      !rawRedirect.includes("\n")
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return "/";
  }
  return "/";
}

async function handleMobileHandoff(request: Request) {
  try {
    const ip = extractIp(request);
    const rl = await checkDistributedRateLimit(ip, "auth");
    if (!rl.allowed) {
      return redirectWithError("rate_limited", "Too many requests. Please try again later.");
    }

    let nonce: string | null = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      nonce = authHeader.split(" ")[1];
    } else {
      const url = new URL(request.url);
      nonce = url.searchParams.get("nonce");
    }

    if (!nonce) {
      return redirectWithError("missing_nonce", "Missing authentication token.");
    }

    const payload = await verifyMobileNonce(nonce);
    if (!payload) {
      return redirectWithError("invalid_nonce", "Invalid or expired authentication token.");
    }

    const { jti, staffId, exp, tokenVersion: payloadTokenVersion, targetUrl } = payload;
    if (!jti || !staffId) {
      return redirectWithError("invalid_nonce", "Token missing identifier.");
    }

    try {
      await db.insert(usedNonces).values({
        jti,
        expiresAt: exp ? new Date(exp * 1000).toISOString() : new Date(Date.now() + 60_000).toISOString(),
      }).run();
    } catch (err: unknown) {
      console.warn("[Security Audit] Nonce replay attempt blocked - Unique constraint failure:", {
        jti,
        ip,
        error: err instanceof Error ? err.message : String(err),
      });
      return redirectWithError("replay_detected", "Token has already been used.");
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

    const userTokenVersion = user.tokenVersion ?? 0;
    const nonceTokenVersion = payloadTokenVersion ?? 0;
    if (userTokenVersion !== nonceTokenVersion) {
      return redirectWithError("session_invalid", "Session is no longer valid. Please login again.");
    }

    const rawRedirect = new URL(request.url).searchParams.get("redirect") || targetUrl || "/";
    const redirectPath = sanitizeRedirect(rawRedirect);

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

export async function GET(request: Request) {
  return handleMobileHandoff(request);
}

export async function POST(request: Request) {
  return handleMobileHandoff(request);
}
