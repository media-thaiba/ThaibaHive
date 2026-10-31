import { db } from "@/db";
import { staffDepartments, staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface CircularTargetingInfo {
  id: string;
  uploadedById?: string | null;
  targetRole?: string | null;
  targetDepartmentId?: string | null;
  targetInstitutionId?: string | null;
  isActive?: boolean | null;
}

/**
 * Validates whether a caller has access to view or download a circular
 * based on role, institution, department, and upload ownership.
 */
export async function canAccessCircular(
  session: { staffId: string; role: string; institutionId?: string | null },
  circular: CircularTargetingInfo
): Promise<boolean> {
  // 1. Super-admin and general admin have global access
  if (session.role === "super_admin" || session.role === "admin") {
    return true;
  }

  // 2. Author can always access their own circulars
  if (circular.uploadedById === session.staffId) {
    return true;
  }

  // 3. Circular must be active for regular viewers
  if (circular.isActive === false) {
    return false;
  }

  // 4. Role Targeting Check
  if (circular.targetRole && circular.targetRole !== session.role) {
    return false;
  }

  // 5. Institution Targeting Check
  if (circular.targetInstitutionId) {
    const userInsts = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .all();
    const instIds = userInsts.map((i) => i.institutionId).filter(Boolean);
    if (!instIds.includes(circular.targetInstitutionId)) {
      return false;
    }
  }

  // 6. Department Targeting Check
  if (circular.targetDepartmentId) {
    const userDepts = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(eq(staffDepartments.staffId, session.staffId))
      .all();
    const deptIds = userDepts.map((d) => d.departmentId).filter(Boolean);
    if (!deptIds.includes(circular.targetDepartmentId)) {
      return false;
    }
  }

  return true;
}
