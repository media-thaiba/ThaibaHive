import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceEvents, attendanceLogs, staffInstitutions, staffShifts, shifts } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { localDateISO } from "@/lib/attendance/local-date";
import { eq, and, desc, gte, lte, isNull, or } from "drizzle-orm";
import { hasPermission } from "@thaiba/auth";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const requestedStaffId = searchParams.get("staffId");
  const startDate = searchParams.get("from") || searchParams.get("startDate");
  const endDate = searchParams.get("to") || searchParams.get("endDate");

  // Validate dates if supplied
  if (startDate && !DATE_REGEX.test(startDate)) {
    return NextResponse.json({ error: "startDate must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (endDate && !DATE_REGEX.test(endDate)) {
    return NextResponse.json({ error: "endDate must be in YYYY-MM-DD format" }, { status: 400 });
  }
  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json({ error: "endDate must be on or after startDate" }, { status: 400 });
  }

  let targetStaffId = session.staffId;

  if (requestedStaffId && requestedStaffId !== session.staffId) {
    // Cross-staff query requires attendance:manage or administrative role
    const canManage =
      session.role === "super_admin" ||
      session.role === "admin" ||
      session.role === "principal" ||
      hasPermission(session.role, "attendance:manage");

    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Cannot view other staff attendance stats without management permission" },
        { status: 403 }
      );
    }

    // Verify tenant membership if caller is not global admin
    if (session.role !== "super_admin" && session.role !== "admin") {
      const callerInst = await resolveRequestInstitution(session, searchParams.get("institutionId"));
      if (callerInst !== "global") {
        const staffInInst = await db
          .select({ id: staffInstitutions.id })
          .from(staffInstitutions)
          .where(
            and(
              eq(staffInstitutions.staffId, requestedStaffId),
              eq(staffInstitutions.institutionId, callerInst)
            )
          )
          .get();

        if (!staffInInst) {
          return NextResponse.json({ error: "Staff member not found in this institution" }, { status: 404 });
        }
      }
    }

    targetStaffId = requestedStaffId;
  }

  try {
    const today = localDateISO();

    // Today's log
    const todayLog = await db
      .select()
      .from(attendanceLogs)
      .where(and(eq(attendanceLogs.staffId, targetStaffId), eq(attendanceLogs.date, today)))
      .get() ?? null;

    // Latest immutable attendance event of the day — drives on-shift / overtime
    // state on mobile (a trailing 'in' after a completed shift means overtime).
    const latestEventRow = await db
      .select({ kind: attendanceEvents.kind, effectiveAt: attendanceEvents.effectiveAt })
      .from(attendanceEvents)
      .where(and(eq(attendanceEvents.staffId, targetStaffId), eq(attendanceEvents.localDate, today)))
      .orderBy(desc(attendanceEvents.effectiveAt))
      .limit(1)
      .get();

    // Build conditions for aggregate stats
    const conditions = [eq(attendanceLogs.staffId, targetStaffId)];
    if (startDate) conditions.push(gte(attendanceLogs.date, startDate));
    if (endDate) conditions.push(lte(attendanceLogs.date, endDate));

    const logs = await db
      .select()
      .from(attendanceLogs)
      .where(and(...conditions))
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

    // Query active staff shift assignment (falls back to campus default General Shift 09:00 - 17:00)
    let shiftData = {
      id: "default_general",
      name: "General Shift",
      startTime: "09:00",
      endTime: "17:00",
      gracePeriodMinutes: 15,
    };

    try {
      const activeStaffShift = await db
        .select({
          id: shifts.id,
          name: shifts.name,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          gracePeriodMinutes: shifts.gracePeriodMinutes,
        })
        .from(staffShifts)
        .innerJoin(shifts, eq(staffShifts.shiftId, shifts.id))
        .where(
          and(
            eq(staffShifts.staffId, targetStaffId),
            lte(staffShifts.effectiveFrom, today),
            or(isNull(staffShifts.effectiveTo), gte(staffShifts.effectiveTo, today))
          )
        )
        .orderBy(desc(staffShifts.effectiveFrom))
        .limit(1)
        .get();

      if (activeStaffShift) {
        shiftData = activeStaffShift;
      }
    } catch (error) {
      console.warn("Failed to query active staff shift, falling back to General Shift:", error);
    }

    return NextResponse.json({
      today_status: todayLog?.status ?? null,
      last_check_in: todayLog?.checkIn ?? null,
      last_check_out: todayLog?.checkOut ?? null,
      present_days: presentDays,
      absent_days: absentDays,
      late_days: lateDays,
      half_days: halfDays,
      total_worked_hours: totalWorkedHours,
      latest_event: latestEventRow?.kind ?? null,
      is_on_shift: latestEventRow?.kind === "in",
      latest_event_at: latestEventRow?.effectiveAt ?? null,
      shift: {
        id: shiftData.id,
        name: shiftData.name,
        start_time: shiftData.startTime,
        end_time: shiftData.endTime,
        grace_period_minutes: shiftData.gracePeriodMinutes,
      },
    });
  } catch (error) {
    console.error("Attendance stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}, "attendance:read");
