import { createMobileNonce, verifyMobileNonce } from "../mobile-nonce-service";

describe("Mobile Nonce Authentication Service", () => {
  it("should create a valid short-lived mobile nonce JWT", async () => {
    const res = await createMobileNonce({
      staffId: "usr_101",
      email: "test@thaibahive.edu",
      role: "staff",
      targetUrl: "/finance/approvals",
    });

    expect(res.nonce).toBeDefined();
    expect(typeof res.nonce).toBe("string");
    expect(res.expiresAt).toBeDefined();
    expect(res.redirectUrl).toContain("redirect=%2Ffinance%2Fapprovals");
  });

  it("should verify mobile nonce JWT and extract claims", async () => {
    const res = await createMobileNonce({
      staffId: "usr_102",
      email: "staff@thaibahive.edu",
      role: "admin",
      employeeId: "EMP-002",
      name: "Admin User",
      tokenVersion: 2,
    });

    const payload = await verifyMobileNonce(res.nonce);
    expect(payload).not.toBeNull();
    expect(payload?.staffId).toBe("usr_102");
    expect(payload?.email).toBe("staff@thaibahive.edu");
    expect(payload?.role).toBe("admin");
    expect(payload?.employeeId).toBe("EMP-002");
    expect(payload?.name).toBe("Admin User");
    expect(payload?.tokenVersion).toBe(2);
    expect(payload?.jti).toBeDefined();
  });

  it("should reject non-existent or invalid nonces", async () => {
    const payload = await verifyMobileNonce("invalid_nonce_12345");
    expect(payload).toBeNull();
  });
});
