import { db } from "@/db";
import { staffDepartments, departments, staffInstitutions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Returns an array of staff IDs that the given HOD is authorized to manage.
 * These are staff members who belong to any department where `hodStaffId` is the head.
 * Returns null for super_admin/admin (they see everything — no filtering needed).
 * Returns empty array for non-HOD roles (they manage nobody).
 */
export async function getManagedStaffIds(
  hodStaffId: string,
  role: string
): Promise<string[] | null> {
  if (role === "super_admin" || role === "admin") return null;
  if (role !== "hod") return [];

  const managedDepts = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.headUserId, hodStaffId))
    .all();

  if (managedDepts.length === 0) return [];

  const deptIds = managedDepts.map((d) => d.id);

  const members = await db
    .select({ staffId: staffDepartments.staffId })
    .from(staffDepartments)
    .where(inArray(staffDepartments.departmentId, deptIds))
    .all();

  const staffIds = [...new Set(members.map((m) => m.staffId))];

  if (staffIds.length === 0) return [];

  staffIds.push(hodStaffId);

  return staffIds;
}

/**
 * Checks whether the given HOD manages a specific staff member.
 * Returns true for super_admin/admin (they manage everyone).
 * Returns true if the target is the same person.
 * For HOD: checks if the target staff is in any department the HOD heads.
 */
export async function isManagedBy(
  managerStaffId: string,
  role: string,
  targetStaffId: string
): Promise<boolean> {
  if (targetStaffId === managerStaffId) return true;
  if (role === "super_admin" || role === "admin") return true;

  const managedIds = await getManagedStaffIds(managerStaffId, role);
  if (managedIds === null) return true;
  return managedIds.includes(targetStaffId);
}

/**
 * Checks whether the caller can access a specific staff member's data.
 * - super_admin/admin: everyone
 * - principal: staff in the same institution
 * - hod: staff in the same departments
 * - staff: only self
 */
export async function canAccessStaff(
  callerStaffId: string,
  role: string,
  targetStaffId: string
): Promise<boolean> {
  if (targetStaffId === callerStaffId) return true;
  if (role === "super_admin" || role === "admin") return true;

  if (role === "principal") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, callerStaffId))
      .limit(1);
    const instId = callerInst[0]?.institutionId;
    if (!instId) return false;

    const targetInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, targetStaffId))
      .limit(1);
    return targetInst[0]?.institutionId === instId;
  }

  if (role === "hod") {
    const managedIds = await getManagedStaffIds(callerStaffId, "hod");
    if (managedIds === null) return true;
    return managedIds.includes(targetStaffId);
  }

  return false;
}

/**
 * Returns all staff IDs the caller is authorized to access.
 * - super_admin/admin: returns null (meaning no filter — all staff)
 * - principal: staff in their institution
 * - hod: staff in their departments
 * - staff: only themselves
 */
export async function getAccessibleStaffIds(
  callerStaffId: string,
  role: string
): Promise<string[] | null> {
  if (role === "super_admin" || role === "admin") return null;

  if (role === "principal") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, callerStaffId))
      .limit(1);
    const instId = callerInst[0]?.institutionId;
    if (!instId) return [callerStaffId];

    const instStaff = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.institutionId, instId))
      .all();
    return [...new Set(instStaff.map((s) => s.staffId))];
  }

  return getManagedStaffIds(callerStaffId, role);
}

/**
 * Checks whether the caller is authorized to access a specific task.
 * - super_admin/admin: see/modify everything
 * - assignedToId or assignedById is the caller: see/modify
 * - principal: task's department belongs to the same institution
 * - hod: task's department is managed by the HOD
 */
export async function canAccessTask(
  callerStaffId: string,
  role: string,
  task: { assignedToId: string | null; assignedById: string | null; departmentId: string | null }
): Promise<boolean> {
  if (role === "super_admin" || role === "admin") return true;
  if (task.assignedToId === callerStaffId || task.assignedById === callerStaffId) return true;

  if (role === "principal" && task.departmentId) {
    const dept = await db
      .select({ institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, task.departmentId))
      .get();
    if (dept?.institutionId) {
      const callerInst = await db
        .select({ institutionId: staffInstitutions.institutionId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, callerStaffId))
        .limit(1);
      return callerInst[0]?.institutionId === dept.institutionId;
    }
  }

  if (role === "hod" && task.departmentId) {
    const dept = await db
      .select({ headUserId: departments.headUserId })
      .from(departments)
      .where(eq(departments.id, task.departmentId))
      .get();
    return dept?.headUserId === callerStaffId;
  }

  return false;
}

