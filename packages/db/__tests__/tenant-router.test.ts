/**
 * TenantRouter Unit Tests
 * Part of Sprint-035: Global Multi-Tenant Cross-Region Disaster Recovery Drills & Automated Failover Verification
 */

import { TenantRouter, TenantIsolationError } from "../tenant-router";

describe("TenantRouter", () => {
  let mockDefaultDb: any;
  let mockEuDb: any;
  let mockApDb: any;
  let router: TenantRouter;

  beforeEach(() => {
    mockDefaultDb = { id: "default-db" };
    mockEuDb = { id: "eu-db" };
    mockApDb = { id: "ap-db" };

    router = new TenantRouter(mockDefaultDb, {
      defaultRegion: "default",
      enabled: true,
    });

    router.registerRegionPool("eu-central", mockEuDb);
    router.registerRegionPool("ap-south", mockApDb);
  });

  it("should route unregistered tenant to default database pool", () => {
    expect(router.getTenantRegion("unknown-tenant")).toBe("default");
    expect(router.getTenantDb("unknown-tenant")).toBe(mockDefaultDb);
  });

  it("should route registered tenant to specific region database pool", () => {
    router.registerTenantRegion("inst-eu-101", "eu-central");
    router.registerTenantRegion("inst-ap-202", "ap-south");

    expect(router.getTenantRegion("inst-eu-101")).toBe("eu-central");
    expect(router.getTenantDb("inst-eu-101")).toBe(mockEuDb);

    expect(router.getTenantRegion("inst-ap-202")).toBe("ap-south");
    expect(router.getTenantDb("inst-ap-202")).toBe(mockApDb);
  });

  it("should validate tenant isolation and throw on cross-region violation", () => {
    router.registerTenantRegion("inst-eu-101", "eu-central");

    // Accessing assigned region is valid
    expect(router.validateIsolation("inst-eu-101", "eu-central")).toBe(true);

    // Accessing foreign region throws TenantIsolationError
    expect(() => {
      router.validateIsolation("inst-eu-101", "ap-south");
    }).toThrow(TenantIsolationError);
  });

  it("should support dynamic tenant region migration", () => {
    router.registerTenantRegion("inst-303", "us-east");
    expect(router.getTenantRegion("inst-303")).toBe("us-east");

    const migration = router.migrateTenantRegion("inst-303", "eu-central");
    expect(migration.previousRegion).toBe("us-east");
    expect(migration.newRegion).toBe("eu-central");
    expect(router.getTenantRegion("inst-303")).toBe("eu-central");
    expect(router.getTenantDb("inst-303")).toBe(mockEuDb);
  });

  it("should bypass geo-routing when disabled", () => {
    router.registerTenantRegion("inst-eu-101", "eu-central");
    router.setEnabled(false);

    expect(router.getTenantDb("inst-eu-101")).toBe(mockDefaultDb);
    expect(router.validateIsolation("inst-eu-101", "ap-south")).toBe(true);
  });
});
