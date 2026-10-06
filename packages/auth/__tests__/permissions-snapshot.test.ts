import { CAPABILITY_REGISTRY } from "../capabilities";
import { rolePermissions, VALID_STAFF_ROLES, DOT_TO_COLON_MAP } from "../roles";
import { describe, it, expect } from "@jest/globals";

describe("Permissions Snapshot & Canonical Format", () => {
  const canonicalRegex = /^[a-z]+\.[a-z]+\.[a-z]+$/;

  it("all CAPABILITY_REGISTRY IDs follow canonical domain.resource.action format", () => {
    for (const cap of CAPABILITY_REGISTRY) {
      expect(cap.id).toMatch(canonicalRegex);
    }
  });

  it("no duplicate capability IDs in registry", () => {
    const ids = CAPABILITY_REGISTRY.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("Tier 1 capabilities have mobileRoute non-null (offlineSupported may be false for network-dependent services)", () => {
    const tier1 = CAPABILITY_REGISTRY.filter((c) => c.tier === 1);
    for (const cap of tier1) {
      expect(cap.mobileRoute).not.toBeNull();
    }
  });

  it("Tier 3 capabilities all have requiresHandoff=true and mobileRoute=null", () => {
    const tier3 = CAPABILITY_REGISTRY.filter((c) => c.tier === 3);
    for (const cap of tier3) {
      expect(cap.requiresHandoff).toBe(true);
      expect(cap.mobileRoute).toBeNull();
    }
  });

  it("Tier 2 capabilities have mobileRoute non-null and requiresHandoff=false", () => {
    const tier2 = CAPABILITY_REGISTRY.filter((c) => c.tier === 2);
    for (const cap of tier2) {
      expect(cap.mobileRoute).not.toBeNull();
      expect(cap.requiresHandoff).toBe(false);
    }
  });

  it("serviceCategory values are valid enum members", () => {
    const validCategories = [
      "canteen",
      "gate-pass",
      "helpdesk",
      "booking",
      "attendance",
      "media",
      "leave",
      "tasks",
    ];

    for (const cap of CAPABILITY_REGISTRY) {
      if (cap.serviceCategory) {
        expect(validCategories).toContain(cap.serviceCategory);
      }
    }
  });

  it("impliedRoles only contains valid staff roles", () => {
    const validRoles = new Set(VALID_STAFF_ROLES);
    for (const cap of CAPABILITY_REGISTRY) {
      if (cap.impliedRoles) {
        for (const role of cap.impliedRoles) {
          expect(validRoles.has(role)).toBe(true);
        }
      }
    }
  });

  it("getQuickActions returns capabilities with quickAction=true for given roles", () => {
    const { getQuickActions } = require("../capabilities");
    const staffQuickActions = getQuickActions(["staff"]);
    for (const cap of staffQuickActions) {
      expect(cap.quickAction).toBe(true);
      expect(cap.impliedRoles?.some((r: string) => ["staff", "super_admin"].includes(r))).toBe(true);
    }
  });

  it("can() and canAny() evaluators work correctly", () => {
    const { can, canAny } = require("../capabilities");

    const userPerms = ["attendance.punch.create", "leave.request.create", "media.asset.capture"];

    expect(can(userPerms, "attendance.punch.create")).toBe(true);
    expect(can(userPerms, "leave.request.approve")).toBe(false);
    expect(canAny(userPerms, ["leave.request.approve", "attendance.punch.create"])).toBe(true);
    expect(canAny(userPerms, ["finance.payroll.manage", "admin.agents.manage"])).toBe(false);

    // Super admin wildcard
    expect(can(["*"], "any.permission")).toBe(true);
    expect(can(new Set(["*"]), "any.permission")).toBe(true);
  });

  it("codemod script exists", () => {
    const fs = require("fs");
    const path = require("path");
    const codemodPath = path.join(__dirname, "..", "..", "..", "scripts", "codemod", "canonical-permissions.ts");
    expect(fs.existsSync(codemodPath)).toBe(true);
  });

  it("audit script exists", () => {
    const fs = require("fs");
    const path = require("path");
    const auditPath = path.join(__dirname, "..", "..", "..", "scripts", "codemod", "audit-permissions.sh");
    expect(fs.existsSync(auditPath)).toBe(true);
  });

  it("manual overrides file exists and is valid JSON", () => {
    const fs = require("fs");
    const path = require("path");
    const overridesPath = path.join(__dirname, "..", "..", "..", "scripts", "codemod", "manual-overrides.json");
    expect(fs.existsSync(overridesPath)).toBe(true);
    const content = fs.readFileSync(overridesPath, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();
  });
});