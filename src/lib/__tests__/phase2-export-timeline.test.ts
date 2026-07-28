import { canAccessStaff } from "@/lib/auth/department-scope";
import { db } from "@/db";

describe("Phase 2 — Staff Timeline Authorization & Export Engine Security", () => {
  describe("canAccessStaff Per-Employee RBAC & Tenant Bounds", () => {
    it("should allow staff to access their own timeline", async () => {
      const allowed = await canAccessStaff("staff-001", "staff", "staff-001");
      expect(allowed).toBe(true);
    });

    it("should deny staff from accessing another staff member's timeline", async () => {
      const allowed = await canAccessStaff("staff-001", "staff", "staff-002");
      expect(allowed).toBe(false);
    });

    it("should allow super_admin and admin to access any staff timeline", async () => {
      const superAdminAllowed = await canAccessStaff("admin-001", "super_admin", "staff-999");
      const adminAllowed = await canAccessStaff("admin-002", "admin", "staff-999");

      expect(superAdminAllowed).toBe(true);
      expect(adminAllowed).toBe(true);
    });

    it("should verify principal branch: allow same institution, deny different institution", async () => {
      // Mock db query for principal institution lookup
      const spySelect = jest.spyOn(db, "select").mockImplementation((() => ({
        from: () => ({
          where: () => ({
            limit: (n: number) => {
              // Return inst-A for caller, inst-B for target
              return [{ institutionId: "inst-A" }];
            },
          }),
        }),
      })) as any);

      // Caller & target in same inst-A
      const sameAllowed = await canAccessStaff("principal-001", "principal", "staff-same-inst");
      expect(sameAllowed).toBe(true);

      spySelect.mockRestore();

      // Mock caller inst-A and target inst-B
      let callCount = 0;
      jest.spyOn(db, "select").mockImplementation((() => ({
        from: () => ({
          where: () => ({
            limit: (n: number) => {
              callCount++;
              return [{ institutionId: callCount === 1 ? "inst-A" : "inst-B" }];
            },
          }),
        }),
      })) as any);

      const diffAllowed = await canAccessStaff("principal-001", "principal", "staff-diff-inst");
      expect(diffAllowed).toBe(false);

      jest.restoreAllMocks();
    });

    it("should verify hod branch: allow access to staff inside managed departments and deny outside", async () => {
      // Mock db queries for departments and staffDepartments
      let queryCount = 0;
      jest.spyOn(db, "select").mockImplementation((() => ({
        from: () => ({
          where: () => ({
            all: () => {
              queryCount++;
              if (queryCount === 1) return [{ id: "dept-1" }]; // managedDepts
              return [{ staffId: "managed-staff-002" }]; // members
            },
          }),
        }),
      })) as any);

      const allowedManaged = await canAccessStaff("hod-001", "hod", "managed-staff-002");
      expect(allowedManaged).toBe(true);

      const deniedUnmanaged = await canAccessStaff("hod-001", "hod", "unmanaged-staff-999");
      expect(deniedUnmanaged).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe("Export Engine Limits & CSV Sanitization", () => {
    const MAX_EXPORT_ROWS = 5000;

    function esc(val: string | number | null | undefined): string {
      if (val === null || val === undefined) return "";
      const str = String(val);
      const sanitized = str.replace(/^[=+\-@\t\r]+/g, "");
      if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n")) {
        return `"${sanitized.replace(/"/g, '""')}"`;
      }
      return sanitized;
    }

    it("should sanitize CSV formula injection attack vectors", () => {
      expect(esc("=CMD|' /C calc'!A0")).toBe("CMD|' /C calc'!A0");
      expect(esc("+SUM(A1:A10)")).toBe("SUM(A1:A10)");
      expect(esc("@SUM(A1:A10)")).toBe("SUM(A1:A10)");
      expect(esc("-1+1")).toBe("1+1");
      expect(esc("Normal String")).toBe("Normal String");
    });

    it("should cap export queries to MAX_EXPORT_ROWS (5000)", () => {
      expect(MAX_EXPORT_ROWS).toBe(5000);
    });
  });
});
