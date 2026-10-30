import crypto from "crypto";
import { cookies } from "next/headers";

export const CSRF_SAT_COOKIE = "csrf_sat";
export const CSRF_TOKEN_HEADER = "x-csrf-token";

export type AuthTransport = "cookie" | "bearer" | "dpop" | "machine" | "none";

/**
 * Detects the transport mechanism used for authenticating the request.
 * CSRF is purely a browser-ambient credential issue (cookies).
 * Explicit Authorization headers (Bearer, DPoP) are immune to browser cross-origin forging.
 */
export function detectAuthTransport(request: Request): AuthTransport {
  // 1. DPoP proof takes precedence (cryptographically bound per-request)
  const dpopProof = request.headers.get("dpop-proof") || request.headers.get("dpop");
  if (dpopProof) {
    return "dpop";
  }

  // 2. Explicit Bearer token header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ") && authHeader.length > 7) {
    return "bearer";
  }

  // 3. Machine internal secrets
  if (
    request.headers.get("x-dr-secret") ||
    request.headers.get("x-cache-secret") ||
    request.headers.get("x-cron-secret")
  ) {
    return "machine";
  }

  // 4. Ambient browser cookies
  const cookieHeader = request.headers.get("cookie") || "";
  if (cookieHeader.includes("thaibahive_session=") || cookieHeader.includes("session=")) {
    return "cookie";
  }

  return "none";
}

/**
 * Detects Next.js 15 Server Actions, which carry their own RSC payload token and origin verification.
 */
export function isServerActionRequest(request: Request): boolean {
  return (
    Boolean(request.headers.get("next-action")) ||
    Boolean(request.headers.get("rsc"))
  );
}

/**
 * Determines whether a request is susceptible to cross-site request forgery.
 */
export function isCsrfVulnerable(request: Request): boolean {
  if (isServerActionRequest(request)) return false;
  return detectAuthTransport(request) === "cookie";
}

/**
 * Mints a cryptographically secure satellite CSRF token and sets the non-HttpOnly cookie.
 */
export async function mintCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  try {
    const cookieStore = await cookies();
    cookieStore.set(CSRF_SAT_COOKIE, token, {
      httpOnly: false, // Intentionally readable by client JS to attach as header
      secure: process.env.COOKIE_SECURE !== "false",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });
  } catch {
    // Non-request context
  }
  return token;
}

/**
 * Validates the CSRF token on an incoming request using constant-time comparison.
 */
export async function validateCsrf(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  // Safe HTTP methods do not mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  // Non-cookie authentication is immune to CSRF
  if (!isCsrfVulnerable(request)) {
    return true;
  }

  const headerToken = request.headers.get(CSRF_TOKEN_HEADER);
  if (!headerToken) {
    return false;
  }

  let cookieToken: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieToken = cookieStore.get(CSRF_SAT_COOKIE)?.value;
  } catch {
    // Fallback: parse Cookie header directly
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CSRF_SAT_COOKIE}=([^;]+)`));
    cookieToken = match ? decodeURIComponent(match[1]) : undefined;
  }

  if (!cookieToken) {
    return false;
  }

  const bufA = Buffer.from(headerToken, "utf-8");
  const bufB = Buffer.from(cookieToken, "utf-8");
  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}
