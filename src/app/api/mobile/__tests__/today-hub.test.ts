import {
  buildTodayHubManifest,
  MOBILE_ROUTES,
  TODAY_HUB_VERSION,
} from "@/lib/mobile/mobile-serializer";
import {
  setTenantFeatureFlag,
  clearTenantFeatureOverrides,
  isTodayHubEnabled,
} from "@/lib/features";
import { hasPermission } from "@thaiba/auth";
import { VALID_STAFF_ROLES } from "@thaiba/auth/roles";

describe("Today Hub SDUI Manifest Builder", () => {
  it("builds a versioned manifest with sections in priority order", () => {
    const manifest = buildTodayHubManifest({ role: "admin" });

    expect(manifest.version).toBe(TODAY_HUB_VERSION);
    expect(manifest.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(manifest.sections.map((s) => s.id)).toEqual([
      "urgent_actions",
      "attendance",
      "quick_actions",
      "timeline",
      "circular",
    ]);
    expect(manifest.sections.map((s) => s.priority)).toEqual([1, 2, 3, 4, 5]);
    expect(manifest.sections.every((s) => typeof s.enabled === "boolean")).toBe(true);
  });

  it("returns non-empty quick actions for staff with curated 4 first", () => {
    const manifest = buildTodayHubManifest({ role: "staff" });

    expect(manifest.quickActions.length).toBeGreaterThan(0);
    expect(manifest.quickActions.length).toBeLessThanOrEqual(8);
    expect(manifest.quickActions.slice(0, 4).map((a) => a.id)).toEqual([
      "canteen.order.create",
      "helpdesk.ticket.create",
      "booking.resource.create",
      "visitor.pass.create",
    ]);
    expect(
      manifest.sections.find((s) => s.id === "quick_actions")?.enabled
    ).toBe(true);
  });

  it("emits only routes that exist in the GoRouter table", () => {
    for (const role of ["staff", "teacher", "admin", "principal", "super_admin"]) {
      const manifest = buildTodayHubManifest({ role });
      for (const action of manifest.quickActions) {
        expect(MOBILE_ROUTES.has(action.route)).toBe(true);
        expect(action.route).not.toContain(":");
      }
    }
  });

  it("drops quick actions whose registry mobileRoute is stale (D16*)", () => {
    const manifest = buildTodayHubManifest({ role: "super_admin" });
    const ids = manifest.quickActions.map((a) => a.id);

    // /media/capture and /media/upload are not registered mobile routes
    expect(ids).not.toContain("media.asset.capture");
    expect(ids).not.toContain("media.asset.upload");
  });

  it("never emits requiresWebHandoff quick actions", () => {
    const manifest = buildTodayHubManifest({ role: "super_admin" });
    expect(
      manifest.quickActions.every((a) => a.requiresWebHandoff === false)
    ).toBe(true);
  });

  it("gates timeline and circular sections per role permissions for every valid role", () => {
    for (const role of VALID_STAFF_ROLES) {
      const manifest = buildTodayHubManifest({ role });
      const timeline = manifest.sections.find((s) => s.id === "timeline");
      const circular = manifest.sections.find((s) => s.id === "circular");

      expect(timeline?.enabled).toBe(hasPermission(role, "reports:read"));
      expect(circular?.enabled).toBe(hasPermission(role, "circulars:read"));
      expect(
        manifest.sections.find((s) => s.id === "urgent_actions")?.enabled
      ).toBe(true);
      expect(
        manifest.sections.find((s) => s.id === "attendance")?.enabled
      ).toBe(true);
    }
  });

  it("clamps requested manifest version to the supported range", () => {
    expect(buildTodayHubManifest({ role: "staff", requestedVersion: 99 }).version).toBe(
      TODAY_HUB_VERSION
    );
    expect(buildTodayHubManifest({ role: "staff", requestedVersion: 0 }).version).toBe(1);
    expect(buildTodayHubManifest({ role: "staff", requestedVersion: NaN }).version).toBe(
      TODAY_HUB_VERSION
    );
  });

  it("keeps the serialized manifest under the 5KB response budget", () => {
    const jsonStr = JSON.stringify(buildTodayHubManifest({ role: "super_admin" }));
    const sizeInKB = Buffer.byteLength(jsonStr, "utf-8") / 1024;
    expect(sizeInKB).toBeLessThan(5);
  });
});

describe("Today Hub feature flag", () => {
  afterEach(() => {
    clearTenantFeatureOverrides();
  });

  it("defaults to enabled", () => {
    expect(isTodayHubEnabled()).toBe(true);
    expect(isTodayHubEnabled("inst_default")).toBe(true);
  });

  it("respects tenant-specific disablement", () => {
    setTenantFeatureFlag("inst_alpha", "today_hub", false);
    expect(isTodayHubEnabled("inst_alpha")).toBe(false);
    expect(isTodayHubEnabled("inst_beta")).toBe(true);
  });
});
