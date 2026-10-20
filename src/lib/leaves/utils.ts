import { db } from "@/db";
import { staffDepartments, departments, staffInstitutions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function isAuthorizedToViewLeave(
  sessionStaffId: string,
  sessionRole: string,
  leaveStaffId: string
): Promise<boolean> {
  if (leaveStaffId === sessionStaffId) return true;
  if (sessionRole === "super_admin" || sessionRole === "admin") return true;

  // Principal can view leaves of any staff within their institution
  if (sessionRole === "principal") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, sessionStaffId))
      .limit(1);

    const callerInstId = callerInst[0]?.institutionId;
    if (!callerInstId) return false;

    const targetInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, leaveStaffId))
      .limit(1);

    return targetInst[0]?.institutionId === callerInstId;
  }

  // HOD can view leaves of staff in departments they manage
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
