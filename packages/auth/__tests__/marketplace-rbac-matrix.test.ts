import { hasPermission, VALID_STAFF_ROLES, type StaffRole } from "../roles";

const NEW_KEYS = [
  "marketplace:plugins:read",
  "marketplace:plugins:publish",
  "marketplace:plugins:approve",
  "marketplace:reviews:write",
  "workflow_studio:read",
  "workflow_studio:design",
  "workflow_studio:publish",
  "live_stream:start",
  "live_stream:view",
  "live_stream:snippets:read",
] as const;

describe("Phase 10 Marketplace & Live Stream RBAC Matrix", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe("Positive Grants", () => {
    it("super_admin holds every new permission via wildcard", () => {
      for (const key of NEW_KEYS) {
        expect(hasPermission("super_admin", key)).toBe(true);
      }
    });

    it("admin holds the full marketplace and studio management set", () => {
      for (const key of NEW_KEYS) {
        expect(hasPermission("admin", key)).toBe(true);
      }
    });

    it("principal holds design/publish and live stream start/view but not approve", () => {
      expect(hasPermission("principal", "marketplace:plugins:read")).toBe(true);
      expect(hasPermission("principal", "marketplace:reviews:write")).toBe(true);
      expect(hasPermission("principal", "workflow_studio:design")).toBe(true);
      expect(hasPermission("principal", "workflow_studio:publish")).toBe(true);
      expect(hasPermission("principal", "live_stream:start")).toBe(true);
      expect(hasPermission("principal", "live_stream:snippets:read")).toBe(true);
    });

    it("system holds global plugin approval for automated pipelines", () => {
      expect(hasPermission("system", "marketplace:plugins:approve")).toBe(true);
      expect(hasPermission("system", "marketplace:plugins:read")).toBe(false);
      expect(hasPermission("system", "live_stream:start")).toBe(false);
    });

    it("hod holds design + live start/view/snippets but not publish or approve", () => {
      expect(hasPermission("hod", "workflow_studio:design")).toBe(true);
      expect(hasPermission("hod", "live_stream:start")).toBe(true);
      expect(hasPermission("hod", "live_stream:snippets:read")).toBe(true);
      expect(hasPermission("hod", "workflow_studio:publish")).toBe(false);
      expect(hasPermission("hod", "marketplace:plugins:approve")).toBe(false);
      expect(hasPermission("hod", "marketplace:plugins:publish")).toBe(false);
    });

    it("staff holds read, review, view, and snippets but no design/publish/start", () => {
      expect(hasPermission("staff", "marketplace:plugins:read")).toBe(true);
      expect(hasPermission("staff", "marketplace:reviews:write")).toBe(true);
      expect(hasPermission("staff", "workflow_studio:read")).toBe(true);
      expect(hasPermission("staff", "live_stream:view")).toBe(true);
      expect(hasPermission("staff", "live_stream:snippets:read")).toBe(true);
      expect(hasPermission("staff", "workflow_studio:design")).toBe(false);
      expect(hasPermission("staff", "workflow_studio:publish")).toBe(false);
      expect(hasPermission("staff", "live_stream:start")).toBe(false);
      expect(hasPermission("staff", "marketplace:plugins:publish")).toBe(false);
      expect(hasPermission("staff", "marketplace:plugins:approve")).toBe(false);
    });

    it("teacher holds design but no publish, install approvals, or live stream", () => {
      expect(hasPermission("teacher", "workflow_studio:design")).toBe(true);
      expect(hasPermission("teacher", "marketplace:reviews:write")).toBe(true);
      expect(hasPermission("teacher", "workflow_studio:publish")).toBe(false);
      expect(hasPermission("teacher", "marketplace:plugins:approve")).toBe(false);
      expect(hasPermission("teacher", "live_stream:start")).toBe(false);
      expect(hasPermission("teacher", "live_stream:view")).toBe(false);
    });

    it("coordinator and institutional_head hold publish + live start", () => {
      for (const role of ["coordinator", "institutional_head"] as StaffRole[]) {
        expect(hasPermission(role, "marketplace:plugins:publish")).toBe(true);
        expect(hasPermission(role, "workflow_studio:publish")).toBe(true);
        expect(hasPermission(role, "live_stream:start")).toBe(true);
        expect(hasPermission(role, "marketplace:plugins:approve")).toBe(false);
      }
    });

    it("regional_auditor holds review write + live view/snippets but no design", () => {
      expect(hasPermission("regional_auditor", "marketplace:reviews:write")).toBe(true);
      expect(hasPermission("regional_auditor", "live_stream:view")).toBe(true);
      expect(hasPermission("regional_auditor", "live_stream:snippets:read")).toBe(true);
      expect(hasPermission("regional_auditor", "workflow_studio:design")).toBe(false);
    });

    it("accounts and purchase hold read-only catalog and studio access", () => {
      for (const role of ["accounts", "purchase"] as StaffRole[]) {
        expect(hasPermission(role, "marketplace:plugins:read")).toBe(true);
        expect(hasPermission(role, "workflow_studio:read")).toBe(true);
        expect(hasPermission(role, "marketplace:reviews:write")).toBe(false);
        expect(hasPermission(role, "marketplace:plugins:publish")).toBe(false);
        expect(hasPermission(role, "live_stream:start")).toBe(false);
        expect(hasPermission(role, "live_stream:view")).toBe(false);
      }
    });

    it("regional_admin holds read + studio read + live view only", () => {
      expect(hasPermission("regional_admin", "marketplace:plugins:read")).toBe(true);
      expect(hasPermission("regional_admin", "workflow_studio:read")).toBe(true);
      expect(hasPermission("regional_admin", "live_stream:view")).toBe(true);
      expect(hasPermission("regional_admin", "workflow_studio:design")).toBe(false);
      expect(hasPermission("regional_admin", "marketplace:plugins:publish")).toBe(false);
    });

    it("academic_coordinator and exam_coordinator hold read + design only", () => {
      for (const role of ["academic_coordinator", "exam_coordinator"] as StaffRole[]) {
        expect(hasPermission(role, "marketplace:plugins:read")).toBe(true);
        expect(hasPermission(role, "workflow_studio:design")).toBe(true);
        expect(hasPermission(role, "workflow_studio:publish")).toBe(false);
        expect(hasPermission(role, "live_stream:start")).toBe(false);
      }
    });
  });

  describe("Negative Boundaries", () => {
    it("no non-super_admin role holds marketplace:plugins:approve except admin and system", () => {
      const approverRoles: StaffRole[] = ["super_admin", "admin", "system"];
      for (const role of VALID_STAFF_ROLES) {
        const expected = approverRoles.includes(role);
        expect(hasPermission(role, "marketplace:plugins:approve")).toBe(expected);
      }
    });

    it("every new permission key is denied for an invalid role", () => {
      for (const key of NEW_KEYS) {
        expect(hasPermission("parent_hacker", key)).toBe(false);
        expect(hasPermission("", key)).toBe(false);
      }
    });

    it("all new keys resolve for every declared role without throwing", () => {
      for (const role of VALID_STAFF_ROLES) {
        for (const key of NEW_KEYS) {
          expect(typeof hasPermission(role, key)).toBe("boolean");
        }
      }
    });

    it("legacy app-marketplace install keys are unchanged (no near-duplicate created)", () => {
      expect(hasPermission("staff", "marketplace:install")).toBe(true);
      expect(hasPermission("staff", "marketplace:uninstall")).toBe(true);
      expect(hasPermission("accounts", "marketplace:install")).toBe(false);
    });
  });
});
