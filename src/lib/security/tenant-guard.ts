/**
 * Tenant Guard: Runtime Cross-Tenant Data Isolation Enforcer
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantIsolationError } from "@/db";

export interface TenantContext {
  institutionId?: string;
  tenantId?: string;
  role?: string;
  isSuperAdmin?: boolean;
}

export class TenantGuard {
  public static validateScope(
    context: TenantContext,
    targetInstitutionId?: string,
    operationName: string = "query"
  ): void {
    if (context.isSuperAdmin || context.role === "super_admin") {
      return; // Super admins have global cross-tenant visibility
    }

    const currentTenant = context.institutionId || context.tenantId;

    if (!currentTenant) {
      throw new TenantIsolationError(
        `Operation '${operationName}' rejected: Missing tenant context in authenticated session`
      );
    }

    if (targetInstitutionId && targetInstitutionId !== currentTenant) {
      throw new TenantIsolationError(
        `Cross-tenant access violation in '${operationName}': User tenant '${currentTenant}' cannot access target '${targetInstitutionId}'`
      );
    }
  }

  public static enforceFilter<T extends Record<string, any>>(
    context: TenantContext,
    filters: T
  ): T {
    if (context.isSuperAdmin || context.role === "super_admin") {
      return filters;
    }

    const tenantId = context.institutionId || context.tenantId;
    if (!tenantId) {
      throw new TenantIsolationError("Cannot enforce tenant filter: No active institutionId found");
    }

    return {
      ...filters,
      institutionId: tenantId,
    };
  }
}
