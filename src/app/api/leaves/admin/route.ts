import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, staff, leaveTypes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions: any[] = [];
  if (status) conditions.push(eq(leaveRequests.status, status));
  if (startDate) conditions.push(gte(leaveRequests.startDate, startDate));
  if (endDate) conditions.push(lte(leaveRequests.endDate, endDate));

  const leaves = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leaveRequests.createdAt))
    .limit(100)
    .all();

  return NextResponse.json({ leaves });
}, "leaves:read");
