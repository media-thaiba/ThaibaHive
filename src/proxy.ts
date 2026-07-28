import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB

const publicPaths = [
  "/auth/login",
  "/auth/signup",
  "/_next",
  "/Logo",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/google",
  "/api/auth/mobile-handoff",
  "/api/system/health",
  "/favicon.ico",
];

const BLOCKED_PATHS = [
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/.env",
  "/.git",
  "/phpmyadmin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block known scanner/bot paths
  for (const blocked of BLOCKED_PATHS) {
    if (pathname.startsWith(blocked)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  try {
    const isPublic = publicPaths.some((p) => pathname.startsWith(p));
    if (isPublic) return addSecurityHeaders(request, NextResponse.next(), pathname);

    let token = request.cookies.get("thaibahive_session")?.value;
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(
          request,
          NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
          pathname
        );
      }
      return addSecurityHeaders(
        request,
        NextResponse.redirect(new URL("/auth/login", request.url)),
        pathname
      );
    }

    // Enforce body size limit on write API routes
    const method = request.method;
    const isWrite = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
    if (pathname.startsWith("/api/") && isWrite) {
      const contentLength = request.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
        return addSecurityHeaders(
          request,
          NextResponse.json({ error: "Request body too large. Maximum size is 5MB." }, { status: 413 }),
          pathname
        );
      }

      // Block non-JSON/non-multipart content types on write API routes
      const contentType = request.headers.get("content-type");
      if (contentType && !contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
        return addSecurityHeaders(
          request,
          NextResponse.json({ error: "Invalid content type." }, { status: 415 }),
          pathname
        );
      }
    }

    return addSecurityHeaders(request, NextResponse.next(), pathname);
  } catch (error) {
    console.error("Proxy error:", error);
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        request,
        NextResponse.json({ error: "Internal server error" }, { status: 500 }),
        pathname
      );
    }
    return addSecurityHeaders(
      request,
      NextResponse.redirect(new URL("/auth/login", request.url)),
      pathname
    );
  }
}

const ALLOWED_ORIGIN_REGEX = /^https:\/\/(?:[a-z0-9-]+\.)*thaibahive\.com$/i;

function applyCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  if (!origin) return response;

  const isDev = process.env.NODE_ENV !== "production" && 
    (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));

  if (ALLOWED_ORIGIN_REGEX.test(origin) || isDev) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

function addSecurityHeaders(request: NextRequest, response: NextResponse, pathname: string): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self)");

  if (pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  if (pathname.startsWith("/_next/static/")) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return applyCorsHeaders(request, response);
}


export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo|manifest.json|sw.js|offline.html|.*\\.svg$).*)"],
};
