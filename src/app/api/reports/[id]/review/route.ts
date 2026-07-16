import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { status } = body;

  if (!status || !["draft", "submitted", "reviewed", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.id, id))
    .get();

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updated = await db
    .update(dailyReports)
    .set({
      status,
      reviewedById: session.staffId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(dailyReports.id, id))
    .returning()
    .get();

  return NextResponse.json({ report: updated });
}, "reports:review");
