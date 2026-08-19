import { createMobileNonce, verifyAndBurnNonce } from "../mobile-nonce-service";

describe("Mobile Nonce Authentication Service", () => {
  it("should create a valid short-lived mobile nonce", async () => {
    const res = await createMobileNonce({
      staffId: "usr_101",
      email: "test@thaibahive.edu",
      role: "staff",
      targetUrl: "/finance/approvals",
    });

    expect(res.nonce).toBeDefined();
    expect(res.nonce.startsWith("mhn_")).toBe(true);
    expect(res.expiresAt).toBeDefined();
    expect(res.redirectUrl).toContain("nonce=mhn_");
  });

  it("should verify and burn (delete) nonce on single use", async () => {
    const res = await createMobileNonce({
      staffId: "usr_102",
      email: "staff@thaibahive.edu",
      role: "admin",
    });

    const payload = await verifyAndBurnNonce(res.nonce);
    expect(payload).not.toBeNull();
    expect(payload?.staffId).toBe("usr_102");

    // Second verification must fail (single-use burned)
    const secondTry = await verifyAndBurnNonce(res.nonce);
    expect(secondTry).toBeNull();
  });

  it("should reject non-existent or invalid nonces", async () => {
    const payload = await verifyAndBurnNonce("invalid_nonce_12345");
    expect(payload).toBeNull();
  });
});
