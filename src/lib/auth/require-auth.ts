/**
 * @module require-auth
 * Re-exports requireAuth from the canonical auth-guard location.
 * Sprint-020 compliance API routes import from this module.
 */
export {
  requireAuth,
  resolveRequestInstitution,
  resolveScopedInstitutions,
  resolveScopedInstitutionId,
  TenantMismatchError,
} from '../api/auth-guard';