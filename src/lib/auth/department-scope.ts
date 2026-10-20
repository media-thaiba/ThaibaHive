import { db } from "@/db";
import { staffDepartments, departments, staffInstitutions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

async function sharesInstitutionMembership(callerStaffId: string, targetStaffId: string): Promise<boolean> {
  const callerInstRows = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, callerStaffId))
    .all();

  if (callerInstRows.length === 0) return false;
  const callerInstSet = new Set(callerInstRows.map((r) => r.institutionId));

  const targetInstRows = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, targetStaffId))
    .all();

  return targetInstRows.some((r) => callerInstSet.has(r.institutionId));
}

/**
 * Returns an array of staff IDs that the given HOD is authorized to manage.
 * These are staff members who belong to any department where `hodStaffId` is the head.
 * Returns null for super_admin (global scope).
 * For admin/principal: returns all staff in their assigned institutions (or null if unmapped in legacy unit tests).
 * Returns empty array for non-HOD roles (they manage nobody).
 */
export async function getManagedStaffIds(
  hodStaffId: string,
  role: string
): Promise<string[] | null> {
  if (role === "super_admin") return null;
  if (role === "admin" || role === "principal") {
    const callerInstRows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, hodStaffId))
      .all();
    if (callerInstRows.length === 0) {
      return role === "admin" ? null : [hodStaffId];
    }
    const instIds = callerInstRows.map((r) => r.institutionId);
    const instStaff = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(inArray(staffInstitutions.institutionId, instIds))
      .all();
    return [...new Set([...instStaff.map((s) => s.staffId), hodStaffId])];
  }
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
 * Checks whether the given manager manages a specific staff member within their tenant scope.
 */
export async function isManagedBy(
  managerStaffId: string,
  role: string,
  targetStaffId: string
): Promise<boolean> {
  if (targetStaffId === managerStaffId) return true;
  if (role === "super_admin") return true;

  if (role === "admin" || role === "principal" || role === "accounts" || role === "purchase") {
    const callerInstRows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, managerStaffId))
      .all();
    // If manager has explicit institution mappings, enforce same-institution membership
    if (callerInstRows.length > 0) {
      return sharesInstitutionMembership(managerStaffId, targetStaffId);
    }
    return role === "admin";
  }

  const managedIds = await getManagedStaffIds(managerStaffId, role);
  if (managedIds === null) return true;
  return managedIds.includes(targetStaffId);
}

/**
 * Checks whether the caller can access a specific staff member's data.
 * - super_admin: everyone
 * - admin/principal: staff in the same institution
 * - hod: staff in the same departments
 * - staff: only self
 */
export async function canAccessStaff(
  callerStaffId: string,
  role: string,
  targetStaffId: string
): Promise<boolean> {
  if (targetStaffId === callerStaffId) return true;
  if (role === "super_admin") return true;

  if (role === "admin" || role === "principal") {
    const callerInstRows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, callerStaffId))
      .all();
    if (callerInstRows.length === 0) {
      return role === "admin";
    }
    return sharesInstitutionMembership(callerStaffId, targetStaffId);
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
 * - super_admin: returns null (meaning no filter — all staff)
 * - admin/principal: staff in their institution
 * - hod: staff in their departments
 * - staff: only themselves
 */
export async function getAccessibleStaffIds(
  callerStaffId: string,
  role: string
): Promise<string[] | null> {
  if (role === "super_admin") return null;

  if (role === "admin" || role === "principal") {
    const callerInstRows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, callerStaffId))
      .all();
    if (callerInstRows.length === 0) {
      return role === "admin" ? null : [callerStaffId];
    }
    const instIds = callerInstRows.map((r) => r.institutionId);
    const instStaff = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(inArray(staffInstitutions.institutionId, instIds))
      .all();
    return [...new Set([...instStaff.map((s) => s.staffId), callerStaffId])];
  }

  return getManagedStaffIds(callerStaffId, role);
}

/**
 * Checks whether the caller is authorized to access a specific task.
 */
export async function canAccessTask(
  callerStaffId: string,
  role: string,
  task: { assignedToId: string | null; assignedById: string | null; departmentId: string | null }
): Promise<boolean> {
  if (role === "super_admin") return true;
  if (task.assignedToId === callerStaffId || task.assignedById === callerStaffId) return true;

  if (role === "admin" || role === "principal") {
    const callerInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, callerStaffId))
      .all();
    if (callerInst.length === 0) {
      return role === "admin";
    }
    const callerInstSet = new Set(callerInst.map((r) => r.institutionId));

    if (!task.departmentId) {
      const taskInst = (task as { institutionId?: string | null }).institutionId;
      return taskInst ? callerInstSet.has(taskInst) : role === "admin";
    }

    const dept = await db
      .select({ institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, task.departmentId))
      .get();
    return dept?.institutionId ? callerInstSet.has(dept.institutionId) : false;
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
