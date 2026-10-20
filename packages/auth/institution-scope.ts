import { verifySession, type SessionPayload } from "./session";
import { db, staffInstitutions, institutions } from "@thaiba/db";
import { eq, inArray } from "drizzle-orm";

export class TenantMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantMismatchError";
  }
}

const GLOBAL_SCOPE_ROLES = new Set([
  "super_admin",
  "regional_admin",
  "regional_auditor",
  "system",
]);

function isGlobalScopeRole(role: string): boolean {
  return GLOBAL_SCOPE_ROLES.has(role);
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
 * Returns null if the user has a global role or has no memberships.
 */
export async function getUserInstitutionScope(sessionParam?: SessionPayload | null): Promise<string | null> {
  const session = sessionParam !== undefined ? sessionParam : ((globalThis as any).__activeSession || (await verifySession()));
  if (!session) return null;

  if (isGlobalScopeRole(session.role)) {
    return null;
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);
  if (memberships.length === 0) {
    if (session.institutionId && session.institutionId !== "global") {
      return session.institutionId;
    }
    return null;
  }
  return memberships[0] ?? null;
}

/**
 * Resolves scoped institution ID safely and fails closed.
 * - Global roles (super_admin, regional_admin, regional_auditor, system): Allowed to target requested institution or defaults to "global".
 * - Institution-scoped roles (including admin, principal, hod, staff):
 *   - If no active session => throws TenantMismatchError (never returns "global" or untrusted request).
 *   - If user has no institution mapping => throws TenantMismatchError.
 *   - If requestedInstitutionId is provided => asserts user is an active member of requested institution; throws TenantMismatchError if not.
 *   - If requestedInstitutionId is omitted => returns primary institution membership.
 */
export async function resolveScopedInstitutionId(
  requestedInstitutionId?: string | null,
  sessionParam?: SessionPayload | null
): Promise<string> {
  const session = sessionParam !== undefined ? sessionParam : ((globalThis as any).__activeSession || (await verifySession()));
  if (!session) {
    throw new TenantMismatchError("Unauthorized: Active session required to resolve institution scope.");
  }

  if (isGlobalScopeRole(session.role)) {
    return requestedInstitutionId || "global";
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);
  if (session.institutionId && session.institutionId !== "global" && !memberships.includes(session.institutionId)) {
    memberships.push(session.institutionId);
  }

  if (memberships.length === 0) {
    throw new TenantMismatchError("Forbidden: User has no assigned institution.");
  }

  const membershipSet = new Set(memberships);

  if (requestedInstitutionId) {
    if (requestedInstitutionId === "global" || !membershipSet.has(requestedInstitutionId)) {
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
 * - Global roles (super_admin, regional_admin, regional_auditor, system): return requested || "global"
 * - Everyone else (including admin):
 *     - if requested is present and not in caller's verified memberships: throw TenantMismatchError (403)
 *     - if requested is "global": throw TenantMismatchError (403)
 *     - if requested is valid: return requested
 *     - if requested is absent: return session.institutionId || memberships[0]
 *     - if no memberships exist: throw TenantMismatchError (403)
 * - Never returns "global" or a hardcoded ID for non-global roles.
 */
export async function resolveRequestInstitution(
  session: SessionPayload | { staffId: string; role: string; institutionId?: string | null },
  requested?: string | null
): Promise<string> {
  if (isGlobalScopeRole(session.role)) {
    if (requested) return requested;
    if (session.institutionId && session.institutionId !== "global") return session.institutionId;
    const memberships = await getStaffInstitutionMemberships(session.staffId);
    if (memberships.length > 0) return memberships[0];
    return "global";
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
 *     - Global roles (super_admin, regional_admin, regional_auditor, system): returns ["global"]
 *     - Institution-scoped roles (including admin): returns all caller's verified memberships
 */
export async function resolveScopedInstitutions(
  session: SessionPayload | { staffId: string; role: string; institutionId?: string | null },
  requested?: string | null
): Promise<string[]> {
  if (requested) {
    const single = await resolveRequestInstitution(session, requested);
    return [single];
  }
  if (isGlobalScopeRole(session.role)) {
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
 * Global roles return "global".
 */
export async function resolveInstitutionScopeForSession(
  session: SessionPayload | { staffId: string; role: string; institutionId?: string | null },
  hostOrSubdomain?: string | null
): Promise<string | null> {
  if (isGlobalScopeRole(session.role)) {
    return "global";
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);
  if (session.institutionId && session.institutionId !== "global" && !memberships.includes(session.institutionId)) {
    memberships.push(session.institutionId);
  }
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

      // Non-reserved subdomain did not match any of the caller's institutions — fail closed
      return null;
    }
  }

  return memberships[0] ?? null;
}
