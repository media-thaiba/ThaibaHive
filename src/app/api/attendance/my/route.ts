import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const logs = await db
    .select()
    .from(attendanceLogs)
    .where(eq(attendanceLogs.staffId, session.staffId))
    .orderBy(desc(attendanceLogs.date))
    .limit(30)
    .all();

  const today = new Date().toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.date === today);

  return NextResponse.json({ logs, todayLog });
});
