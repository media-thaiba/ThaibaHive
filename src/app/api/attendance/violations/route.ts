import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, gt, and, gte, lte, desc, sql, or, like } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/attendance/violations — administrative read model for presence
 * violations. Lists attendance days where server-side enforcement
 * incremented `geofenceViolations` (out-of-geofence, mock location, or
 * unverifiable claims while `presence_tracking` was enforcing).
 *
 * Permission: `attendance:manage` — violation review is an admin/principal
 * operation; staff can see their own attendance via /api/attendance/logs.
 * Tenant scoping: resolveRequestInstitution (fail-closed membership
 * verification) then filters on attendance_logs.institution_id; global
 * scope is the sanctioned admin bypass.
 */
export const GET = requireAuth(async (request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const rawInst = searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, rawInst);

  const startDate = searchParams.get("from") || searchParams.get("startDate");
  const endDate = searchParams.get("to") || searchParams.get("endDate");
  const staffId = searchParams.get("staffId");
  const search = searchParams.get("search");

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

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));
  const offset = (page - 1) * limit;

  const conditions = [gt(attendanceLogs.geofenceViolations, 0)];
  if (institutionId && institutionId !== "global") {
    conditions.push(eq(attendanceLogs.institutionId, institutionId));
  }
  if (staffId) conditions.push(eq(attendanceLogs.staffId, staffId));
  if (startDate) conditions.push(gte(attendanceLogs.date, startDate));
  if (endDate) conditions.push(lte(attendanceLogs.date, endDate));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(staff.firstName, pattern),
        like(staff.lastName, pattern),
        like(staff.employeeId, pattern)
      )!
    );
  }

  // Aggregate stats share the exact same scoping/search conditions so the
  // header counters always match the filtered row set.
  const statsResult = await db
    .select({
      violationDays: sql<number>`count(*)`,
      staffAffected: sql<number>`count(distinct ${attendanceLogs.staffId})`,
      totalOccurrences: sql<number>`coalesce(sum(${attendanceLogs.geofenceViolations}), 0)`,
    })
    .from(attendanceLogs)
    .leftJoin(staff, eq(attendanceLogs.staffId, staff.id))
    .where(and(...conditions))
    .get();
  const stats = {
    violationDays: statsResult?.violationDays ?? 0,
    staffAffected: statsResult?.staffAffected ?? 0,
    totalOccurrences: statsResult?.totalOccurrences ?? 0,
  };

  const violations = await db
    .select({
      id: attendanceLogs.id,
      date: attendanceLogs.date,
      checkIn: attendanceLogs.checkIn,
      checkOut: attendanceLogs.checkOut,
      status: attendanceLogs.status,
      presenceStatus: attendanceLogs.presenceStatus,
      lastVerifiedAt: attendanceLogs.lastVerifiedAt,
      geofenceViolations: attendanceLogs.geofenceViolations,
      institutionId: attendanceLogs.institutionId,
      staffId: attendanceLogs.staffId,
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      employeeId: staff.employeeId,
    })
    .from(attendanceLogs)
    .leftJoin(staff, eq(attendanceLogs.staffId, staff.id))
    .where(and(...conditions))
    .orderBy(desc(attendanceLogs.date), desc(attendanceLogs.geofenceViolations))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({
    violations,
    total: stats.violationDays,
    stats,
    page,
    limit,
  });
}, "attendance:manage");
