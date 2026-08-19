import crypto from 'crypto';
import { db } from '@/db';
import { staff, federatedIdentityMappings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface FederatedIdentityPayload {
  tenantId: string;
  providerType: 'SAML' | 'OIDC';
  externalSubjectId: string;
  email: string;
  name?: string;
  roles?: string[];
  attributes?: Record<string, any>;
}

export class FederatedUserMapper {
  /**
   * Maps external identity to a local staff user record, auto-provisioning via JIT if necessary.
   */
  public static async mapOrCreateUser(payload: FederatedIdentityPayload): Promise<{ userId: string; role: string; email: string }> {
    // Check if mapping exists
    const [existingMapping] = await db
      .select()
      .from(federatedIdentityMappings)
      .where(
        and(
          eq(federatedIdentityMappings.tenantId, payload.tenantId),
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

    // Check if staff email exists
    const [existingStaff] = await db.select().from(staff).where(eq(staff.email, payload.email));

    let targetUserId: string;
    let mappedRole = payload.roles && payload.roles.length > 0 ? payload.roles[0] : 'staff';

    if (existingStaff) {
      targetUserId = existingStaff.id;
      mappedRole = existingStaff.role || mappedRole;
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Insert federated identity mapping
    await db.insert(federatedIdentityMappings).values({
      id: `map_${crypto.randomUUID()}`,
      tenantId: payload.tenantId,
      userId: targetUserId,
      providerType: payload.providerType,
      externalSubjectId: payload.externalSubjectId,
      mappedRole,
      attributesJson: JSON.stringify(payload.attributes || {}),
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
