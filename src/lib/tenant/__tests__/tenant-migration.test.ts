/**
 * Tenant Migration Orchestrator Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantMigrationOrchestrator } from "../tenant-migration";
import { tenantRouter } from "@/db";

describe("TenantMigrationOrchestrator", () => {
  let orchestrator: TenantMigrationOrchestrator;

  beforeEach(() => {
    orchestrator = TenantMigrationOrchestrator.getInstance();
    tenantRouter.registerTenantRegion("inst-mig-1", "us-east");
  });

  it("should successfully migrate a tenant from us-east to eu-central", async () => {
    const res = await orchestrator.migrateTenant("inst-mig-1", "eu-central");

    expect(res.status).toBe("COMPLETED");
    expect(res.sourceRegion).toBe("us-east");
    expect(res.targetRegion).toBe("eu-central");
    expect(res.checksumMatched).toBe(true);
    expect(res.recordsReplicated).toBeGreaterThan(0);
    expect(tenantRouter.getTenantRegion("inst-mig-1")).toBe("eu-central");
  });

  it("should abort and rollback migration if checksum mismatch occurs", async () => {
    tenantRouter.registerTenantRegion("inst-mig-fail", "us-east");

    await expect(
      orchestrator.migrateTenant("inst-mig-fail", "ap-south", {
        simulateChecksumMismatch: true,
      })
    ).rejects.toThrow(/Checksum mismatch/);

    expect(orchestrator.isTenantLocked("inst-mig-fail")).toBe(false);
  });

  it("should reject migration if source and target regions are identical", async () => {
    tenantRouter.registerTenantRegion("inst-same", "eu-central");

    await expect(
      orchestrator.migrateTenant("inst-same", "eu-central")
    ).rejects.toThrow(/already assigned/);
  });
});
