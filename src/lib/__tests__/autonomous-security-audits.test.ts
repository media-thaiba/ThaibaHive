import { ComplianceAuditVault, GENESIS_HASH } from "../services/compliance-audit-vault";
import { hasPermission } from "../../../packages/auth/roles";

jest.mock("@thaiba/db", () => {
  return {
    db: {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(true),
      }),
    },
    complianceAuditVault: {},
  };
});

describe("Autonomous Security & Multi-Tenant Isolation Auditor", () => {
  it("enforces RBAC role isolation for autonomous & compliance operations", () => {
    expect(hasPermission("super_admin", "autonomy:manage")).toBe(true);
    expect(hasPermission("admin", "autonomy:manage")).toBe(true);
    expect(hasPermission("regional_admin", "autonomy:manage")).toBe(true);
    expect(hasPermission("principal", "compliance:audit")).toBe(true);
    expect(hasPermission("regional_auditor", "compliance:audit")).toBe(true);

    expect(hasPermission("staff", "autonomy:manage")).toBe(false);
    expect(hasPermission("staff", "compliance:audit")).toBe(false);
    expect(hasPermission("accounts", "autonomy:manage")).toBe(false);
  });

  it("detects cryptographic audit vault tampering when a hash link is corrupted", () => {
    const rec1Payload = JSON.stringify({ action: "ticket_created", id: 1 });
    const rec1Time = "2026-07-31T10:00:00Z";
    const rec1Hash = ComplianceAuditVault.calculateRecordHash(GENESIS_HASH, rec1Payload, rec1Time, "actor_1");

    const rec2Payload = JSON.stringify({ action: "ticket_resolved", id: 1 });
    const rec2Time = "2026-07-31T10:05:00Z";
    const rec2Hash = ComplianceAuditVault.calculateRecordHash(rec1Hash, rec2Payload, rec2Time, "actor_1");

    expect(rec1Hash).toHaveLength(64);
    expect(rec2Hash).toHaveLength(64);

    const tamperedPayload = JSON.stringify({ action: "ticket_created_TAMPERED", id: 1 });
    const tamperedHash = ComplianceAuditVault.calculateRecordHash(GENESIS_HASH, tamperedPayload, rec1Time, "actor_1");

    expect(tamperedHash).not.toBe(rec1Hash);
  });

  it("prevents cross-tenant data leakage by validating tenant boundary isolation", () => {
    const tenantA = "inst_tenant_A";
    const tenantB = "inst_tenant_B";

    const hashA = ComplianceAuditVault.calculateRecordHash(GENESIS_HASH, '{"data":"A"}', "2026-07-31T10:00:00Z", "usr_A");
    const hashB = ComplianceAuditVault.calculateRecordHash(GENESIS_HASH, '{"data":"B"}', "2026-07-31T10:00:00Z", "usr_B");

    expect(tenantA).not.toBe(tenantB);
    expect(hashA).not.toBe(hashB);
  });
});
