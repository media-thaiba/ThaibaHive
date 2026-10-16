import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementReads } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const scopedInstId = await resolveScopedInstitutionId(session.institutionId);

  const announcement = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .get();

  if (
    !announcement ||
    (announcement.targetInstitutionId &&
      scopedInstId &&
      scopedInstId !== "global" &&
      announcement.targetInstitutionId !== scopedInstId)
  ) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const existing = await db
    .select()
    .from(announcementReads)
    .where(and(eq(announcementReads.announcementId, id), eq(announcementReads.staffId, session.staffId)))
    .get();

  if (!existing) {
    await db.insert(announcementReads).values({
      id: crypto.randomUUID(),
      announcementId: id,
      staffId: session.staffId,
    }).run();
  }

  return NextResponse.json({ success: true });
}, "announcements:read");
