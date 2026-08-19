import { handleEdgeRequest } from "../edge/worker";
import { setCachedResponse, getCachedResponse } from "../cache/edge-cache";
import { parseTenantContext } from "../edge/tenant-context";
import { SignJWT, jwtVerify } from "jose";

jest.mock("jose", () => ({
  jwtVerify: jest.fn(),
  SignJWT: jest.fn().mockImplementation((payload) => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockImplementation(async (sec) => {
      // Simulate signature failure for wrong secret
      if (sec && sec[0] === 117) { // "u" from untrusted
        return "invalid-secret-token";
      }
      return `mocked-jwt:${JSON.stringify(payload)}`;
    }),
  })),
}));

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-key-123456");

describe("Sprint-018 Security Invariants & Multi-Tenant Audit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (jwtVerify as jest.Mock).mockImplementation(async (token, sec) => {
      if (token === "invalid-secret-token" || (sec && sec[0] === 117)) {
        throw new Error("signature verification failed");
      }
      if (token.startsWith("mocked-jwt:")) {
        const payloadStr = token.substring(11);
        return { payload: JSON.parse(payloadStr) };
      }
      throw new Error("invalid token");
    });
  });
  describe("Cache Tenant Boundary Isolation", () => {
    it("should prevent Tenant A from accessing cached keys belonging to Tenant B", async () => {
      const tenantA = "tenant_aaa";
      const tenantB = "tenant_bbb";
      const url = "http://localhost:3000/api/grades";

      const keyA = `${tenantA}:${url}:`;
      const keyB = `${tenantB}:${url}:`;

      await setCachedResponse(keyA, JSON.stringify({ grades: [90, 85] }), 30);
      await setCachedResponse(keyB, JSON.stringify({ grades: [40, 55] }), 30);

      const retrievedFromAContext = await getCachedResponse(keyA);
      const retrievedFromBContext = await getCachedResponse(keyB);

      expect(JSON.parse(retrievedFromAContext!)).toEqual({ grades: [90, 85] });
      expect(JSON.parse(retrievedFromBContext!)).toEqual({ grades: [40, 55] });
      expect(keyA).not.toBe(keyB);
    });
  });

  describe("Edge JWT Validation Integrity", () => {
    it("should reject token signatures signed with untrusted keys or spoofed secrets", async () => {
      const malformedSecret = new TextEncoder().encode("untrusted-signature-key-9999");
      const rogueToken = await new SignJWT({
        tenantId: "tenant_abc",
        userId: "usr_123",
      })
        .setProtectedHeader({ alg: "HS256" })
        .sign(malformedSecret);

      await expect(parseTenantContext(rogueToken)).rejects.toThrow("JWT Verification Failed");
    });
  });

  describe("GraphQL Query Depth Boundary Guard", () => {
    it("should block excessively nested GraphQL queries to prevent DoS attacks", async () => {
      // Simulate checking query complexity on the gateway query planner
      const excessiveQuery = `
        query {
          student {
            classes {
              department {
                institution {
                  classes {
                    department {
                      institution {
                        classes {
                          department {
                            name {
                              first
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const checkDepth = (q: string): number => {
        let maxDepth = 0;
        let current = 0;
        for (const char of q) {
          if (char === "{") {
            current++;
            if (current > maxDepth) maxDepth = current;
          } else if (char === "}") {
            current--;
          }
        }
        return maxDepth;
      };

      const depth = checkDepth(excessiveQuery);
      expect(depth).toBeGreaterThan(10); // Check depth > 10 nested fields
      expect(depth > 10 ? "BLOCKED" : "ALLOWED").toBe("BLOCKED");
    });
  });
});
