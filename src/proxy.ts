import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { startApmTracking, completeApmTracking } from "./lib/middleware/apm-telemetry";
import { applyTenantRegionHeaders } from "./middleware/tenant-region";
import { applyEdgeCaching } from "./lib/edge/cache-control";
import { applySecurityHeaders } from "./lib/security/security-headers";

import { getJwtSecretBytes } from "@thaiba/auth/config";

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

const exactPublicPaths = new Set([
  "/auth/login",
  "/auth/signup",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/google",
  "/api/auth/mobile-handoff",
  "/api/finance/fees/webhooks",
  "/api/webhooks/edge-security",
  "/api/engage/voice",
  "/api/system/health",
  "/api/health",
  "/api/system/csp-report",
  "/api/system/update",
  "/downloads",
  "/about",
  "/mission",
  "/enquiry",
  "/affiliation",
  "/favicon.ico",
]);

const prefixPublicPaths = [
  "/_next",
  "/Logo",
  "/portal",
  "/api/public/",
  "/api/media/share-links/",
  "/share/",
  "/verify/",
];

const BLOCKED_PATHS = [
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
  "/.env",
  "/.git",
  "/phpmyadmin",
];

export async function proxy(request: NextRequest) {
  const apmContext = startApmTracking(request);
  const response = await handleProxy(request);
  return completeApmTracking(apmContext, response);
}

async function handleProxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Block known scanner/bot paths
  for (const blocked of BLOCKED_PATHS) {
    if (pathname.startsWith(blocked)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  try {
    const isProtectedPortal =
      pathname.startsWith("/portal/alumni") ||
      pathname.startsWith("/portal/facilities") ||
      pathname.startsWith("/portal/fees") ||
      pathname.startsWith("/portal/documents");
    const isPublic =
      !isProtectedPortal &&
      (exactPublicPaths.has(pathname) ||
        prefixPublicPaths.some((p) => pathname.startsWith(p)));
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
      if (pathname === "/" || pathname === "") {
        return addSecurityHeaders(
          request,
          NextResponse.redirect(new URL("/portal/tgcis", request.url)),
          pathname
        );
      }
      return addSecurityHeaders(
        request,
        NextResponse.redirect(new URL("/auth/login", request.url)),
        pathname
      );
    }

    // SEC-01: Cryptographically verify session token signature at edge
    let verifiedRole: string | null = null;
    try {
      const { payload } = await jwtVerify(token, getJwtSecretBytes());
      verifiedRole = typeof payload.role === "string" ? payload.role : null;
    } catch {
      if (pathname.startsWith("/api/")) {
        return addSecurityHeaders(
          request,
          NextResponse.json({ error: "Invalid or expired session token" }, { status: 401 }),
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
      const role = verifiedRole;
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
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  response.headers.set("x-request-id", requestId);
  applySecurityHeaders(response);

  // Multi-Region Edge Caching integration (Sprint-034 / EDG-001)
  if (pathname.startsWith("/_next/static/") || pathname.startsWith("/Logo") || pathname.endsWith(".png") || pathname.endsWith(".jpg")) {
    applyEdgeCaching(response, "PUBLIC_IMMUTABLE", { tags: ["static-assets"] });
  } else if (pathname === "/api/public/circulars" || pathname === "/api/public/version" || pathname === "/.well-known/assetlinks.json" || pathname === "/.well-known/apple-app-site-association") {
    applyEdgeCaching(response, "PUBLIC_SEMI_STATIC", { tags: ["public-api"] });
  } else if (pathname.startsWith("/api/media/share-links/") || pathname.startsWith("/api/upload/files/avatars/")) {
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

