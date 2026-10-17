import { db } from "@/db";
import { staff, staffInstitutions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type HostValidationResult =
  | { ok: true }
  | { ok: false; status: 400 | 403 | 404; error: string };

/**
 * Validates that a host staff reference is real, active, and — inside a tenant
 * scope — belongs to the issuing institution. Used by every visitor entry point
 * (walk-in registration, pre-registration, and pass issuance).
 */
export async function validateHostStaff(
  hostStaffId: string,
  institutionId?: string | null
): Promise<HostValidationResult> {
  const host = await db
    .select({ id: staff.id, isActive: staff.isActive })
    .from(staff)
    .where(eq(staff.id, hostStaffId))
    .get();
  if (!host) {
    return { ok: false, status: 404, error: "Host staff member not found" };
  }
  if (!host.isActive) {
    return { ok: false, status: 400, error: "Host staff member is inactive" };
  }
  if (institutionId && institutionId !== "global") {
    const membership = await db
      .select({ id: staffInstitutions.id })
      .from(staffInstitutions)
      .where(
        and(
          eq(staffInstitutions.staffId, hostStaffId),
          eq(staffInstitutions.institutionId, institutionId)
        )
      )
      .get();
    if (!membership) {
      return {
        ok: false,
        status: 403,
        error: "Host staff member does not belong to this institution",
      };
    }
  }
  return { ok: true };
}
