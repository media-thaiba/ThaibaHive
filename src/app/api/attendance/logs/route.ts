import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLogs, staff, staffInstitutions, staffDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, inArray, and, gte, lte, or, like, sql } from "drizzle-orm";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const departmentId = searchParams.get("departmentId");
  const institutionId = searchParams.get("institutionId");

  // Parse and validate pagination & search parameters
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);
  const offset = (page - 1) * limit;
  const search = searchParams.get("search");

  if (session.role === "staff") {
    const conditions = [eq(attendanceLogs.staffId, session.staffId)];
    if (startDate) conditions.push(gte(attendanceLogs.date, startDate));
    if (endDate) conditions.push(lte(attendanceLogs.date, endDate));

    // Get total count for staff own logs
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceLogs)
      .where(and(...conditions))
      .get();
    const total = countResult?.count ?? 0;

    const ownLogs = await db
      .select({
        id: attendanceLogs.id,
        date: attendanceLogs.date,
        checkIn: attendanceLogs.checkIn,
        checkOut: attendanceLogs.checkOut,
        status: attendanceLogs.status,
        lateMinutes: attendanceLogs.lateMinutes,
        workedMinutes: attendanceLogs.workedMinutes,
        method: attendanceLogs.method,
      })
      .from(attendanceLogs)
      .where(and(...conditions))
      .orderBy(desc(attendanceLogs.date))
      .limit(limit)
      .offset(offset)
      .all();
    return NextResponse.json({ logs: ownLogs, total, page, limit });
  }

  let effectiveDepartmentIds: string[] = departmentId ? [departmentId] : [];
  let effectiveInstitutionIds: string[] = institutionId ? [institutionId] : [];

  if (session.role === "principal") {
    const instRows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    effectiveInstitutionIds = instRows.map((r) => r.institutionId).filter(Boolean);
  } else if (session.role === "hod") {
    const deptRows = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(eq(staffDepartments.staffId, session.staffId))
      .all();
    effectiveDepartmentIds = deptRows.map((r) => r.departmentId).filter(Boolean);
  }

  const matchedStaffConditions: any[] = [eq(staff.isActive, true)];

  if (effectiveInstitutionIds.length > 0) {
    const instStaffRows = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(inArray(staffInstitutions.institutionId, effectiveInstitutionIds))
      .all();
    const instStaffIds = instStaffRows.map((r) => r.staffId);
    if (instStaffIds.length === 0) {
      return NextResponse.json({ logs: [], total: 0, page, limit });
    }
    matchedStaffConditions.push(inArray(staff.id, instStaffIds));
  }

  if (effectiveDepartmentIds.length > 0) {
    const deptStaffRows = await db
      .select({ staffId: staffDepartments.staffId })
      .from(staffDepartments)
      .where(inArray(staffDepartments.departmentId, effectiveDepartmentIds))
      .all();
    const deptStaffIds = deptStaffRows.map((r) => r.staffId);
    if (deptStaffIds.length === 0) {
      return NextResponse.json({ logs: [], total: 0, page, limit });
    }
    matchedStaffConditions.push(inArray(staff.id, deptStaffIds));
  }

  // Filter staff by search pattern if provided (case-insensitive LIKE in SQLite by default)
  if (search) {
    const searchPattern = `%${search}%`;
    matchedStaffConditions.push(
      or(
        like(staff.firstName, searchPattern),
        like(staff.lastName, searchPattern),
        like(staff.employeeId, searchPattern)
      )
    );
  }

  const matchedStaff = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(...matchedStaffConditions))
    .all();
  const matchedStaffIds = matchedStaff.map((s) => s.id);

  if (matchedStaffIds.length === 0) {
    return NextResponse.json({ logs: [], total: 0, page, limit });
  }

  const conditions = [inArray(attendanceLogs.staffId, matchedStaffIds)];
  if (startDate) conditions.push(gte(attendanceLogs.date, startDate));
  if (endDate) conditions.push(lte(attendanceLogs.date, endDate));

  // Get total count of matching logs
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(attendanceLogs)
    .where(and(...conditions))
    .get();
  const total = countResult?.count ?? 0;

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
    .where(and(...conditions))
    .orderBy(desc(attendanceLogs.date))
    .limit(limit)
    .offset(offset)
    .all();

  return NextResponse.json({ logs: allLogs, total, page, limit });
}, "attendance:read");
