import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, sql } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  try {
    const { staffId } = session;
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.staffId, staffId), eq(notifications.isRead, false)))
      .get();
    
    return NextResponse.json({ count: result?.count ?? 0 });
  } catch (error) {
    console.error("Unread notifications count error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "notifications:update");
