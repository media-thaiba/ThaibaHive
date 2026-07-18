import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { db } from "@/db";
import { staff, usedNonces } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { authConfig } from "@/lib/auth/config";
import { eq } from "drizzle-orm";

const secret = new TextEncoder().encode(authConfig.jwtSecret);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip: string): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function redirectWithError(code: string, message: string) {
  const url = `/auth/error?code=${encodeURIComponent(code)}&message=${encodeURIComponent(message)}`;
  return NextResponse.redirect(new URL(url, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || "unknown";

    if (!checkRateLimit(ip)) {
      return redirectWithError("rate_limited", "Too many requests. Please try again later.");
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return redirectWithError("missing_nonce", "Missing authentication token.");
    }

    const nonce = authHeader.split(" ")[1];

    let payload;
    try {
      const result = await jwtVerify(nonce, secret, {
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

    const existingNonce = await db
      .select()
      .from(usedNonces)
      .where(eq(usedNonces.jti, jti))
      .get();

    if (existingNonce) {
      return redirectWithError("replay_detected", "Token has already been used.");
    }

    const expiresAt = payload.exp as number | undefined;
    await db.insert(usedNonces).values({
      jti,
      expiresAt: expiresAt ? new Date(expiresAt * 1000).toISOString() : new Date(Date.now() + 60_000).toISOString(),
    }).run();

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

    const redirectPath = new URL(request.url).searchParams.get("redirect") || "/";

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
