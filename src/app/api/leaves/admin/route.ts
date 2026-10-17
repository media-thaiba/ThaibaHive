import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, staff, leaveTypes } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { eq, desc, and, gte, lte, type SQL } from "drizzle-orm";

const APPROVER_ROLES = ["super_admin", "admin", "principal", "hod"];

export const GET = requireAuth(async (request: Request, session) => {
  // Approvers only — this endpoint exposes other people's leave data.
  if (!APPROVER_ROLES.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const scopedInstitutionId = await resolveRequestInstitution(
    session,
    searchParams.get("institutionId")
  );

  const conditions: (SQL | undefined)[] = [];
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    conditions.push(eq(leaveRequests.institutionId, scopedInstitutionId));
  }
  if (status) conditions.push(eq(leaveRequests.status, status));
  if (startDate) conditions.push(gte(leaveRequests.startDate, startDate));
  if (endDate) conditions.push(lte(leaveRequests.endDate, endDate));

  const activeConditions = conditions.filter((c): c is SQL => !!c);

  let leaves = await db
    .select({
      id: leaveRequests.id,
      staffId: leaveRequests.staffId,
      leaveTypeId: leaveRequests.leaveTypeId,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      daysCount: leaveRequests.daysCount,
      reason: leaveRequests.reason,
      status: leaveRequests.status,
      appliedAt: leaveRequests.appliedAt,
      reviewedAt: leaveRequests.reviewedAt,
      reviewNotes: leaveRequests.reviewNotes,
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      employeeId: staff.employeeId,
      leaveTypeName: leaveTypes.name,
      leaveTypeCode: leaveTypes.code,
    })
    .from(leaveRequests)
    .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
    .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
    .where(activeConditions.length > 0 ? and(...activeConditions) : undefined)
    .orderBy(desc(leaveRequests.createdAt))
    .limit(100)
    .all();

  // HODs may only review their own department members (max 100 rows scanned).
  if (session.role === "hod") {
    const visible: typeof leaves = [];
    for (const leave of leaves) {
      if (await canAccessStaff(session.staffId, session.role, leave.staffId)) {
        visible.push(leave);
      }
    }
    leaves = visible;
  }

  return NextResponse.json({ leaves });
}, "leaves:read");
