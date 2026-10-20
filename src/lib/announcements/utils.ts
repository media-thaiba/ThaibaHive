import { db } from "@/db";
import { staffDepartments, staffInstitutions, departments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { SessionPayload } from "@thaiba/auth";
import { resolveScopedInstitutionId } from "@/lib/auth";

export interface AnnouncementTargetInfo {
  id?: string;
  targetInstitutionId: string | null;
  targetRole: string | null;
  targetDepartmentId: string | null;
  createdById: string;
  isActive: boolean;
}

const readLocks = new Map<string, Promise<void>>();

/**
 * Get staff primary institution ID from staffInstitutions junction table.
 */
export async function getStaffPrimaryInstitutionId(staffId: string): Promise<string | null> {
  const row = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, staffId))
    .limit(1)
    .get();
  return row?.institutionId || null;
}

/**
 * Mutex lock per announcement-staff pair to prevent race condition read receipt duplicate rows.
 */
export async function withReadReceiptLock<T>(announcementId: string, staffId: string, fn: () => Promise<T>): Promise<T> {
  const key = `${announcementId}:${staffId}`;
  while (readLocks.has(key)) {
    await readLocks.get(key);
  }

  let release: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    release = resolve;
  });
  readLocks.set(key, lockPromise);

  try {
    return await fn();
  } finally {
    readLocks.delete(key);
    release();
  }
}

/**
 * Check if the caller is authorized to view an announcement based on tenant and audience targeting.
 */
export async function canAccessAnnouncement(
  session: SessionPayload,
  announcement: AnnouncementTargetInfo
): Promise<boolean> {
  // Super admin has universal visibility
  if (session.role === "super_admin") return true;

  // The author can always view their own announcement
  if (announcement.createdById === session.staffId) return true;

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  let callerInstId = scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;
  if (!callerInstId && session.staffId) {
    callerInstId = await getStaffPrimaryInstitutionId(session.staffId);
  }

  // Admin and Principal have oversight over all announcements within their institution
  if (session.role === "admin" || session.role === "principal") {
    if (announcement.targetInstitutionId && callerInstId && announcement.targetInstitutionId !== callerInstId) {
      // Check secondary institution memberships
      const membership = await db
        .select({ id: staffInstitutions.id })
        .from(staffInstitutions)
        .where(
          and(
            eq(staffInstitutions.staffId, session.staffId),
            eq(staffInstitutions.institutionId, announcement.targetInstitutionId)
          )
        )
        .get();

      if (!membership) return false;
    }
    return true;
  }

  // Institution boundary check for staff:
  if (announcement.targetInstitutionId && callerInstId) {
    if (announcement.targetInstitutionId !== callerInstId) {
      // Check secondary institution memberships
      const membership = await db
        .select({ id: staffInstitutions.id })
        .from(staffInstitutions)
        .where(
          and(
            eq(staffInstitutions.staffId, session.staffId),
            eq(staffInstitutions.institutionId, announcement.targetInstitutionId)
          )
        )
        .get();

      if (!membership) return false;
    }
  }

  // For regular staff/HOD: inactive announcements are hidden
  if (!announcement.isActive) return false;

  // Role targeting check
  if (announcement.targetRole && announcement.targetRole !== session.role) {
    return false;
  }

  // Department targeting check
  if (announcement.targetDepartmentId) {
    const userDept = await db
      .select({ id: staffDepartments.id })
      .from(staffDepartments)
      .where(
        and(
          eq(staffDepartments.staffId, session.staffId),
          eq(staffDepartments.departmentId, announcement.targetDepartmentId)
        )
      )
      .get();

    if (!userDept) return false;
  }

  return true;
}

/**
 * Check if the caller is authorized to modify or delete an announcement.
 */
export async function canManageAnnouncement(
  session: SessionPayload,
  announcement: Pick<AnnouncementTargetInfo, "targetInstitutionId" | "createdById">
): Promise<boolean> {
  // Super admin can manage anything
  if (session.role === "super_admin") return true;

  // The author can manage their own announcement
  if (announcement.createdById === session.staffId) return true;

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
  let callerInstId = scopedInstitutionId && scopedInstitutionId !== "global" ? scopedInstitutionId : null;
  if (!callerInstId && session.staffId) {
    callerInstId = await getStaffPrimaryInstitutionId(session.staffId);
  }

  // Admin or Principal can manage announcements within their institution
  if (session.role === "admin" || session.role === "principal") {
    if (!announcement.targetInstitutionId) {
      // Global announcements cannot be modified by institutional admins (unless author)
      return false;
    }
    return announcement.targetInstitutionId === callerInstId;
  }

  return false;
}

/**
 * Verify that target department belongs to the specified institution.
 */
export async function verifyDepartmentInstitution(
  departmentId: string,
  institutionId: string
): Promise<boolean> {
  const dept = await db
    .select({ institutionId: departments.institutionId })
    .from(departments)
    .where(eq(departments.id, departmentId))
    .get();

  if (!dept) return false;
  return dept.institutionId === institutionId;
}
