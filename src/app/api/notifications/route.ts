import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, desc } from "drizzle-orm";
import { sendToConnection } from "@/lib/api/realtime";

export const GET = requireAuth(async (_request, session) => {
  const all = await db
    .select()
    .from(notifications)
    .where(eq(notifications.staffId, session.staffId))
    .orderBy(desc(notifications.createdAt))
    .limit(50)
    .all();

  const unreadCount = all.filter((n) => !n.isRead).length;
  return Response.json({ notifications: all, unreadCount });
}, "notifications:update");

export const PATCH = requireAuth(async (request, session) => {
  const body = await request.json();
  const { id } = body;

  if (id) {
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

  return Response.json({ success: true });
}, "notifications:update");
