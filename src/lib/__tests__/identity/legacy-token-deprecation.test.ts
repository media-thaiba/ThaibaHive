/**
 * Unit tests for LegacyTokenDeprecationEngine (TIF-007 / TD-012)
 */

import { SignJWT } from "jose";
import { LegacyTokenDeprecationEngine } from "../../identity/legacy-token-deprecation";

describe("LegacyTokenDeprecationEngine (TIF-007)", () => {
  let engine: LegacyTokenDeprecationEngine;
  let secretKey: Uint8Array;

  beforeAll(() => {
    secretKey = new TextEncoder().encode("super-secret-test-key-32-chars-!!");
  });

  beforeEach(() => {
    engine = new LegacyTokenDeprecationEngine("WARN");
  });

  async function createMockToken(isDPoP: boolean): Promise<string> {
    const builder = new SignJWT({
      sub: "user-123",
      role: "staff",
      tenantId: "tenant-1",
      ...(isDPoP ? { cnf: { jkt: "thumbprint-abc" } } : {}),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("2h");

    return await builder.sign(secretKey);
  }

  it("passes DPoP-bound tokens without deprecation headers", async () => {
    const dpopToken = await createMockToken(true);
    const result = engine.evaluate(dpopToken, "GET");

    expect(result.isLegacy).toBe(false);
    expect(result.isRejected).toBe(false);
    expect(result.headers).toEqual({});
  });

  it("attaches RFC 8594 headers to legacy tokens in WARN mode without rejecting", async () => {
    const legacyToken = await createMockToken(false);
    const result = engine.evaluate(legacyToken, "GET");

    expect(result.isLegacy).toBe(true);
    expect(result.isRejected).toBe(false);
    expect(result.headers).toHaveProperty("Deprecation");
    expect(result.headers).toHaveProperty("Sunset");
    expect(result.headers).toHaveProperty("Link");
    expect(result.headers.Link).toContain('rel="sunset"');
  });

  it("rejects mutations but allows queries in SOFT_ENFORCE mode", async () => {
    engine.setMode("SOFT_ENFORCE");
    const legacyToken = await createMockToken(false);

    // GET query -> allowed with headers
    const getResult = engine.evaluate(legacyToken, "GET");
    expect(getResult.isRejected).toBe(false);

    // POST mutation -> rejected
    const postResult = engine.evaluate(legacyToken, "POST");
    expect(postResult.isRejected).toBe(true);
    expect(postResult.problemDetails?.status).toBe(401);
  });

  it("strictly rejects all requests in STRICT mode", async () => {
    engine.setMode("STRICT");
    const legacyToken = await createMockToken(false);

    const getResult = engine.evaluate(legacyToken, "GET");
    expect(getResult.isRejected).toBe(true);
    expect(getResult.problemDetails?.type).toContain("legacy-token-deprecated");
  });
});
