import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementReads } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const institutionId = await resolveScopedInstitutionId(session.institutionId);

  const whereClause = institutionId && institutionId !== "global"
    ? and(eq(announcements.id, id), eq(announcements.targetInstitutionId, institutionId))
    : eq(announcements.id, id);

  const existing = await db.select({ id: announcements.id }).from(announcements).where(whereClause).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(announcementReads).where(eq(announcementReads.announcementId, id)).run();
  await db.delete(announcements).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "announcements:manage");
