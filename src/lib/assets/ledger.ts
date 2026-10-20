/**
 * Asset & Inventory Management Ledger & Concurrency Engine
 *
 * Implements:
 * 1. Serialized per-asset mutex (withAssetLock) preventing racing reassignments and status updates.
 * 2. Multi-tenant scoping and fail-closed IDOR authorization checks (canAccessAsset, canManageAsset).
 * 3. Cross-tenant staff affiliation verification (verifyStaffInstitutionAffiliation).
 * 4. Inactive/decommissioned state guards.
 */

import { db } from "@/db";
import { staff, staffInstitutions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const assetLocks = new Map<string, Promise<unknown>>();

/**
 * Serializes mutations on a specific asset to prevent concurrent update races.
 */
export async function withAssetLock<T>(assetId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = assetLocks.get(assetId) ?? Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  assetLocks.set(assetId, currentLock.then(() => nextLock));

  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (assetLocks.get(assetId) === nextLock) {
      assetLocks.delete(assetId);
    }
  }
}

export interface AssetSessionContext {
  role?: string;
  staffId?: string | null;
  institutionId?: string | null;
  sub?: string;
}

/**
 * Validates whether the caller has permission to view an asset.
 * - Super_admin: unrestricted.
 * - Admin/Principal/HOD: restricted to assets in their institution.
 * - Regular staff: restricted strictly to assets assigned to them within their institution.
 */
export function canAccessAsset(
  asset: { assignedToId: string | null; institutionId: string | null },
  session: AssetSessionContext,
  scopedInstId: string
): boolean {
  if (session.role === "super_admin") return true;

  // Cross-tenant boundary check
  if (scopedInstId !== "global" && asset.institutionId && asset.institutionId !== scopedInstId) {
    return false;
  }

  const isManager = ["super_admin", "admin", "principal", "hod"].includes(session.role || "");
  if (isManager) return true;

  // Regular staff only see assets assigned to them
  return Boolean(session.staffId && asset.assignedToId === session.staffId);
}

/**
 * Validates whether the caller has permission to manage/update/delete an asset.
 */
export function canManageAsset(
  asset: { institutionId: string | null },
  session: AssetSessionContext,
  scopedInstId: string
): boolean {
  if (session.role === "super_admin") return true;

  if (scopedInstId !== "global" && asset.institutionId && asset.institutionId !== scopedInstId) {
    return false;
  }

  return ["super_admin", "admin", "principal", "hod"].includes(session.role || "");
}

/**
 * Verifies that a staff member belongs to the designated institution before assigning an asset.
 */
export async function verifyStaffInstitutionAffiliation(
  staffId: string,
  targetInstitutionId: string | null | undefined
): Promise<boolean> {
  if (!targetInstitutionId || targetInstitutionId === "global") return true;

  const staffRecord = await db.select({ id: staff.id }).from(staff).where(eq(staff.id, staffId)).get();
  if (!staffRecord) return false;

  const membership = await db
    .select({ id: staffInstitutions.id })
    .from(staffInstitutions)
    .where(and(eq(staffInstitutions.staffId, staffId), eq(staffInstitutions.institutionId, targetInstitutionId)))
    .get();

  return Boolean(membership);
}

/**
 * Checks if an asset is decommissioned or inactive.
 */
export function isDecommissionedAsset(asset: { status?: string | null; isActive?: boolean | null }): boolean {
  return asset.status === "decommissioned" || asset.isActive === false;
}
