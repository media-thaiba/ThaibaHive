import { NextResponse } from "next/server";
import { db } from "@/db";
import { circulars, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const existing = await db.select().from(circulars).where(eq(circulars.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "super_admin" && session.role !== "admin") {
    if (!existing.targetInstitutionId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete global circulars" }, { status: 403 });
    }
    const callerInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const callerInstIds = callerInsts.map((i) => i.institutionId).filter(Boolean);
    if (!callerInstIds.includes(existing.targetInstitutionId) && existing.uploadedById !== session.staffId) {
      return NextResponse.json({ error: "Forbidden: Cannot delete circular from another institution" }, { status: 403 });
    }
  }

  await db.delete(circulars).where(eq(circulars.id, id)).run();
  return NextResponse.json({ success: true });
}, "announcements:manage");

