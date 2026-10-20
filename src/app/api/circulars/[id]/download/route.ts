import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, circularDownloads } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, extractIp, rateLimitResponse } from "@/lib/api/rate-limit";
import { canAccessCircular } from "@/lib/circulars/auth";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (request, session, context) => {
  const ip = extractIp(request);
  const rl = checkRateLimit(ip, "download");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const circular = await db
    .select({
      id: circulars.id,
      fileUrl: circulars.fileUrl,
      title: circulars.title,
      fileType: circulars.fileType,
      isActive: circulars.isActive,
      targetRole: circulars.targetRole,
      targetDepartmentId: circulars.targetDepartmentId,
      targetInstitutionId: circulars.targetInstitutionId,
      uploadedById: circulars.uploadedById,
    })
    .from(circulars)
    .where(eq(circulars.id, id))
    .get();

  if (!circular) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // ── Target Audience & Scope Authorization Gate ─────────────────────────
  const authorized = await canAccessCircular(session, circular);
  if (!authorized) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const reqUrl = new URL(request.url);
  const resolvedUrl = new URL(circular.fileUrl, request.url);
  if (resolvedUrl.origin !== reqUrl.origin) {
    return NextResponse.json({ error: "Invalid document URL origin" }, { status: 400 });
  }

  // Log the download
  await db
    .insert(circularDownloads)
    .values({
      id: crypto.randomUUID(),
      circularId: circular.id,
      staffId: session.staffId,
      downloadedAt: new Date().toISOString(),
    })
    .run();

  // Redirect to the actual file URL
  return NextResponse.redirect(resolvedUrl);
}, "circulars:read");