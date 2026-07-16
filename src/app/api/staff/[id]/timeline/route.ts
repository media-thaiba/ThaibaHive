import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, leaveRequests, tasks, dailyReports, staffRecognition, expenseClaims } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

type TimelineItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  metadata: Record<string, unknown>;
};

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const [attendance, leaves, assignedTasks, reports, recognitions, expenses] = await Promise.all([
    db.select().from(attendanceLogs).where(eq(attendanceLogs.staffId, id)).orderBy(desc(attendanceLogs.date)).all(),
    db.select().from(leaveRequests).where(eq(leaveRequests.staffId, id)).orderBy(desc(leaveRequests.appliedAt)).all(),
    db.select().from(tasks).where(eq(tasks.assignedToId, id)).orderBy(desc(tasks.createdAt)).all(),
    db.select().from(dailyReports).where(eq(dailyReports.staffId, id)).orderBy(desc(dailyReports.date)).all(),
    db.select().from(staffRecognition).where(eq(staffRecognition.staffId, id)).orderBy(desc(staffRecognition.date)).all(),
    db.select().from(expenseClaims).where(eq(expenseClaims.staffId, id)).orderBy(desc(expenseClaims.createdAt)).all(),
  ]);

  const timeline: TimelineItem[] = [
    ...attendance.map((a) => ({
      id: a.id,
      type: "attendance",
      title: `Attendance \u2013 ${a.status}`,
      description: `Checked in at ${a.checkIn ?? "N/A"}${a.checkOut ? `, out at ${a.checkOut}` : ""}${a.notes ? `. ${a.notes}` : ""}`,
      date: a.date,
      metadata: { status: a.status, method: a.method },
    })),
    ...leaves.map((l) => ({
      id: l.id,
      type: "leave",
      title: `Leave Request \u2013 ${l.status}`,
      description: `${l.startDate} to ${l.endDate} (${l.daysCount} days)${l.reason ? `: ${l.reason}` : ""}`,
      date: l.appliedAt,
      metadata: { status: l.status, daysCount: l.daysCount },
    })),
    ...assignedTasks.map((t) => ({
      id: t.id,
      type: "task",
      title: t.title,
      description: `Status: ${t.status}${t.dueDate ? `, Due: ${t.dueDate}` : ""}`,
      date: t.createdAt,
      metadata: { status: t.status, priority: t.priority },
    })),
    ...reports.map((r) => ({
      id: r.id,
      type: "report",
      title: `Daily Report \u2013 ${r.date}`,
      description: r.summary ?? "No summary",
      date: r.date,
      metadata: { status: r.status },
    })),
    ...recognitions.map((r) => ({
      id: r.id,
      type: "recognition",
      title: r.recognitionType,
      description: r.message ?? "",
      date: r.date,
      metadata: { recognitionType: r.recognitionType },
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: "expense",
      title: `Expense Claim \u2013 ${e.category}`,
      description: `\u20B9${e.amount} \u2013 ${e.description} (${e.status})`,
      date: e.createdAt,
      metadata: { amount: e.amount, status: e.status },
    })),
  ];

  timeline.sort((a, b) => b.date.localeCompare(a.date));

  return NextResponse.json({ timeline });
}, "staff:read");
