import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, circularDownloads } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
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

export const GET = requireAuth(async (request, _session, context) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many download requests. Please try again later." },
      { status: 429 }
    );
  }

  const { id } = await context!.params;

  const circular = await db
    .select({
      id: circulars.id,
      fileUrl: circulars.fileUrl,
      title: circulars.title,
      fileType: circulars.fileType,
    })
    .from(circulars)
    .where(eq(circulars.id, id))
    .get();

  if (!circular) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Log the download
  await db.insert(circularDownloads).values({
    id: crypto.randomUUID(),
    circularId: circular.id,
    staffId: _session.staffId,
    downloadedAt: new Date().toISOString(),
  }).run();

  // Redirect to the actual file URL
  return NextResponse.redirect(new URL(circular.fileUrl, request.url));
}, "circulars:read");