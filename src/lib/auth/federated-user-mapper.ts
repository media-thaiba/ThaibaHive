import crypto from 'crypto';
import { db } from '@/db';
import { staff, staffInstitutions, staffDepartments, federatedIdentityMappings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { SsoAuditLedger } from './sso-audit-ledger';

export interface FederatedIdentityPayload {
  tenantId: string;
  institutionId?: string;
  providerType: 'SAML' | 'OIDC';
  providerId?: string;
  externalSubjectId: string;
  email: string;
  name?: string;
  roles?: string[];
  departmentId?: string;
  attributes?: Record<string, any>;
}

const GLOBAL_PRIVILEGED_ROLES = new Set(['super_admin', 'system', 'regional_admin', 'regional_auditor']);

export class FederatedUserMapper {
  /**
   * Maps external identity to a local staff user record, auto-provisioning via JIT if necessary.
   * Enforces role escalation guards, auto-associates institution/department junction records,
   * automatically marks email as verified, and creates immutable audit entries.
   */
  public static async mapOrCreateUser(payload: FederatedIdentityPayload): Promise<{ userId: string; role: string; email: string }> {
    const institutionId = payload.institutionId || payload.tenantId;

    // Check if mapping exists
    const [existingMapping] = await db
      .select()
      .from(federatedIdentityMappings)
      .where(
        and(
          eq(federatedIdentityMappings.institutionId, institutionId),
          eq(federatedIdentityMappings.providerType, payload.providerType),
          eq(federatedIdentityMappings.externalSubjectId, payload.externalSubjectId)
        )
      );

    if (existingMapping) {
      // Update last login
      await db
        .update(federatedIdentityMappings)
        .set({ lastLoginAt: new Date().toISOString() })
        .where(eq(federatedIdentityMappings.id, existingMapping.id));

      return {
        userId: existingMapping.userId,
        role: existingMapping.mappedRole,
        email: payload.email,
      };
    }

    // Role Mapping & Escalation Guard
    let rawRole = payload.roles && payload.roles.length > 0 ? payload.roles[0] : 'staff';

    // Strict Negative Boundary: Block external IdP claims from unilaterally escalating to super_admin, system, or regional roles
    if (GLOBAL_PRIVILEGED_ROLES.has(rawRole)) {
      console.warn(`[Security Alert] JIT mapping blocked privilege escalation attempt to '${rawRole}' for subject ${payload.externalSubjectId}`);
      rawRole = 'admin';
    }

    // Check if staff email exists
    const [existingStaff] = await db.select().from(staff).where(eq(staff.email, payload.email));

    let targetUserId: string;
    let mappedRole = rawRole;

    if (existingStaff) {
      // Prevent cross-tenant account takeover or hijacking of global super_admin accounts via email collision (B-04)
      if (GLOBAL_PRIVILEGED_ROLES.has(existingStaff.role)) {
        throw new Error(`Security Violation: Privileged global account (${existingStaff.role}) cannot be auto-linked via tenant SSO`);
      }

      const existingInstMemberships = await db
        .select()
        .from(staffInstitutions)
        .where(eq(staffInstitutions.staffId, existingStaff.id));

      if (
        Array.isArray(existingInstMemberships) &&
        existingInstMemberships.length > 0 &&
        !existingInstMemberships.some((m: { institutionId: string }) => m.institutionId === institutionId)
      ) {
        throw new Error('Security Violation: Cross-tenant account linking forbidden for existing staff member');
      }

      targetUserId = existingStaff.id;
      mappedRole = existingStaff.role || mappedRole;
      // Federated IdP already proved email ownership — auto-verify on first SSO login
      if (!existingStaff.emailVerifiedAt) {
        await db.update(staff).set({
          emailVerifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).where(eq(staff.id, existingStaff.id));
      }
    } else {
      // JIT Provisioning
      targetUserId = `stf_${crypto.randomUUID()}`;
      const nameParts = (payload.name || 'Federated User').split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'User';

      await db.insert(staff).values({
        id: targetUserId,
        email: payload.email,
        employeeId: `EMP-${Date.now().toString().slice(-6)}`,
        firstName,
        lastName,
        role: mappedRole,
        isActive: true,
        emailVerifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Auto-assign staff to institution
      const [existingStaffInst] = await db
        .select()
        .from(staffInstitutions)
        .where(and(eq(staffInstitutions.staffId, targetUserId), eq(staffInstitutions.institutionId, institutionId)));

      if (!existingStaffInst) {
        await db.insert(staffInstitutions).values({
          id: `si_${crypto.randomUUID()}`,
          staffId: targetUserId,
          institutionId,
        });
      }

      // Auto-assign department if specified
      const deptId = payload.departmentId || payload.attributes?.departmentId;
      if (deptId) {
        try {
          await db.insert(staffDepartments).values({
            id: `sd_${crypto.randomUUID()}`,
            staffId: targetUserId,
            departmentId: String(deptId),
            isPrimary: true,
          });
        } catch {
          // Non-fatal if department does not exist in dev/test
        }
      }

      // Record JIT provisioning audit log
      await SsoAuditLedger.recordEvent({
        institutionId,
        providerId: payload.providerId,
        providerType: payload.providerType,
        eventType: 'jit_provision',
        subjectId: payload.externalSubjectId,
      }).catch(() => {});
    }

    // Insert federated identity mapping
    await db.insert(federatedIdentityMappings).values({
      id: `map_${crypto.randomUUID()}`,
      tenantId: institutionId,
      institutionId,
      userId: targetUserId,
      providerType: payload.providerType,
      providerId: payload.providerId,
      externalSubjectId: payload.externalSubjectId,
      externalEmail: payload.email,
      mappedRole,
      attributesJson: JSON.stringify(payload.attributes || {}),
      jitProvisioned: !existingStaff,
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return {
      userId: targetUserId,
      role: mappedRole,
      email: payload.email,
    };
  }
}
