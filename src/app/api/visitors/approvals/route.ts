import { NextResponse } from "next/server";
import { db } from "@/db";
import { visitorRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { requestId, status, rejectionReason } = body;

  if (!requestId || !["approved", "rejected", "cancelled"].includes(status)) {
    return NextResponse.json({ error: "Invalid approval parameters" }, { status: 400 });
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(visitorRequests.id, requestId), eq(visitorRequests.institutionId, scopedInstitutionId))
    : eq(visitorRequests.id, requestId);

  const existing = await db
    .select()
    .from(visitorRequests)
    .where(whereClause)
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Visitor pre-registration request not found" }, { status: 404 });
  }

  const updated = await db
    .update(visitorRequests)
    .set({
      status,
      rejectionReason: rejectionReason || null,
      updatedAt: new Date().toISOString(),
    })
    .where(whereClause)
    .returning()
    .get();

  return NextResponse.json({ request: updated });
}, "visitor:issue");
