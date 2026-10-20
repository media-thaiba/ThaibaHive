import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements, announcementReads } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { canAccessAnnouncement, withReadReceiptLock } from "@/lib/announcements/utils";

export const POST = requireAuth(async (_request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  const announcement = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .get();

  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const allowed = await canAccessAnnouncement(session, announcement);
  if (!allowed) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  await withReadReceiptLock(id, session.staffId, async () => {
    const existing = await db
      .select({ id: announcementReads.id })
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.announcementId, id),
          eq(announcementReads.staffId, session.staffId)
        )
      )
      .get();

    if (!existing) {
      await db.insert(announcementReads).values({
        id: crypto.randomUUID(),
        announcementId: id,
        staffId: session.staffId,
      }).run();
    }
  });

  return NextResponse.json({ success: true });
}, "announcements:read");
