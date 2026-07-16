import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions, notifications as notificationsTable } from "@/db/schema";
import { eq, and, or, isNull, inArray, sql } from "drizzle-orm";
import type { StaffRole } from "@/types";

interface CreateNotificationsParams {
  title: string;
  message: string;
  type: string;
  referenceType: string;
  referenceId: string;
  targetRole?: StaffRole;
  targetDepartmentId?: string;
  targetInstitutionId?: string;
}

export async function createNotificationsForTarget(params: CreateNotificationsParams) {
  const { title, message, type, referenceType, referenceId, targetRole, targetDepartmentId, targetInstitutionId } = params;

  // Build targeting conditions
  const roleMatch = targetRole ? eq(staff.role, targetRole) : sql`1=1`;

  let deptMatch = sql`1=1`;
  if (targetDepartmentId) {
    const deptStaff = await db
      .select({ staffId: staffDepartments.staffId })
      .from(staffDepartments)
      .where(eq(staffDepartments.departmentId, targetDepartmentId))
      .all();
    const deptStaffIds = deptStaff.map((d) => d.staffId);
    if (deptStaffIds.length > 0) {
      deptMatch = inArray(staff.id, deptStaffIds);
    } else {
      deptMatch = sql`1=0`;
    }
  }

  let instMatch = sql`1=1`;
  if (targetInstitutionId) {
    const instStaff = await db
      .select({ staffId: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.institutionId, targetInstitutionId))
      .all();
    const instStaffIds = instStaff.map((i) => i.staffId);
    if (instStaffIds.length > 0) {
      instMatch = inArray(staff.id, instStaffIds);
    } else {
      instMatch = sql`1=0`;
    }
  }

  // Find targeted active staff
  const targetedStaff = await db
    .select({ id: staff.id })
    .from(staff)
    .where(
      and(
        eq(staff.isActive, true),
        roleMatch,
        deptMatch,
        instMatch
      )
    )
    .all();

  if (targetedStaff.length === 0) return;

  const now = new Date().toISOString();
  const notificationRecords = targetedStaff.map((s) => ({
    id: crypto.randomUUID(),
    staffId: s.id,
    title,
    message,
    type,
    referenceType,
    referenceId,
    isRead: false,
    createdAt: now,
  }));

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < notificationRecords.length; i += batchSize) {
    const batch = notificationRecords.slice(i, i + batchSize);
    await db.insert(notificationsTable).values(batch).run();
  }
}