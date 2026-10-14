import { DEFAULT_FLAGS, isSisSyncEnabled, setTenantFeatureFlag, clearTenantFeatureOverrides } from "../../features";

describe("Gate 19: Feature Flag Quality Gate for Phase 11", () => {
  beforeEach(() => {
    clearTenantFeatureOverrides();
  });

  afterEach(() => {
    clearTenantFeatureOverrides();
  });

  it("verifies sis_sync defaults to false", () => {
    // Unless FEATURE_SIS_SYNC=true is set in env, it must default to false
    if (process.env.FEATURE_SIS_SYNC !== "true") {
      expect(DEFAULT_FLAGS.sis_sync).toBe(false);
      expect(isSisSyncEnabled()).toBe(false);
    }
  });

  it("allows tenant-specific override for staged canary rollouts", () => {
    const tenantId = "inst_tenant_canary_01";
    expect(isSisSyncEnabled(tenantId)).toBe(false);

    setTenantFeatureFlag(tenantId, "sis_sync", true);
    expect(isSisSyncEnabled(tenantId)).toBe(true);

    // Other tenants remain disabled
    expect(isSisSyncEnabled("inst_other_02")).toBe(false);

    clearTenantFeatureOverrides(tenantId);
    expect(isSisSyncEnabled(tenantId)).toBe(false);
  });
});
