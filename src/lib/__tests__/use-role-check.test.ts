import { useRoleCheck } from "../hooks/use-role-check";

describe("useRoleCheck Hook", () => {
  it("should return false for all checks when role is null or undefined", () => {
    const { can, isOneOf, isAdmin, isSuperAdmin, isValid } = useRoleCheck(null);
    expect(isValid).toBe(false);
    expect(can("staff:read")).toBe(false);
    expect(isOneOf("admin", "principal")).toBe(false);
    expect(isAdmin).toBe(false);
    expect(isSuperAdmin).toBe(false);
  });

  it("should evaluate super_admin correctly", () => {
    const { can, isAdmin, isSuperAdmin, isValid } = useRoleCheck("super_admin");
    expect(isValid).toBe(true);
    expect(isSuperAdmin).toBe(true);
    expect(isAdmin).toBe(true);
    expect(can("anything")).toBe(true);
  });

  it("should evaluate admin correctly", () => {
    const { can, isAdmin, isSuperAdmin, isOneOf, isValid } = useRoleCheck("admin");
    expect(isValid).toBe(true);
    expect(isSuperAdmin).toBe(false);
    expect(isAdmin).toBe(true);
    expect(can("staff:create")).toBe(true);
    expect(isOneOf("admin", "principal")).toBe(true);
  });

  it("should evaluate staff correctly", () => {
    const { can, isAdmin, isStaff, isOneOf, isValid } = useRoleCheck("staff");
    expect(isValid).toBe(true);
    expect(isStaff).toBe(true);
    expect(isAdmin).toBe(false);
    expect(can("staff:create")).toBe(false);
    expect(can("announcements:read")).toBe(true);
    expect(isOneOf("hod", "staff")).toBe(true);
  });

  it("should reject invalid role strings safely", () => {
    const { can, isValid, isAdmin } = useRoleCheck("fake_role_123");
    expect(isValid).toBe(false);
    expect(isAdmin).toBe(false);
    expect(can("staff:read")).toBe(false);
  });
});
