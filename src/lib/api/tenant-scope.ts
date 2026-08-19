import { db } from "@/db";
import { staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns the set of institutionIds the acting staff member belongs to,
 * derived server-side from staffInstitutions junction table.
 * Used to enforce tenant scoping when SessionPayload carries no institutionId field.
 */
export async function getActorInstitutionIds(staffId: string): Promise<Set<string>> {
  const rows = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, staffId));

  return new Set(rows.map((r) => r.institutionId));
}

/**
 * Asserts that a given institutionId is within the actor's allowed set.
 * Throws a typed error with a 403-appropriate message if not.
 */
export function assertActorOwnsInstitution(
  actorInstitutionIds: Set<string>,
  targetInstitutionId: string | null | undefined
): void {
  if (!targetInstitutionId) {
    throw new TenantMismatchError("Target has no institutionId — cannot verify tenant ownership.");
  }
  if (!actorInstitutionIds.has(targetInstitutionId)) {
    throw new TenantMismatchError(
      "Forbidden: Actor does not belong to the target institution."
    );
  }
}

export class TenantMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMismatchError";
  }
}
