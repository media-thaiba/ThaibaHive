import { membershipAls } from "./membership-cache";
import { sessionAls } from "./session-context";
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
]);

export function isGlobalScopeRole(role: string): boolean {
  return GLOBAL_SCOPE_ROLES.has(role);
}

export function isRegionalScopeRole(role: string): boolean {
  return role === "regional_admin" || role === "regional_auditor";
}

/**
 * Returns all institutionIds the acting staff member belongs to,
 * ordered deterministically.
 */
export async function getStaffInstitutionMemberships(staffId: string): Promise<string[]> {
  const store = membershipAls.getStore();
  if (store && store.memberships.has(staffId)) {
    return store.memberships.get(staffId)!;
  }

  try {
    const rows = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, staffId))
      .orderBy(staffInstitutions.institutionId);

    const result = Array.isArray(rows) ? rows.map((r) => r.institutionId) : [];
    if (store) {
      store.memberships.set(staffId, result);
    }
    return result;
  } catch {
    return [];
  }
}

interface GlobalWithActiveSession {
  __activeSession?: SessionPayload;
}

/**
 * Returns the primary institutionId for the current session user.
 * Returns null if the user has a global role or has no memberships.
 */
export async function getUserInstitutionScope(sessionParam?: SessionPayload | null): Promise<string | null> {
  const activeSession = sessionAls.getStore();
  const testSession = process.env.NODE_ENV === 'test' ? (globalThis as unknown as GlobalWithActiveSession).__activeSession : undefined;
  const session = sessionParam !== undefined ? sessionParam : (activeSession || testSession || (await verifySession()));
  if (!session) return null;

  if (isGlobalScopeRole(session.role)) {
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
 * - Global roles (super_admin, regional_admin, regional_auditor, system): Allowed to target requested institution or defaults to "global".
 * - Institution-scoped roles (including admin, principal, hod, staff):
 *   - If no active session => throws TenantMismatchError (never returns "global" or untrusted request).
 *   - If user has no institution mapping => throws TenantMismatchError.
 *   - If requestedInstitutionId is provided => asserts user is an active member of requested institution; throws TenantMismatchError if not.
 *   - If requestedInstitutionId is omitted => returns primary institution membership.
 */
export async function resolveScopedInstitutionId(
  requestedInstitutionId?: string | null,
  sessionParam?: SessionPayload | null,
  options?: { allowGlobal?: boolean }
): Promise<string> {
  const activeSession = sessionAls.getStore();
  const testSession = process.env.NODE_ENV === 'test' ? (globalThis as unknown as GlobalWithActiveSession).__activeSession : undefined;
  const session = sessionParam !== undefined ? sessionParam : (activeSession || testSession || (await verifySession()));
  if (!session) {
    throw new TenantMismatchError("Unauthorized: Active session required to resolve institution scope.");
  }

  // Tier 1: super_admin (Global)
  if (isGlobalScopeRole(session.role)) {
    if (requestedInstitutionId) return requestedInstitutionId;
    if (options?.allowGlobal) return "global";
    if (session.institutionId && session.institutionId !== "global") return session.institutionId;
    return "global";
  }

  // Tier 2: regional_admin (Regional Cluster)
  if (isRegionalScopeRole(session.role)) {
    const cluster = await getStaffInstitutionMemberships(session.staffId);
    if (cluster.length === 0) {
      throw new TenantMismatchError("Forbidden: Regional administrator has no assigned regional cluster.");
    }
    const clusterSet = new Set(cluster);
    const target = requestedInstitutionId || session.institutionId;
    if (!target || target === "global" || !clusterSet.has(target)) {
      throw new TenantMismatchError(`Forbidden: Regional administrator cannot access unassigned institution (${target}).`);
    }
    return target;
  }

  // Tier 3, 4, 5: Institution / Department / Staff pinned to verified memberships / session.institutionId
  const memberships = await getStaffInstitutionMemberships(session.staffId);

  if (memberships.length === 0) {
    throw new TenantMismatchError("Forbidden: Scoped account has no assigned institution.");
  }

  const membershipSet = new Set(memberships);

  if (session.institutionId && session.institutionId !== "global" && !membershipSet.has(session.institutionId)) {
    throw new TenantMismatchError(
      `Forbidden: Session claims institution (${session.institutionId}) but membership was revoked or not assigned.`
    );
  }

  if (requestedInstitutionId) {
    if (requestedInstitutionId === "global" || !membershipSet.has(requestedInstitutionId)) {
      throw new TenantMismatchError(
        `Forbidden: Cross-tenant access denied. Caller institution (${session.institutionId || memberships[0]}) does not match requested (${requestedInstitutionId}).`
      );
    }
    return requestedInstitutionId;
  }

  if (session.institutionId && session.institutionId !== "global" && membershipSet.has(session.institutionId)) {
    return session.institutionId;
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

  if (isRegionalScopeRole(session.role)) {
    const cluster = await getStaffInstitutionMemberships(session.staffId);
    if (cluster.length === 0) {
      throw new TenantMismatchError("Forbidden: Regional administrator has no assigned regional cluster.");
    }
    const clusterSet = new Set(cluster);
    const target = requested || session.institutionId;
    if (!target || target === "global" || !clusterSet.has(target)) {
      throw new TenantMismatchError(`Forbidden: Regional administrator cannot access unassigned institution (${target}).`);
    }
    return target;
  }

  const memberships = await getStaffInstitutionMemberships(session.staffId);

  if (memberships.length === 0) {
    throw new TenantMismatchError("Forbidden: Scoped account has no assigned institution.");
  }

  const membershipSet = new Set(memberships);

  if (session.institutionId && session.institutionId !== "global" && !membershipSet.has(session.institutionId)) {
    throw new TenantMismatchError(
      `Forbidden: Session claims institution (${session.institutionId}) but membership was revoked or not assigned.`
    );
  }

  if (requested) {
    if (requested === "global" || !membershipSet.has(requested)) {
      throw new TenantMismatchError(
        `Forbidden: Cross-tenant access denied. Caller institution (${session.institutionId || memberships[0]}) does not match requested (${requested}).`
      );
    }
    return requested;
  }

  if (session.institutionId && session.institutionId !== "global" && membershipSet.has(session.institutionId)) {
    return session.institutionId;
  }

  return memberships[0];
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
