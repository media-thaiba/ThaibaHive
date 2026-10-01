import { hasPermission, getRolePermissions, isValidRole, VALID_STAFF_ROLES, type StaffRole } from "../roles";

describe("5-Tier RBAC & Tenant Boundary Deep Enforcement Test Suite", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe("Tier 1: super_admin (Global Full Access)", () => {
    const role: StaffRole = "super_admin";

    it("should grant access to standard core permissions", () => {
      expect(hasPermission(role, "staff:read")).toBe(true);
      expect(hasPermission(role, "staff:delete")).toBe(true);
      expect(hasPermission(role, "org:manage")).toBe(true);
    });

    it("should grant access to newly persisted operational domains", () => {
      expect(hasPermission(role, "finance:fees:manage")).toBe(true);
      expect(hasPermission(role, "alumni:donations:manage")).toBe(true);
      expect(hasPermission(role, "supply:orders:approve")).toBe(true);
      expect(hasPermission(role, "neuro:clusters:manage")).toBe(true);
      expect(hasPermission(role, "twin:facilities:write")).toBe(true);
      expect(hasPermission(role, "vision:lockdown:execute")).toBe(true);
      expect(hasPermission(role, "database:admin")).toBe(true);
    });

    it("should grant wildcard access to arbitrary dynamic action keys", () => {
      expect(hasPermission(role, "custom:arbitrary:security_override")).toBe(true);
    });
  });

  describe("Tier 2: admin (Institution-Wide Management)", () => {
    const role: StaffRole = "admin";

    it("should grant comprehensive institution management permissions", () => {
      expect(hasPermission(role, "staff:create")).toBe(true);
      expect(hasPermission(role, "staff:delete")).toBe(true);
      expect(hasPermission(role, "finance:fees:manage")).toBe(true);
      expect(hasPermission(role, "supply:vendors:manage")).toBe(true);
      expect(hasPermission(role, "vision:lockdown:execute")).toBe(true);
      expect(hasPermission(role, "neuro:clusters:manage")).toBe(true);
      expect(hasPermission(role, "curriculum:catalog:manage")).toBe(true);
      expect(hasPermission(role, "alumni:chapters:manage")).toBe(true);
    });

    it("should deny unmapped or out-of-scope permissions", () => {
      expect(hasPermission(role, "unregistered:security:bypass")).toBe(false);
    });
  });

  describe("Tier 3: principal (Institutional & Academic Oversight)", () => {
    const role: StaffRole = "principal";

    it("should grant academic, faculty, and institutional governance permissions", () => {
      expect(hasPermission(role, "staff:create")).toBe(true);
      expect(hasPermission(role, "staff:update")).toBe(true);
      expect(hasPermission(role, "exam:approve_marks")).toBe(true);
      expect(hasPermission(role, "exam:publish_results")).toBe(true);
      expect(hasPermission(role, "finance:approve")).toBe(true);
      expect(hasPermission(role, "supply:orders:approve")).toBe(true);
      expect(hasPermission(role, "vision:lockdown:execute")).toBe(true);
      expect(hasPermission(role, "curriculum:plans:approve")).toBe(true);
      expect(hasPermission(role, "alumni:donations:manage")).toBe(true);
    });

    it("should strictly deny low-level system admin mutations (Negative Boundary)", () => {
      expect(hasPermission(role, "staff:delete")).toBe(false);
      expect(hasPermission(role, "database:admin")).toBe(false);
      expect(hasPermission(role, "lakehouse:manage")).toBe(false);
      expect(hasPermission(role, "system:admin")).toBe(false);
      expect(hasPermission(role, "mesh:admin")).toBe(false);
    });
  });

  describe("Tier 4: hod (Departmental Leadership)", () => {
    const role: StaffRole = "hod";

    it("should grant department-level operational and academic permissions", () => {
      expect(hasPermission(role, "staff:read")).toBe(true);
      expect(hasPermission(role, "leaves:approve")).toBe(true);
      expect(hasPermission(role, "tasks:assign")).toBe(true);
      expect(hasPermission(role, "timetables:manage")).toBe(true);
      expect(hasPermission(role, "curriculum:plans:edit")).toBe(true);
      expect(hasPermission(role, "supply:requisitions:create")).toBe(true);
      expect(hasPermission(role, "vision:alerts:view")).toBe(true);
      expect(hasPermission(role, "alumni:jobs:post")).toBe(true);
    });

    it("should strictly deny institution-wide and administrative permissions (Negative Boundary)", () => {
      expect(hasPermission(role, "staff:create")).toBe(false);
      expect(hasPermission(role, "staff:delete")).toBe(false);
      expect(hasPermission(role, "finance:approve")).toBe(false);
      expect(hasPermission(role, "finance:fees:manage")).toBe(false);
      expect(hasPermission(role, "supply:orders:approve")).toBe(false);
      expect(hasPermission(role, "supply:vendors:manage")).toBe(false);
      expect(hasPermission(role, "vision:lockdown:execute")).toBe(false);
      expect(hasPermission(role, "curriculum:catalog:manage")).toBe(false);
      expect(hasPermission(role, "database:admin")).toBe(false);
    });
  });

  describe("Tier 5: staff (Self-Service & Core Operations)", () => {
    const role: StaffRole = "staff";

    it("should grant self-service, routine task, and view permissions", () => {
      expect(hasPermission(role, "staff:read")).toBe(true);
      expect(hasPermission(role, "attendance:read")).toBe(true);
      expect(hasPermission(role, "tasks:read")).toBe(true);
      expect(hasPermission(role, "grievances:create")).toBe(true);
      expect(hasPermission(role, "canteen:create")).toBe(true);
      expect(hasPermission(role, "timetables:read")).toBe(true);
      expect(hasPermission(role, "leaves:delete")).toBe(true);
      expect(hasPermission(role, "profile:write")).toBe(true);
      expect(hasPermission(role, "supply:requisitions:create")).toBe(true);
    });

    it("should strictly deny management and approval actions (Negative Boundary)", () => {
      expect(hasPermission(role, "staff:create")).toBe(false);
      expect(hasPermission(role, "staff:update")).toBe(false);
      expect(hasPermission(role, "staff:delete")).toBe(false);
      expect(hasPermission(role, "leaves:approve")).toBe(false);
      expect(hasPermission(role, "tasks:assign")).toBe(false);
      expect(hasPermission(role, "finance:approve")).toBe(false);
      expect(hasPermission(role, "finance:fees:manage")).toBe(false);
      expect(hasPermission(role, "supply:orders:approve")).toBe(false);
      expect(hasPermission(role, "vision:lockdown:execute")).toBe(false);
      expect(hasPermission(role, "exam:publish_results")).toBe(false);
    });
  });

  describe("Specialized Roles: accounts & purchase", () => {
    it("should grant accounts role deep finance capabilities and block procurement/curriculum", () => {
      const accountsRole: StaffRole = "accounts";
      expect(hasPermission(accountsRole, "finance:fees:manage")).toBe(true);
      expect(hasPermission(accountsRole, "finance:fees:collect")).toBe(true);
      expect(hasPermission(accountsRole, "finance:reconciliation:manage")).toBe(true);
      expect(hasPermission(accountsRole, "accounts:manage")).toBe(true);
      expect(hasPermission(accountsRole, "alumni:donations:collect")).toBe(true);

      // Negative assertions for accounts
      expect(hasPermission(accountsRole, "supply:vendors:manage")).toBe(false);
      expect(hasPermission(accountsRole, "curriculum:catalog:manage")).toBe(false);
      expect(hasPermission(accountsRole, "vision:lockdown:execute")).toBe(false);
    });

    it("should grant purchase role deep supply chain capabilities and block finance reconciliation", () => {
      const purchaseRole: StaffRole = "purchase";
      expect(hasPermission(purchaseRole, "supply:contracts:manage")).toBe(true);
      expect(hasPermission(purchaseRole, "supply:vendors:manage")).toBe(true);
      expect(hasPermission(purchaseRole, "supply:orders:manage")).toBe(true);
      expect(hasPermission(purchaseRole, "supply:orders:approve")).toBe(true);

      // Negative assertions for purchase
      expect(hasPermission(purchaseRole, "finance:reconciliation:manage")).toBe(false);
      expect(hasPermission(purchaseRole, "exam:publish_results")).toBe(false);
      expect(hasPermission(purchaseRole, "vision:lockdown:execute")).toBe(false);
    });
  });

  describe("Sprint-100: Agentic Workflows & Multi-Agent RBAC Permissions Matrix", () => {
    it("super_admin has wildcard access to all 11 agent:* permissions", () => {
      const agentPerms = [
        "agent:workflows:view", "agent:workflows:create", "agent:workflows:execute", "agent:workflows:approve", "agent:workflows:manage",
        "agent:memory:view", "agent:memory:manage", "agent:audit:view", "agent:guardrails:manage", "agent:killswitch:engage", "agent:telemetry:view",
      ];
      for (const p of agentPerms) {
        expect(hasPermission("super_admin", p)).toBe(true);
      }
    });

    it("admin has all 11 agent permissions including killswitch and guardrails", () => {
      expect(hasPermission("admin", "agent:workflows:view")).toBe(true);
      expect(hasPermission("admin", "agent:workflows:create")).toBe(true);
      expect(hasPermission("admin", "agent:workflows:execute")).toBe(true);
      expect(hasPermission("admin", "agent:workflows:approve")).toBe(true);
      expect(hasPermission("admin", "agent:workflows:manage")).toBe(true);
      expect(hasPermission("admin", "agent:memory:view")).toBe(true);
      expect(hasPermission("admin", "agent:memory:manage")).toBe(true);
      expect(hasPermission("admin", "agent:audit:view")).toBe(true);
      expect(hasPermission("admin", "agent:guardrails:manage")).toBe(true);
      expect(hasPermission("admin", "agent:killswitch:engage")).toBe(true);
      expect(hasPermission("admin", "agent:telemetry:view")).toBe(true);
    });

    it("principal has execution, approval, memory, audit and telemetry, but NO killswitch or guardrails manage", () => {
      expect(hasPermission("principal", "agent:workflows:view")).toBe(true);
      expect(hasPermission("principal", "agent:workflows:execute")).toBe(true);
      expect(hasPermission("principal", "agent:workflows:approve")).toBe(true);
      expect(hasPermission("principal", "agent:memory:view")).toBe(true);
      expect(hasPermission("principal", "agent:audit:view")).toBe(true);
      expect(hasPermission("principal", "agent:telemetry:view")).toBe(true);

      // Negative boundaries for principal
      expect(hasPermission("principal", "agent:killswitch:engage")).toBe(false);
      expect(hasPermission("principal", "agent:guardrails:manage")).toBe(false);
      expect(hasPermission("principal", "agent:workflows:manage")).toBe(false);
    });

    it("hod has execution, approval, memory and telemetry, but NO audit view or killswitch", () => {
      expect(hasPermission("hod", "agent:workflows:view")).toBe(true);
      expect(hasPermission("hod", "agent:workflows:execute")).toBe(true);
      expect(hasPermission("hod", "agent:workflows:approve")).toBe(true);
      expect(hasPermission("hod", "agent:memory:view")).toBe(true);
      expect(hasPermission("hod", "agent:telemetry:view")).toBe(true);

      // Negative boundaries for hod
      expect(hasPermission("hod", "agent:killswitch:engage")).toBe(false);
      expect(hasPermission("hod", "agent:guardrails:manage")).toBe(false);
      expect(hasPermission("hod", "agent:workflows:manage")).toBe(false);
      expect(hasPermission("hod", "agent:audit:view")).toBe(false);
    });

    it("staff has only view and execute permissions (Negative boundary on approve & manage)", () => {
      expect(hasPermission("staff", "agent:workflows:view")).toBe(true);
      expect(hasPermission("staff", "agent:workflows:execute")).toBe(true);

      // Negative boundaries for staff
      expect(hasPermission("staff", "agent:workflows:approve")).toBe(false);
      expect(hasPermission("staff", "agent:workflows:manage")).toBe(false);
      expect(hasPermission("staff", "agent:guardrails:manage")).toBe(false);
      expect(hasPermission("staff", "agent:killswitch:engage")).toBe(false);
      expect(hasPermission("staff", "agent:audit:view")).toBe(false);
    });

    it("specialized accounts and purchase roles can approve workflows but cannot manage guardrails or killswitch", () => {
      expect(hasPermission("accounts", "agent:workflows:view")).toBe(true);
      expect(hasPermission("accounts", "agent:workflows:approve")).toBe(true);
      expect(hasPermission("accounts", "agent:killswitch:engage")).toBe(false);

      expect(hasPermission("purchase", "agent:workflows:view")).toBe(true);
      expect(hasPermission("purchase", "agent:workflows:approve")).toBe(true);
      expect(hasPermission("purchase", "agent:killswitch:engage")).toBe(false);
    });
  });

  describe("Role Validation & Anti-Tampering Security Guardrails", () => {
    it("should validate all declared valid staff roles", () => {
      expect(VALID_STAFF_ROLES).toContain("super_admin");
      expect(VALID_STAFF_ROLES).toContain("admin");
      expect(VALID_STAFF_ROLES).toContain("principal");
      expect(VALID_STAFF_ROLES).toContain("hod");
      expect(VALID_STAFF_ROLES).toContain("staff");
      expect(VALID_STAFF_ROLES).toContain("accounts");
      expect(VALID_STAFF_ROLES).toContain("purchase");
      expect(VALID_STAFF_ROLES).toContain("regional_admin");
      expect(VALID_STAFF_ROLES).toContain("regional_auditor");
    });

    it("should reject malicious, invalid, or forged role strings", () => {
      expect(isValidRole("hacker")).toBe(false);
      expect(isValidRole("superadmin")).toBe(false);
      expect(isValidRole("")).toBe(false);
      expect(isValidRole("root")).toBe(false);
    });

    it("should return false and log security alert on invalid role permission check", () => {
      const result = hasPermission("unauthorized_role", "staff:read");
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security Alert] Invalid role attempted in RBAC check: "unauthorized_role"')
      );
    });

    it("should return empty permission list for invalid roles in getRolePermissions", () => {
      expect(getRolePermissions("invalid_role")).toEqual([]);
    });
  });
});
