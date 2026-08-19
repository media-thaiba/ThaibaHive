import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const log = await db
      .select()
      .from(attendanceLogs)
      .where(
        and(
          eq(attendanceLogs.staffId, session.staffId),
          eq(attendanceLogs.date, today)
        )
      )
      .get() ?? null;

    return NextResponse.json({ log });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, "attendance:read");
