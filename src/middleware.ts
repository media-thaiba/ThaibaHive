import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startApmTracking, completeApmTracking } from "./lib/middleware/apm-telemetry";
import { applyTenantRegionHeaders } from "./middleware/tenant-region";

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

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
  "/api/system/update",
  "/api/media/share-links/",
  "/share/",
  "/downloads",
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
  const apmContext = startApmTracking(request);
  const response = handleProxy(request);
  return completeApmTracking(apmContext, response);
}

function handleProxy(request: NextRequest): NextResponse {
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

    // Workspace root redirect: /workspace → /workspace/{role}
    if (pathname === '/workspace' || pathname === '/workspace/') {
      const role = extractRoleFromToken(token);
      const workspaceMap: Record<string, string> = {
        principal: '/workspace/principal',
        staff: '/workspace/teacher',
        hod: '/workspace/teacher',
        accounts: '/workspace/cashier',
        purchase: '/workspace/cashier',
      };
      const dest = role ? workspaceMap[role] : null;
      if (dest) {
        return addSecurityHeaders(
          request,
          NextResponse.redirect(new URL(dest, request.url)),
          pathname
        );
      }
    }

    // Enforce body size limit on write API routes
    const method = request.method;
    const isWrite = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
    if (pathname.startsWith("/api/") && isWrite) {
      const isUploadRoute = pathname.startsWith("/api/upload") || pathname.startsWith("/api/media/upload");
      const maxLimit = isUploadRoute ? MAX_UPLOAD_BYTES : MAX_BODY_BYTES;
      const contentLength = request.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > maxLimit) {
        return addSecurityHeaders(
          request,
          NextResponse.json({ error: `Request body too large. Maximum size is ${isUploadRoute ? "50MB" : "5MB"}.` }, { status: 413 }),
          pathname
        );
      }

      // Block non-JSON/non-multipart content types on non-upload write API routes
      const contentType = request.headers.get("content-type");
      if (contentType && !isUploadRoute && !contentType.includes("application/json") && !contentType.includes("multipart/form-data")) {
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

function extractRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    const parsed = JSON.parse(decoded);
    return typeof parsed.role === 'string' ? parsed.role : null;
  } catch {
    return null;
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
  const isProd = process.env.NODE_ENV === "production";
  const scriptSrc = isProd
    ? "script-src 'self' 'unsafe-inline';"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval';";

  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  response.headers.set("x-request-id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self)");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; ${scriptSrc} style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: ws: wss:; frame-ancestors 'none'; base-uri 'self'; object-src 'none';`
  );

  // Multi-Region Edge Caching integration (Sprint-034 / EDG-001)
  const { applyEdgeCaching } = require("./lib/edge/cache-control");

  if (pathname.startsWith("/_next/static/") || pathname.startsWith("/Logo") || pathname.endsWith(".png") || pathname.endsWith(".jpg")) {
    applyEdgeCaching(response, "PUBLIC_IMMUTABLE", { tags: ["static-assets"] });
  } else if (pathname === "/api/departments" || pathname === "/api/institutions" || pathname === "/api/canteen/menu") {
    applyEdgeCaching(response, "PUBLIC_SEMI_STATIC", { tags: ["catalog-data", "public-api"] });
  } else if (pathname.startsWith("/api/media/share-links/") || pathname.startsWith("/api/media/edge/")) {
    applyEdgeCaching(response, "PUBLIC_MEDIA_THUMBNAIL", { tags: ["media-edge"] });
  } else if (pathname.startsWith("/api/")) {
    applyEdgeCaching(response, "PRIVATE_DYNAMIC");
    response.headers.set("Pragma", "no-cache");
  }

  // Multi-Region Tenant Geo-Affinity Header Injection (Sprint-035 / TEN-001)
  applyTenantRegionHeaders(response, request);

  return applyCorsHeaders(request, response);
}


export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|Logo|manifest.json|sw.js|offline.html|.*\\.svg$).*)"],
};

export { proxy as middleware };
export default proxy;

