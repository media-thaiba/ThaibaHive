import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { activityLogs, staffDepartments } from "@thaiba/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { pruneOldLogs } from "@/lib/api/activity-log";

export const GET = requireAuth(async (request, session) => {
  await pruneOldLogs();

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;
  const actionFilter = url.searchParams.get("action");
  const staffFilter = url.searchParams.get("staffId");

  const isAdmin =
    session.role === "super_admin" || session.role === "admin";

  // Non-admins can only see own logs or logs of staff sharing a department
  let allowedStaffIds: string[] | null = null;
  if (!isAdmin) {
    // Get own departments
    const myDepts = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(eq(staffDepartments.staffId, session.staffId))
      .all();

    const deptIds = myDepts.map((d) => d.departmentId);

    if (deptIds.length > 0) {
      // Find staff who share at least one department
      const sharedStaff = await db
        .select({ staffId: staffDepartments.staffId })
        .from(staffDepartments)
        .where(sql`${staffDepartments.departmentId} IN ${deptIds}`)
        .all();

      allowedStaffIds = [
        session.staffId,
        ...new Set(sharedStaff.map((s) => s.staffId)),
      ];
    } else {
      allowedStaffIds = [session.staffId];
    }
  }

  const conditions = [];

  if (allowedStaffIds) {
    if (staffFilter) {
      // If filtering by specific staff, check they're allowed
      if (!allowedStaffIds.includes(staffFilter)) {
        return Response.json({ logs: [], total: 0, page, limit });
      }
      conditions.push(eq(activityLogs.staffId, staffFilter));
    } else {
      conditions.push(sql`${activityLogs.staffId} IN ${allowedStaffIds}`);
    }
  } else if (staffFilter) {
    conditions.push(eq(activityLogs.staffId, staffFilter));
  }

  if (actionFilter) {
    conditions.push(eq(activityLogs.action, actionFilter));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLogs)
    .where(where);

  const logs = await db
    .select()
    .from(activityLogs)
    .where(where)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset)
    .all();

  return Response.json({
    logs,
    total: countResult?.count ?? 0,
    page,
    limit,
  });
});
