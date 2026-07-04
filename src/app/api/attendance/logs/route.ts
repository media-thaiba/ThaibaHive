import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const allLogs = await db
    .select({
      id: attendanceLogs.id,
      date: attendanceLogs.date,
      checkIn: attendanceLogs.checkIn,
      checkOut: attendanceLogs.checkOut,
      status: attendanceLogs.status,
      lateMinutes: attendanceLogs.lateMinutes,
      workedMinutes: attendanceLogs.workedMinutes,
      method: attendanceLogs.method,
      staffId: attendanceLogs.staffId,
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      employeeId: staff.employeeId,
    })
    .from(attendanceLogs)
    .leftJoin(staff, eq(attendanceLogs.staffId, staff.id))
    .orderBy(desc(attendanceLogs.date))
    .limit(50)
    .all();

  return NextResponse.json({ logs: allLogs });
}, "attendance:read");
