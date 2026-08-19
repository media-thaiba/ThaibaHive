import { FederatedAuditAggregator } from "../federated/federated-audit-aggregator";
import { CrossTenantRoleMapper } from "../federated/cross-tenant-role-mapper";

describe("FED-004: Federated Audit Aggregation & Role Mapping Test Suite", () => {
  it("records and aggregates compliance audit logs across tenants", () => {
    const aggregator = new FederatedAuditAggregator();

    aggregator.recordAuditLog("tenant-north", "POLICY_UPDATE", "user-01", "INFO", { policyId: "pol-1" });
    aggregator.recordAuditLog("tenant-south", "SECURITY_ALERT", "user-02", "CRITICAL", { reason: "unauthorized" });
    aggregator.recordAuditLog("tenant-north", "DATA_EXPORT", "user-03", "WARNING", { rows: 500 });

    const allLogs = aggregator.queryAuditLogs();
    expect(allLogs.length).toBe(3);

    const criticalLogs = aggregator.queryAuditLogs({ severity: "CRITICAL" });
    expect(criticalLogs.length).toBe(1);
    expect(criticalLogs[0].tenantId).toBe("tenant-south");

    const report = aggregator.aggregateComplianceReport(["tenant-north", "tenant-south"]);
    expect(report.totalEvents).toBe(3);
    expect(report.severityCounts.CRITICAL).toBe(1);
    expect(report.tenantBreakdown["tenant-north"]).toBe(2);
  });

  it("masks sensitive information when recording anonymized audit logs", () => {
    const aggregator = new FederatedAuditAggregator();

    const log = aggregator.recordAuditLog(
      "tenant-west",
      "USER_PROFILE_VIEW",
      "staff-john-doe",
      "AUDIT",
      { email: "john@example.com", phone: "+1234567890", role: "admin" },
      "inst-01",
      true // anonymize
    );

    expect(log.actorId).not.toBe("staff-john-doe");
    expect(log.details.email).toBe("[REDACTED]");
    expect(log.details.phone).toBe("[REDACTED]");
    expect(log.details.role).toBe("admin");
  });

  it("maps roles and permissions across tenants", () => {
    const mapper = new CrossTenantRoleMapper();

    mapper.addMapping("tenant-north", "tenant-south", "principal", "regional_auditor", [
      "federated:policies",
      "federated:audit",
    ]);

    const mapped = mapper.getMappedRole("tenant-north", "tenant-south", "principal");
    expect(mapped).not.toBeNull();
    expect(mapped?.targetRole).toBe("regional_auditor");

    const perms = mapper.getEffectivePermissions("tenant-north", "tenant-south", "principal");
    expect(perms).toContain("federated:policies");
    expect(perms).toContain("federated:audit");
  });
});
