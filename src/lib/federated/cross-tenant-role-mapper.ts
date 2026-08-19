export interface RoleMappingRule {
  id: string;
  sourceTenantId: string;
  targetTenantId: string;
  sourceRole: string;
  targetRole: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export class CrossTenantRoleMapper {
  private mappings: Map<string, RoleMappingRule> = new Map();

  public addMapping(
    sourceTenantId: string,
    targetTenantId: string,
    sourceRole: string,
    targetRole: string,
    permissions: string[]
  ): RoleMappingRule {
    const id = `map_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const rule: RoleMappingRule = {
      id,
      sourceTenantId,
      targetTenantId,
      sourceRole,
      targetRole,
      permissions,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const key = `${sourceTenantId}:${targetTenantId}:${sourceRole}`;
    this.mappings.set(key, rule);
    return rule;
  }

  public getMappedRole(sourceTenantId: string, targetTenantId: string, sourceRole: string): RoleMappingRule | null {
    const key = `${sourceTenantId}:${targetTenantId}:${sourceRole}`;
    const rule = this.mappings.get(key);
    if (rule && rule.isActive) {
      return rule;
    }
    return null;
  }

  public getEffectivePermissions(sourceTenantId: string, targetTenantId: string, sourceRole: string): string[] {
    const rule = this.getMappedRole(sourceTenantId, targetTenantId, sourceRole);
    return rule ? rule.permissions : [];
  }

  public getAllMappings(): RoleMappingRule[] {
    return Array.from(this.mappings.values());
  }

  /** createMapping — validates and records a cross-tenant role mapping with privilege escalation guard */
  public createMapping(params: {
    sourceInstitutionId: string;
    targetInstitutionId: string;
    sourceRole: string;
    targetRole: string;
    permissions: string[];
  }): { mapping?: RoleMappingRule; isValid: boolean; validationError?: string } {
    const FORBIDDEN_CROSS_TENANT_ROLES = ["super_admin"];

    if (FORBIDDEN_CROSS_TENANT_ROLES.includes(params.targetRole)) {
      return {
        isValid: false,
        validationError: `Cross-tenant mapping to '${params.targetRole}' role is not permitted. Privilege escalation prevented.`,
      };
    }

    const mapping = this.addMapping(
      params.sourceInstitutionId,
      params.targetInstitutionId,
      params.sourceRole,
      params.targetRole,
      params.permissions
    );

    return { mapping, isValid: true };
  }

  public deactivateMapping(id: string): boolean {
    for (const rule of this.mappings.values()) {
      if (rule.id === id) {
        rule.isActive = false;
        return true;
      }
    }
    return false;
  }
}
