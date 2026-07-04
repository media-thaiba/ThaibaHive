import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyReports, dailyReportTasks } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const report = await db.select().from(dailyReports).where(eq(dailyReports.id, id)).get();
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tasks = await db.select().from(dailyReportTasks).where(eq(dailyReportTasks.reportId, id)).all();
  return NextResponse.json({ report, tasks });
});

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();
  const { tasks, ...fields } = body;

  const updated = await db
    .update(dailyReports)
    .set({ ...fields, updatedAt: new Date().toISOString() })
    .where(eq(dailyReports.id, id))
    .returning()
    .get();

  if (tasks) {
    await db.delete(dailyReportTasks).where(eq(dailyReportTasks.reportId, id)).run();
    if (tasks.length) {
      await db.insert(dailyReportTasks).values(
        tasks.map((t: { description: string; hoursSpent?: number }) => ({
          id: crypto.randomUUID(),
          reportId: id,
          description: t.description,
          hoursSpent: t.hoursSpent,
        }))
      ).run();
    }
  }

  return NextResponse.json({ report: updated });
});
