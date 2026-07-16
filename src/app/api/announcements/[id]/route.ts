import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementReads } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const existing = await db.select({ id: announcements.id }).from(announcements).where(eq(announcements.id, id)).get();
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.delete(announcementReads).where(eq(announcementReads.announcementId, id)).run();
  await db.delete(announcements).where(eq(announcements.id, id)).run();
  return NextResponse.json({ success: true });
}, "announcements:manage");
