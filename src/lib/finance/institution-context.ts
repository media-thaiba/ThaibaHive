import { getUserInstitutionScope } from "@/lib/auth";

/**
 * Resolve the tenant institution for a finance API request.
 * Precedence: explicit query/body value -> user's institution scope -> default campus.
 */
export async function resolveInstitutionId(requested?: string | null): Promise<string> {
  if (requested) return requested;
  const scope = await getUserInstitutionScope();
  return scope || "inst_default";
}

/**
 * Resolve a tenant institution while enforcing the caller's institution scope.
 * A scoped (non-admin) user may never act on a different institution.
 */
export async function resolveScopedInstitutionId(requested?: string | null): Promise<string> {
  const scope = await getUserInstitutionScope();
  if (scope) {
    if (requested && requested !== scope) {
      throw new Error("Forbidden: institution scope mismatch");
    }
    return scope;
  }
  return requested || "inst_default";
}
