import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { notificationMarkReadSchema } from "@/lib/validation/schemas";
import { eq, and, desc } from "drizzle-orm";
import { sendToConnection } from "@/lib/api/realtime";

export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  await resolveRequestInstitution(session, searchParams.get("institutionId"));
  const all = await db
    .select()
    .from(notifications)
    .where(eq(notifications.staffId, session.staffId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
    .all();

  const unreadCount = all.filter((n) => !n.isRead).length;
  return NextResponse.json({ notifications: all, unreadCount });
}, "notifications:read");

export const PATCH = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = notificationMarkReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { id } = parsed.data;

  if (id) {
    const existing = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.staffId, session.staffId)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.staffId, session.staffId)))
      .run();
  } else {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.staffId, session.staffId))
      .run();
  }

  // Notify all tabs for this user to refresh
  sendToConnection(`notification-${session.staffId}`, "notification", {
    type: "refresh",
  });

  return NextResponse.json({ success: true });
}, "notifications:update");
