import {
  CAPABILITY_REGISTRY,
  getCapability,
  isMobileEligible,
  requiresWebHandoff,
  getCapabilitiesByTier,
  getQuickActions,
  getCapabilitiesForServiceCategory,
  can,
  canAny,
} from "../capabilities";

describe("Capability Registry & Taxonomy Engine", () => {
  it("contains valid, non-empty capability definitions", () => {
    expect(CAPABILITY_REGISTRY.length).toBeGreaterThan(15);
  });

  it("enforces canonical domain.resource.action taxonomy on all entries", () => {
    const taxonomyRegex = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;
    for (const cap of CAPABILITY_REGISTRY) {
      expect(cap.id).toMatch(taxonomyRegex);
      expect(cap.label.length).toBeGreaterThan(2);
      expect(cap.description.length).toBeGreaterThan(5);
      expect([1, 2, 3]).toContain(cap.tier);
      expect(typeof cap.offlineSupported).toBe("boolean");
      expect(typeof cap.requiresHandoff).toBe("boolean");
    }
  });

  it("contains zero duplicate capability IDs", () => {
    const ids = CAPABILITY_REGISTRY.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("correctly identifies mobile eligibility by tier", () => {
    // Tier 1 (Native) -> Mobile Eligible
    expect(isMobileEligible("attendance.punch.create")).toBe(true);
    // Tier 2 (Quick View) -> Mobile Eligible
    expect(isMobileEligible("leave.request.approve")).toBe(true);
    // Tier 3 (Web Only) -> Not Mobile Eligible
    expect(isMobileEligible("finance.payroll.manage")).toBe(false);
    expect(isMobileEligible("admin.agents.manage")).toBe(false);
  });

  it("correctly flags Tier 3 Web Handoff requirements", () => {
    expect(requiresWebHandoff("finance.payroll.manage")).toBe(true);
    expect(requiresWebHandoff("exam.marks.enter")).toBe(true);
    expect(requiresWebHandoff("attendance.punch.create")).toBe(false);
  });

  it("filters capabilities by tier properly", () => {
    const tier1 = getCapabilitiesByTier(1);
    const tier2 = getCapabilitiesByTier(2);
    const tier3 = getCapabilitiesByTier(3);

    expect(tier1.every((c) => c.tier === 1)).toBe(true);
    expect(tier2.every((c) => c.tier === 2)).toBe(true);
    expect(tier3.every((c) => c.tier === 3)).toBe(true);
    expect(tier1.length + tier2.length + tier3.length).toBe(CAPABILITY_REGISTRY.length);
  });

  it("returns quick actions for given roles", () => {
    const staffActions = getQuickActions(["staff"]);
    expect(staffActions.some((a) => a.id === "attendance.punch.create")).toBe(true);
    expect(staffActions.some((a) => a.id === "leave.request.create")).toBe(true);

    const hodActions = getQuickActions(["hod"]);
    expect(hodActions.some((a) => a.id === "leave.request.approve")).toBe(true);

    const superAdminActions = getQuickActions(["super_admin"]);
    expect(superAdminActions.length).toBeGreaterThan(5);
  });

  it("retrieves capabilities by service category", () => {
    const canteenCaps = getCapabilitiesForServiceCategory("canteen");
    expect(canteenCaps.some((c) => c.id === "canteen.order.create")).toBe(true);

    const helpdeskCaps = getCapabilitiesForServiceCategory("helpdesk");
    expect(helpdeskCaps.some((c) => c.id === "helpdesk.ticket.create")).toBe(true);
  });

  it("evaluates single capability permissions correctly with can()", () => {
    const userPerms = ["attendance.punch.create", "leave.request.create"];
    expect(can(userPerms, "attendance.punch.create")).toBe(true);
    expect(can(userPerms, "leave.request.create")).toBe(true);
    expect(can(userPerms, "finance.payroll.manage")).toBe(false);

    // Wildcard
    expect(can(["*"], "finance.payroll.manage")).toBe(true);
  });

  it("evaluates multi-capability permissions with canAny()", () => {
    const userPerms = ["media.asset.capture"];
    expect(canAny(userPerms, ["media.asset.capture", "media.asset.upload"])).toBe(true);
    expect(canAny(userPerms, ["finance.payroll.manage", "admin.agents.manage"])).toBe(false);
  });

  it("retrieves specific capability by id", () => {
    const cap = getCapability("attendance.punch.create");
    expect(cap).toBeDefined();
    expect(cap?.domain).toBe("attendance");
    expect(cap?.tier).toBe(1);

    expect(getCapability("non.existent.capability")).toBeUndefined();
  });
});
