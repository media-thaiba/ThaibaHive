import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  try {
    const { staffId } = session;
    const today = new Date().toISOString().split("T")[0];

    // Today's log
    const todayLog = await db
      .select()
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.staffId, staffId), eq(attendanceLogs.date, today)))
      .get() ?? null;

    // Aggregate stats
    const logs = await db
      .select()
      .from(attendanceLogs)
      .where(eq(attendanceLogs.staffId, staffId))
      .all();

    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let halfDays = 0;
    let totalWorkedMinutes = 0;

    for (const log of logs) {
      if (log.status === "present") {
        presentDays++;
      } else if (log.status === "absent") {
        absentDays++;
      } else if (log.status === "late") {
        presentDays++;
        lateDays++;
      } else if (log.status === "half_day") {
        halfDays++;
      }
      totalWorkedMinutes += log.workedMinutes ?? 0;
    }

    const totalWorkedHours = Number((totalWorkedMinutes / 60).toFixed(1));

    return NextResponse.json({
      today_status: todayLog?.status ?? null,
      last_check_in: todayLog?.checkIn ?? null,
      last_check_out: todayLog?.checkOut ?? null,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      half_days: halfDays,
      total_worked_hours: totalWorkedHours,
    });
  } catch (error) {
    console.error("Attendance stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "attendance:read");
