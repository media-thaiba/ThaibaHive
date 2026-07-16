import { db } from "@/db";
import { staffDepartments, departments } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function isAuthorizedToViewLeave(
  sessionStaffId: string,
  sessionRole: string,
  leaveStaffId: string
): Promise<boolean> {
  if (leaveStaffId === sessionStaffId) return true;
  if (sessionRole === "super_admin" || sessionRole === "admin") return true;

  const requesterDepts = await db
    .select({ departmentId: staffDepartments.departmentId })
    .from(staffDepartments)
    .where(eq(staffDepartments.staffId, leaveStaffId))
    .all();
  
  const requesterDeptIds = requesterDepts.map((d) => d.departmentId);

  if (requesterDeptIds.length === 0) return false;

  const managedDepts = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(
        inArray(departments.id, requesterDeptIds),
        eq(departments.headUserId, sessionStaffId)
      )
    )
    .all();

  return managedDepts.length > 0;
}
