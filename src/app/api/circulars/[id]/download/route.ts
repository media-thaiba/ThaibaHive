import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, circularDownloads } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
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

export const GET = requireAuth(async (request, session, context) => {
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
  const scopedInstId = await resolveScopedInstitutionId(session.institutionId);

  const circular = await db
    .select({
      id: circulars.id,
      fileUrl: circulars.fileUrl,
      title: circulars.title,
      fileType: circulars.fileType,
      isActive: circulars.isActive,
      targetInstitutionId: circulars.targetInstitutionId,
    })
    .from(circulars)
    .where(eq(circulars.id, id))
    .get();

  if (
    !circular ||
    !circular.isActive ||
    (circular.targetInstitutionId &&
      scopedInstId &&
      scopedInstId !== "global" &&
      circular.targetInstitutionId !== scopedInstId)
  ) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const reqUrl = new URL(request.url);
  const resolvedUrl = new URL(circular.fileUrl, request.url);
  if (resolvedUrl.origin !== reqUrl.origin) {
    return NextResponse.json({ error: "Invalid document URL origin" }, { status: 400 });
  }

  // Log the download
  await db.insert(circularDownloads).values({
    id: crypto.randomUUID(),
    circularId: circular.id,
    staffId: session.staffId,
    downloadedAt: new Date().toISOString(),
  }).run();

  // Redirect to the actual file URL
  return NextResponse.redirect(resolvedUrl);
}, "circulars:read");