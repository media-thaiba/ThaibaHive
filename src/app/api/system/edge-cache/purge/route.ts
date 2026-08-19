import { NextResponse } from "next/server";
import { verifySession } from "@thaiba/auth";
import { EdgeCachePurger } from "@/lib/edge/cache-purger";
import { EdgeCacheTelemetry } from "@/lib/observability/edge-telemetry";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-edge-signature");
  
  let isAuthorized = false;

  // 1. HMAC signature verification
  if (signatureHeader && EdgeCachePurger.verifyHmacSignature(rawBody, signatureHeader)) {
    isAuthorized = true;
  }

  // 2. Session verification (Super Admin)
  if (!isAuthorized) {
    const session = await verifySession();
    if (session && (session.role === "super_admin" || session.role === "admin")) {
      isAuthorized = true;
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized - HMAC signature or Admin session required" }, { status: 401 });
  }

  try {
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { tags, urls, purgeAll } = body;

    const result = await EdgeCachePurger.getInstance().purge({
      tags: Array.isArray(tags) ? tags : undefined,
      urls: Array.isArray(urls) ? urls : undefined,
      purgeAll: Boolean(purgeAll),
    });

    // Record telemetry
    try {
      EdgeCacheTelemetry.getInstance().recordPurge(result.purgedTags.length + result.purgedUrls.length + (result.isGlobalPurge ? 1 : 0));
    } catch {}

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to parse or execute purge request", details: err?.message }, { status: 400 });
  }
}
