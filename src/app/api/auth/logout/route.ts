import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { db } from "@/db";
import { presence } from "@thaiba/db/schema";
import { eq } from "drizzle-orm";
import { broadcastPresence } from "@/lib/api/realtime";

export const POST = requireAuth(async (request, session) => {
  // 1. Log explicit logout activity
  await logActivity({
    request,
    staffId: session.staffId,
    action: "LOGOUT",
    resourceType: "auth",
  });

  // 2. Set offline status immediately on logout and broadcast
  const now = new Date().toISOString();
  try {
    await db
      .update(presence)
      .set({ online: false, lastSeenAt: now, updatedAt: now })
      .where(eq(presence.staffId, session.staffId));
    broadcastPresence(session.staffId, false, now);
  } catch (err) {
    console.error("Failed to update presence on logout:", err);
  }

  // 3. Invalidate JWT tokens across devices by incrementing tokenVersion
  try {
    const { staff } = await import("@thaiba/db/schema");
    const { sql } = await import("drizzle-orm");
    await db
      .update(staff)
      .set({ tokenVersion: sql`${staff.tokenVersion} + 1` })
      .where(eq(staff.id, session.staffId));
  } catch (err) {
    console.error("Failed to increment tokenVersion on logout:", err);
  }

  // 4. Clear session cookie
  await destroySession();
  return NextResponse.json({ success: true });
}, "auth:logout");

