import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, dailyReportTasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const reports = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.staffId, session.staffId))
    .orderBy(desc(dailyReports.date))
    .limit(30)
    .all();
  return NextResponse.json({ reports });
});

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { date, summary, tasks } = body;

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const report = await db
    .insert(dailyReports)
    .values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      date,
      summary,
      status: "draft",
    })
    .returning()
    .get();

  if (tasks?.length) {
    await db.insert(dailyReportTasks).values(
      tasks.map((t: { description: string; hoursSpent?: number; status?: string }) => ({
        id: crypto.randomUUID(),
        reportId: report.id,
        description: t.description,
        hoursSpent: t.hoursSpent,
        status: t.status || "completed",
      }))
    ).run();
  }

  return NextResponse.json({ report }, { status: 201 });
});
