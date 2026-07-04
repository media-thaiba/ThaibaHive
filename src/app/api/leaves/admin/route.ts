import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveRequests, staff } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, desc } from "drizzle-orm";

export const GET = requireAuth(async () => {
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
      staffName: staff.firstName,
      staffLastName: staff.lastName,
      employeeId: staff.employeeId,
    })
    .from(leaveRequests)
    .leftJoin(staff, eq(leaveRequests.staffId, staff.id))
    .orderBy(desc(leaveRequests.createdAt))
    .limit(50)
    .all();

  return NextResponse.json({ leaves });
}, "leaves:read");
