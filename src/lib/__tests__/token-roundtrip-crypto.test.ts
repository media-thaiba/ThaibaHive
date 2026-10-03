import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret, getJwtSecretBytes } from "@thaiba/auth/config";
import { createSession } from "@thaiba/auth/session";

describe("Token Round-Trip & Cryptographic Key Separation (Task A1 / Blocker B1)", () => {
  const MASTER_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const OLD_BURNED_SECRET = "a8f93c01e9d24f7b8a6c3e5d1f0b9a8c7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b";

  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = process.env;
  });

  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_JWT_SECRET: MASTER_SECRET, NODE_ENV: "test" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Real Jose Token Round-Trip", () => {
    it("should successfully sign with createSession and verify using derived session key bytes", async () => {
      const sessionPayload = {
        staffId: "usr_integration_123",
        email: "teacher@thaiba.edu",
        role: "staff",
        institutionId: "inst_alpha",
        employeeId: "EMP-9001",
        name: "Aisha Rahman",
        tokenVersion: 1,
      };

      const token = await createSession(sessionPayload, false);
      expect(typeof token).toBe("string");

      const { payload } = await jwtVerify(token, getJwtSecretBytes("session"));
      expect(payload.staffId).toBe("usr_integration_123");
      expect(payload.role).toBe("staff");
      expect(payload.institutionId).toBe("inst_alpha");
    });
  });

  describe("Cryptographic Key Separation Across Purposes", () => {
    it("should reject session token verification when verified against step-up or hall-ticket derived keys", async () => {
      const sessionKey = getJwtSecretBytes("session");
      const stepUpKey = getJwtSecretBytes("step-up");
      const hallTicketKey = getJwtSecretBytes("hall-ticket");

      // Verify that HKDF derived keys are distinct byte buffers
      expect(sessionKey).not.toEqual(stepUpKey);
      expect(sessionKey).not.toEqual(hallTicketKey);
      expect(stepUpKey).not.toEqual(hallTicketKey);

      // Sign token with session key
      const sessionToken = await new SignJWT({ staffId: "usr_test", role: "staff" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(sessionKey);

      // Verifying with session key succeeds
      const { payload } = await jwtVerify(sessionToken, sessionKey);
      expect(payload.staffId).toBe("usr_test");

      // Verifying session token with step-up key MUST fail cryptographically
      await expect(jwtVerify(sessionToken, stepUpKey)).rejects.toThrow();

      // Verifying session token with hall-ticket key MUST fail cryptographically
      await expect(jwtVerify(sessionToken, hallTicketKey)).rejects.toThrow();
    });
  });

  describe("Rejection of Burned Literal Secret Tokens", () => {
    it("should reject tokens minted with old hardcoded fallback secret", async () => {
      const burnedKey = new TextEncoder().encode(OLD_BURNED_SECRET);

      const attackerToken = await new SignJWT({
        staffId: "usr_attacker",
        role: "super_admin",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(burnedKey);

      // Middleware/Auth verification with session key MUST reject forged token
      await expect(jwtVerify(attackerToken, getJwtSecretBytes("session"))).rejects.toThrow();
    });
  });

  describe("Strict Non-Test Environment Enforcement", () => {
    it("should throw in production/development if AUTH_JWT_SECRET is missing or < 32 characters", () => {
      delete process.env.AUTH_JWT_SECRET;
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });

      expect(() => getJwtSecret("session")).toThrow(
        /AUTH_JWT_SECRET is not configured/
      );

      process.env.AUTH_JWT_SECRET = "too-short-secret";
      expect(() => getJwtSecret("session")).toThrow(
        /AUTH_JWT_SECRET is too short/
      );
    });
  });
});
