import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, staff } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { eq, gt, and, gte, lte, desc, sql } from "drizzle-orm";

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
  const { searchParams } = new URL(request.url);
  const rawInst = searchParams.get("institutionId");
  const institutionId = await resolveRequestInstitution(session, rawInst);

  const startDate = searchParams.get("from") || searchParams.get("startDate");
  const endDate = searchParams.get("to") || searchParams.get("endDate");
  const staffId = searchParams.get("staffId");

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

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendanceLogs)
    .where(and(...conditions))
    .get();
  const total = countResult?.count ?? 0;

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

  return NextResponse.json({ violations, total, page, limit });
}, "attendance:manage");
