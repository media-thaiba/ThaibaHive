import { FederatedUserMapper } from '../federated-user-mapper';
import { db } from '@/db';
import { staff, staffInstitutions, staffDepartments, federatedIdentityMappings } from '@/db/schema';
import { SsoAuditLedger } from '../sso-audit-ledger';

jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../sso-audit-ledger', () => ({
  SsoAuditLedger: {
    recordEvent: jest.fn().mockResolvedValue({ id: 'audit-1' }),
  },
}));

describe('FederatedUserMapper - JIT Provisioning & RBAC Escalation Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing mapped user and update lastLoginAt if mapping already exists', async () => {
    const existingMapping = {
      id: 'map_123',
      userId: 'stf_999',
      mappedRole: 'admin',
      institutionId: 'inst_1',
    };

    (db.select as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([existingMapping]),
      }),
    });

    const updateSetMock = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue({}),
    });
    (db.update as jest.Mock).mockReturnValue({
      set: updateSetMock,
    });

    const result = await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst_1',
      providerType: 'SAML',
      providerId: 'saml_azure',
      externalSubjectId: 'azure_sub_123',
      email: 'existing@thaibahive.org',
    });

    expect(result.userId).toBe('stf_999');
    expect(result.role).toBe('admin');
    expect(result.email).toBe('existing@thaibahive.org');
    expect(db.update).toHaveBeenCalledWith(federatedIdentityMappings);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lastLoginAt: expect.any(String),
      })
    );
  });

  it('should prevent privilege escalation by clamping incoming super_admin claim to admin', async () => {
    const selectMock = jest.fn();
    (db.select as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        where: jest.fn().mockImplementation(async () => {
          // No mapping found, no existing staff found, no staffInstitutions found
          return [];
        }),
      })),
    }));

    const insertValuesMock = jest.fn().mockReturnValue({});
    (db.insert as jest.Mock).mockReturnValue({
      values: insertValuesMock,
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst_1',
      institutionId: 'inst_1',
      providerType: 'OIDC',
      providerId: 'oidc_google',
      externalSubjectId: 'google_sub_admin_exploit',
      email: 'attacker@external-idp.com',
      name: 'Privilege Escalation Attempt',
      roles: ['super_admin'],
    });

    expect(result.role).toBe('admin');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Security Alert] JIT mapping blocked privilege escalation attempt to 'super_admin'")
    );

    // Verify staff inserted with admin role and verified email
    expect(db.insert).toHaveBeenCalledWith(staff);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'attacker@external-idp.com',
        role: 'admin',
        emailVerifiedAt: expect.any(String),
      })
    );

    // Verify institution association
    expect(db.insert).toHaveBeenCalledWith(staffInstitutions);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: 'inst_1',
      })
    );

    // Verify JIT provisioning audit log
    expect(SsoAuditLedger.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        institutionId: 'inst_1',
        providerType: 'OIDC',
        eventType: 'jit_provision',
        subjectId: 'google_sub_admin_exploit',
      })
    );

    warnSpy.mockRestore();
  });

  it('should prevent privilege escalation by clamping incoming system claim to admin', async () => {
    (db.select as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation(() => ({
        where: jest.fn().mockImplementation(async () => []),
      })),
    }));

    const insertValuesMock = jest.fn().mockReturnValue({});
    (db.insert as jest.Mock).mockReturnValue({
      values: insertValuesMock,
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst_1',
      providerType: 'SAML',
      externalSubjectId: 'saml_sub_system_exploit',
      email: 'system-impersonator@external-idp.com',
      roles: ['system'],
    });

    expect(result.role).toBe('admin');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Security Alert] JIT mapping blocked privilege escalation attempt to 'system'")
    );

    warnSpy.mockRestore();
  });

  it('should auto-assign department junction record when departmentId is provided', async () => {
    (db.select as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation(() => ({
        where: jest.fn().mockImplementation(async () => []),
      })),
    }));

    const insertValuesMock = jest.fn().mockReturnValue({});
    (db.insert as jest.Mock).mockReturnValue({
      values: insertValuesMock,
    });

    await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst_campus_a',
      institutionId: 'inst_campus_a',
      providerType: 'OIDC',
      providerId: 'oidc_okta',
      externalSubjectId: 'okta_prof_1',
      email: 'professor@thaibahive.org',
      name: 'Prof Turing',
      roles: ['staff'],
      departmentId: 'dept_cs',
    });

    expect(db.insert).toHaveBeenCalledWith(staffDepartments);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 'dept_cs',
        isPrimary: true,
      })
    );
  });

  it('should link mapping and stamp emailVerifiedAt for existing staff user without prior federated mapping', async () => {
    const existingStaff = {
      id: 'stf_local_user',
      email: 'faculty@thaibahive.org',
      role: 'hod',
      emailVerifiedAt: null, // previously unverified
    };

    (db.select as jest.Mock).mockImplementation(() => ({
      from: jest.fn().mockImplementation((table) => ({
        where: jest.fn().mockImplementation(async () => {
          if (table === federatedIdentityMappings) {
            return []; // No existing mapping
          }
          if (table === staff) {
            return [existingStaff]; // Existing local staff
          }
          return [];
        }),
      })),
    }));

    const updateSetMock = jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue({}),
    });
    (db.update as jest.Mock).mockReturnValue({
      set: updateSetMock,
    });

    const insertValuesMock = jest.fn().mockReturnValue({});
    (db.insert as jest.Mock).mockReturnValue({
      values: insertValuesMock,
    });

    const result = await FederatedUserMapper.mapOrCreateUser({
      tenantId: 'inst_1',
      providerType: 'SAML',
      providerId: 'saml_azure',
      externalSubjectId: 'azure_sub_faculty',
      email: 'faculty@thaibahive.org',
      roles: ['staff'],
    });

    expect(result.userId).toBe('stf_local_user');
    expect(result.role).toBe('hod'); // Retains existing role
    expect(db.update).toHaveBeenCalledWith(staff);
    expect(updateSetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerifiedAt: expect.any(String),
      })
    );
    expect(db.insert).toHaveBeenCalledWith(federatedIdentityMappings);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'stf_local_user',
        jitProvisioned: false,
      })
    );
  });
});
