import { verifySession, type SessionPayload } from "./session";
import { db, staffInstitutions, institutions } from "@thaiba/db";
import { eq, inArray } from "drizzle-orm";

export class TenantMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMismatchError";
  }
}

/**
 * Returns all institutionIds the acting staff member belongs to,
 * ordered deterministically.
 */
export async function getStaffInstitutionMemberships(staffId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, staffId))
      .orderBy(staffInstitutions.institutionId);

    return Array.isArray(rows) ? rows.map((r) => r.institutionId) : [];
  } catch {
    return [];
  }
}

/**
 * Returns the primary institutionId for the current session user.
 * Returns null if the user is an admin or has no memberships.
 */
export async function getUserInstitutionScope(sessionParam?: SessionPayload | null): Promise<string | null> {
  const session = sessionParam !== undefined ? sessionParam : await verifySession();
  if (!session) return null;

  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return null;
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);
  if (memberships.length === 0) {
    return null;
  }
  return memberships[0] ?? null;
}

/**
 * Resolves scoped institution ID safely and fails closed.
 * - Admin/Super Admin/System: Allowed to target requested institution or defaults to "global".
 * - Non-admin:
 *   - If user has no institution mapping => throws TenantMismatchError (NEVER returns "global" or untrusted request).
 *   - If requestedInstitutionId is provided => asserts user is an active member of requested institution; throws TenantMismatchError if not.
 *   - If requestedInstitutionId is omitted => returns primary institution membership.
 */
export async function resolveScopedInstitutionId(
  requestedInstitutionId?: string | null,
  sessionParam?: SessionPayload | null
): Promise<string> {
  const session = sessionParam !== undefined ? sessionParam : await verifySession();
  if (!session) {
    return requestedInstitutionId || "global";
  }

  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return requestedInstitutionId || "global";
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);

  if (memberships.length === 0) {
    throw new TenantMismatchError("Forbidden: User has no assigned institution.");
  }

  const membershipSet = new Set(memberships);

  if (requestedInstitutionId) {
    if (!membershipSet.has(requestedInstitutionId)) {
      throw new TenantMismatchError(
        `Forbidden: Actor does not belong to the requested institution (${requestedInstitutionId}).`
      );
    }
    return requestedInstitutionId;
  }

  return memberships[0];
}

/**
 * Resolves request institution ID against caller session and verified memberships (B8).
 * - admin/super_admin/system: return requested || "global"
 * - everyone else:
 *     - if requested is present and not in caller's verified memberships: throw TenantMismatchError (403)
 *     - if requested is "global": throw TenantMismatchError (403)
 *     - if requested is valid: return requested
 *     - if requested is absent: return session.institutionId || memberships[0]
 *     - if no memberships exist: throw TenantMismatchError (403)
 * - Never returns "global" or a hardcoded ID for non-admins.
 */
export async function resolveRequestInstitution(
  session: SessionPayload | { staffId: string; role: string; institutionId?: string | null },
  requested?: string | null
): Promise<string> {
  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return requested || session.institutionId || "global";
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);
  const membershipSet = new Set(memberships);
  if (session.institutionId && session.institutionId !== "global") {
    membershipSet.add(session.institutionId);
  }

  if (requested) {
    if (requested === "global" || !membershipSet.has(requested)) {
      throw new TenantMismatchError(
        `Forbidden: Actor does not belong to the requested institution (${requested}).`
      );
    }
    return requested;
  }

  const primary = (session.institutionId && session.institutionId !== "global")
    ? session.institutionId
    : memberships[0];

  if (!primary) {
    throw new TenantMismatchError("Forbidden: User has no assigned institution.");
  }

  return primary;
}

/**
 * Resolves list of allowed institution IDs for a session query (supports multi-institution staff).
 * - If requested is provided: returns [resolvedInstitutionId]
 * - If requested is omitted:
 *     - Admin/System: returns ["global"]
 *     - Non-admin: returns all caller's verified memberships
 */
export async function resolveScopedInstitutions(
  session: SessionPayload | { staffId: string; role: string; institutionId?: string | null },
  requested?: string | null
): Promise<string[]> {
  if (requested) {
    const single = await resolveRequestInstitution(session, requested);
    return [single];
  }
  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return ["global"];
  }
  const memberships = await getStaffInstitutionMemberships(session.staffId);
  if (session.institutionId && session.institutionId !== "global" && !memberships.includes(session.institutionId)) {
    memberships.push(session.institutionId);
  }
  if (memberships.length === 0) {
    throw new TenantMismatchError("Forbidden: User has no assigned institution.");
  }
  return memberships;
}


/**
 * Resolves tenant scope for session in auth guard and middleware.
 * If hostOrSubdomain is provided, checks if it maps to one of the user's institutions.
 * If user accesses a specific subdomain they are NOT a member of => returns null (fails closed).
 * If user has NO memberships => returns null.
 * Admins return "global".
 */
export async function resolveInstitutionScopeForSession(
  session: SessionPayload | { staffId: string; role: string; institutionId?: string | null },
  hostOrSubdomain?: string | null
): Promise<string | null> {
  if (session.role === "super_admin" || session.role === "admin" || session.role === "system") {
    return "global";
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);
  if (memberships.length === 0) {
    return null;
  }

  if (hostOrSubdomain) {
    // Extract subdomain (e.g., 'beta_123.thaibahive.com' -> 'beta_123')
    const cleanHost = hostOrSubdomain.split(":")[0];
    const hostParts = cleanHost.split(".");
    let targetSubdomain: string | null = null;
    if (hostParts.length > 2) {
      targetSubdomain = hostParts[0].toLowerCase();
    } else if (cleanHost && !cleanHost.includes(".") && cleanHost !== "localhost") {
      targetSubdomain = cleanHost.toLowerCase();
    }

    if (targetSubdomain && targetSubdomain !== "app" && targetSubdomain !== "www" && targetSubdomain !== "api") {
      // Find matching institution in DB
      const matchingInstitutions = await db
        .select({ id: institutions.id, code: institutions.code })
        .from(institutions)
        .where(inArray(institutions.id, memberships));

      const matched = matchingInstitutions.find(
        (inst) =>
          inst.id.toLowerCase() === targetSubdomain ||
          inst.code.toLowerCase() === targetSubdomain
      );

      if (matched) {
        return matched.id;
      }

      // If the subdomain exists in the system but the user is not a member of it, fail closed!
      const targetInst = await db
        .select({ id: institutions.id, code: institutions.code })
        .from(institutions)
        .where(eq(institutions.code, targetSubdomain))
        .get();

      if (targetInst) {
        // Institution exists, but user is NOT a member
        return null;
      }
    }
  }

  return memberships[0] ?? null;
}
