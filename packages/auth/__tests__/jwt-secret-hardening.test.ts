import { getJwtSecret, getJwtSecretBytes } from "../config";
import { SignJWT, jwtVerify } from "jose";

describe("JWT Secret Hardening and Purpose Derivation (Task A1 / Blocker B1)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should throw in production if AUTH_JWT_SECRET is missing", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.JWT_SECRET;

    expect(() => getJwtSecret("session")).toThrow(
      /AUTH_JWT_SECRET is not configured|Missing production JWT secret/
    );
  });

  it("should throw in production if AUTH_JWT_SECRET is less than 32 characters", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    process.env.AUTH_JWT_SECRET = "short-secret-123";

    expect(() => getJwtSecret("session")).toThrow(
      /AUTH_JWT_SECRET is too short|minimum 32 characters/i
    );
  });

  it("should derive distinct cryptographically isolated keys per purpose using HKDF", () => {
    process.env.AUTH_JWT_SECRET = "master-secret-key-that-is-very-long-and-secure-1234567890";
    
    const sessionKey = getJwtSecret("session");
    const stepUpKey = getJwtSecret("step-up");
    const hallTicketKey = getJwtSecret("hall-ticket");

    expect(sessionKey).toBeDefined();
    expect(stepUpKey).toBeDefined();
    expect(hallTicketKey).toBeDefined();

    expect(sessionKey).not.toEqual(stepUpKey);
    expect(sessionKey).not.toEqual(hallTicketKey);
    expect(stepUpKey).not.toEqual(hallTicketKey);

    // Ensure they are 64-char hex strings (32-byte derived keys)
    expect(sessionKey.length).toBe(64);
    expect(stepUpKey.length).toBe(64);
    expect(hallTicketKey.length).toBe(64);
  });

  it("should reject tokens signed with burned legacy fallback secrets", async () => {
    process.env.AUTH_JWT_SECRET = "master-secret-key-that-is-very-long-and-secure-1234567890";
    const sessionSecretBytes = getJwtSecretBytes("session");

    const burnedSecrets = [
      "a8f93c01948d374f638104829375b4f028471049281740192847192847192847",
      "fallback-secret-key-123456",
      "thaibahive-exam-secret-key-2026",
    ];

    for (const burned of burnedSecrets) {
      const forgedToken = await new SignJWT({ staffId: "attacker", role: "super_admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(new TextEncoder().encode(burned));

      await expect(
        jwtVerify(forgedToken, sessionSecretBytes)
      ).rejects.toThrow();
    }
  });

  it("should prevent cross-purpose token validation (session vs step-up)", async () => {
    process.env.AUTH_JWT_SECRET = "master-secret-key-that-is-very-long-and-secure-1234567890";
    const sessionSecretBytes = getJwtSecretBytes("session");
    const stepUpSecretBytes = getJwtSecretBytes("step-up");

    const sessionToken = await new SignJWT({ staffId: "user-1", role: "staff" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(sessionSecretBytes);

    // Verifying session token with step-up secret must fail
    await expect(
      jwtVerify(sessionToken, stepUpSecretBytes)
    ).rejects.toThrow();
  });
});
