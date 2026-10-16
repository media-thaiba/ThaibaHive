/**
 * FEATURE_PRESENCE_TRACKING_TENANTS env rollout — durable per-tenant flag
 * persistence (survives restarts, unlike the in-memory override registry).
 * The env var is read at module load, so each case resets the module graph.
 */
const ENV_KEY = "FEATURE_PRESENCE_TRACKING_TENANTS";

type FeaturesModule = typeof import("@/lib/features");

function loadFeatures(): FeaturesModule {
  let mod: FeaturesModule | undefined;
  jest.isolateModules(() => {
    mod = require("@/lib/features") as FeaturesModule;
  });
  return mod!;
}

describe("FEATURE_PRESENCE_TRACKING_TENANTS env rollout", () => {
  beforeEach(() => {
    delete process.env[ENV_KEY];
    jest.resetModules();
  });

  afterAll(() => {
    delete process.env[ENV_KEY];
  });

  it("keeps presence_tracking off by default for every tenant", () => {
    const features = loadFeatures();
    expect(features.isPresenceTrackingEnabled("inst-tps-majhi")).toBe(false);
    expect(features.isPresenceTrackingEnabled("inst-other")).toBe(false);
  });

  it("enables presence_tracking only for allowlisted tenants", () => {
    process.env[ENV_KEY] = "inst-tps-majhi,inst-second";
    const features = loadFeatures();
    expect(features.isPresenceTrackingEnabled("inst-tps-majhi")).toBe(true);
    expect(features.isPresenceTrackingEnabled("inst-second")).toBe(true);
    expect(features.isPresenceTrackingEnabled("inst-other")).toBe(false);
  });

  it("supports the * wildcard for global enablement", () => {
    process.env[ENV_KEY] = "*";
    const features = loadFeatures();
    expect(features.isPresenceTrackingEnabled("any-tenant")).toBe(true);
  });

  it("ignores blank and whitespace-only entries", () => {
    process.env[ENV_KEY] = "  , , ";
    const features = loadFeatures();
    expect(features.isPresenceTrackingEnabled("inst-tps-majhi")).toBe(false);
  });

  it("in-memory overrides still win over the env rollout (test scoping)", () => {
    process.env[ENV_KEY] = "inst-tps-majhi";
    const features = loadFeatures();
    features.setTenantFeatureFlag("inst-tps-majhi", "presence_tracking", false);
    expect(features.isPresenceTrackingEnabled("inst-tps-majhi")).toBe(false);
    features.clearTenantFeatureOverrides();
  });

  it("env rollout does not affect unrelated feature flags", () => {
    process.env[ENV_KEY] = "inst-tps-majhi";
    const features = loadFeatures();
    expect(features.getFeatureFlags("inst-tps-majhi").sis_sync).toBe(
      features.getFeatureFlags("inst-other").sis_sync
    );
  });
});
