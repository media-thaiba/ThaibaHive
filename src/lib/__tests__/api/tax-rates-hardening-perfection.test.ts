/**
 * @jest-environment node
 *
 * Tax Rates & Exemption Overrides Pipeline — Hardening Perfection Test Suite
 */

import { NextResponse } from "next/server";
import { db, institutions, staff, staffInstitutions, taxJurisdictions, taxRateOverrides, eq } from "@/db";
import { verifySession } from "@thaiba/auth";
import { POST as calculatePost } from "@/app/api/finance/tax-rates/calculate/route";
import { GET as jurisdictionsGet, POST as jurisdictionsPost } from "@/app/api/finance/tax-rates/jurisdictions/route";
import { GET as overridesGet, POST as overridesPost } from "@/app/api/finance/tax-rates/overrides/route";

let mockRateLimitAllowed = true;
jest.mock("@/lib/api/rate-limit", () => ({
  checkRateLimit: jest.fn(() => ({
    allowed: mockRateLimitAllowed,
    remaining: mockRateLimitAllowed ? 999 : 0,
    resetMs: mockRateLimitAllowed ? 0 : 45000,
  })),
  rateLimitResponse: jest.fn((ms: number) =>
    NextResponse.json({ error: "Too many requests", retryAfter: ms }, { status: 429 })
  ),
  extractIp: jest.fn(() => "127.0.0.1"),
}));

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth") as any;
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

// Helper to create JSON Request objects
function createJsonRequest(url: string, method: string, body?: any, rawBody?: string): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("Tax Rates & Exemption Overrides Pipeline — Hardening Perfection Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const instA = `inst_tax_a_${suffix}`;
  const instB = `inst_tax_b_${suffix}`;
  const adminId = `staff_admin_${suffix}`;
  const staffAId = `staff_user_a_${suffix}`;

  let currentSession: any;

  beforeAll(async () => {
    // Seed test institutions
    await db.insert(institutions).values([
      { id: instA, name: `Tax Inst A ${suffix}`, code: `TIA_${suffix}` },
      { id: instB, name: `Tax Inst B ${suffix}`, code: `TIB_${suffix}` },
    ]);

    // Seed test staff
    await db.insert(staff).values([
      {
        id: adminId,
        email: `admin_${suffix}@test.edu`,
        employeeId: `EMP_ADM_${suffix}`,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        isActive: true,
      },
    ]);

    // Seed staff institution membership
    await db.insert(staffInstitutions).values([
      { id: `si_adm_${suffix}`, staffId: adminId, institutionId: instA },
    ]);
  });

  beforeEach(async () => {
    currentSession = {
      userId: adminId,
      staffId: adminId,
      email: `admin_${suffix}@test.edu`,
      role: "admin",
      institutionId: instA,
      permissions: ["finance:tax:view", "finance:tax:manage", "finance:tax:override"],
    };

    (verifySession as any).mockResolvedValue(currentSession);

    // Clean up test data for this run
    await db.delete(taxRateOverrides).where(eq(taxRateOverrides.institutionId, instA));
    await db.delete(taxRateOverrides).where(eq(taxRateOverrides.institutionId, instB));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Safe JSON Parsing Across Mutating Endpoints
  // --------------------------------------------------------------------------
  describe("1. Safe JSON Parsing Across Mutating Endpoints", () => {
    it("POST /api/finance/tax-rates/calculate returns 400 on malformed JSON", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/calculate", "POST", undefined, "not-valid-json{");
      const res = await (calculatePost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("POST /api/finance/tax-rates/jurisdictions returns 400 on malformed JSON", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/jurisdictions", "POST", undefined, "{\"bad\": json");
      const res = await (jurisdictionsPost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid JSON payload");
    });

    it("POST /api/finance/tax-rates/overrides returns 400 on malformed JSON", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/overrides", "POST", undefined, "{{}");
      const res = await (overridesPost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid JSON payload");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Centralized Rate Limiting Protection
  // --------------------------------------------------------------------------
  describe("2. Centralized Rate Limiting Protection", () => {
    it("returns 429 when rate limit is exceeded on read or write endpoints", async () => {
      mockRateLimitAllowed = false;
      try {
        const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/calculate", "POST", {
          amount: 1000,
          category: "tuition",
        });
        const res = await (calculatePost as any)(req, currentSession);

        expect(res.status).toBe(429);
        const data = await res.json();
        expect(data.error).toContain("Too many requests");
      } finally {
        mockRateLimitAllowed = true;
      }
    });
  });

  // --------------------------------------------------------------------------
  // 3. Calculation Bounds & Input Validation
  // --------------------------------------------------------------------------
  describe("3. Calculation Bounds & Input Validation", () => {
    it("POST /calculate rejects negative amounts with 400", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/calculate", "POST", {
        amount: -500,
        category: "tuition",
        institutionId: instA,
      });
      const res = await (calculatePost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Amount must be non-negative");
    });

    it("POST /calculate rejects invalid category with 400", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/calculate", "POST", {
        amount: 500,
        category: "invalid_category",
        institutionId: instA,
      });
      const res = await (calculatePost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("POST /overrides rejects effectiveTo earlier than effectiveFrom with 400", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/overrides", "POST", {
        institutionId: instA,
        jurisdictionId: `jur_test_${suffix}`,
        category: "hostel",
        overrideRate: 0.05,
        effectiveFrom: "2026-10-01",
        effectiveTo: "2026-09-01", // Earlier than effectiveFrom!
      });
      const res = await (overridesPost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("effectiveTo must be greater than or equal to effectiveFrom");
    });
  });

  // --------------------------------------------------------------------------
  // 4. Jurisdiction & Override Collision Guards (409 Conflict)
  // --------------------------------------------------------------------------
  describe("4. Jurisdiction & Override Collision Guards (409 Conflict)", () => {
    const taxCode = `VAT_${suffix.toUpperCase()}`;

    it("creates a tax jurisdiction and rejects duplicate taxCode with 409", async () => {
      const payload = {
        countryCode: "IN",
        regionCode: "KA",
        jurisdictionName: `Karnataka GST ${suffix}`,
        defaultTaxRate: 0.18,
        taxCode,
        description: "Karnataka State GST",
      };

      // 1. First creation succeeds (201 Created)
      const req1 = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/jurisdictions", "POST", payload);
      const res1 = await (jurisdictionsPost as any)(req1, currentSession);
      const data1 = await res1.json();

      expect(res1.status).toBe(201);
      expect(data1.jurisdiction).toBeDefined();
      expect(data1.jurisdiction.taxCode).toBe(taxCode);

      // 2. Duplicate creation returns 409 Conflict
      const req2 = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/jurisdictions", "POST", payload);
      const res2 = await (jurisdictionsPost as any)(req2, currentSession);
      const data2 = await res2.json();

      expect(res2.status).toBe(409);
      expect(data2.error).toContain(`Tax jurisdiction with code '${taxCode}' already exists`);
    });

    it("rejects override creation when jurisdictionId does not exist (404 Not Found)", async () => {
      const req = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/overrides", "POST", {
        institutionId: instA,
        jurisdictionId: "non_existent_jur_id",
        category: "tuition",
        overrideRate: 0.0,
        effectiveFrom: "2026-01-01",
      });
      const res = await (overridesPost as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Tax jurisdiction not found");
    });

    it("creates override and rejects duplicate active override for same category with 409", async () => {
      // Create a jurisdiction first
      const jurPayload = {
        countryCode: "IN",
        regionCode: "KL",
        jurisdictionName: `Kerala GST ${suffix}`,
        defaultTaxRate: 0.12,
        taxCode: `KGST_${suffix.toUpperCase()}`,
      };
      const jurReq = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/jurisdictions", "POST", jurPayload);
      const jurRes = await (jurisdictionsPost as any)(jurReq, currentSession);
      const jurData = await jurRes.json();
      const jurisdictionId = jurData.jurisdiction.id;

      // 1. Create tuition exemption override (201 Created)
      const overridePayload = {
        institutionId: instA,
        jurisdictionId,
        category: "tuition",
        overrideRate: 0.0,
        exemptionReason: "Educational Tuition Full Exemption",
        effectiveFrom: "2026-01-01",
      };
      const req1 = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/overrides", "POST", overridePayload);
      const res1 = await (overridesPost as any)(req1, currentSession);
      const data1 = await res1.json();

      expect(res1.status).toBe(201);
      expect(data1.override.category).toBe("tuition");
      expect(data1.override.overrideRate).toBe(0.0);

      // 2. Duplicate active override for same category returns 409 Conflict
      const req2 = createJsonRequest("https://thaiba.edu/api/finance/tax-rates/overrides", "POST", {
        ...overridePayload,
        overrideRate: 0.05,
      });
      const res2 = await (overridesPost as any)(req2, currentSession);
      const data2 = await res2.json();

      expect(res2.status).toBe(409);
      expect(data2.error).toContain("An active tax override already exists for category 'tuition'");
    });
  });

  // --------------------------------------------------------------------------
  // 5. Precedence Engine & Tax Calculation Correctness
  // --------------------------------------------------------------------------
  describe("5. Precedence Engine & Tax Calculation Correctness", () => {
    it("applies category override over jurisdiction default rate", async () => {
      // 1. Create jurisdiction with 18% default rate
      const jurRes = await (jurisdictionsPost as any)(
        createJsonRequest("https://thaiba.edu/api/finance/tax-rates/jurisdictions", "POST", {
          countryCode: "IN",
          regionCode: "DL",
          jurisdictionName: `Delhi GST ${suffix}`,
          defaultTaxRate: 0.18,
          taxCode: `DGST_${suffix.toUpperCase()}`,
        }),
        currentSession
      );
      const { jurisdiction } = await jurRes.json();

      // 2. Create institution override for transport at 5% (concessional)
      await (overridesPost as any)(
        createJsonRequest("https://thaiba.edu/api/finance/tax-rates/overrides", "POST", {
          institutionId: instA,
          jurisdictionId: jurisdiction.id,
          category: "transport",
          overrideRate: 0.05,
          exemptionReason: "Student Transport Concession",
          effectiveFrom: "2026-01-01",
        }),
        currentSession
      );

      // 3. Calculate tax on general supplies (no override -> should use 18% base rate)
      const calcGeneral = await (calculatePost as any)(
        createJsonRequest("https://thaiba.edu/api/finance/tax-rates/calculate", "POST", {
          amount: 1000,
          category: "supplies",
          institutionId: instA,
          jurisdictionId: jurisdiction.id,
        }),
        currentSession
      );
      const dataGeneral = await calcGeneral.json();
      expect(calcGeneral.status).toBe(200);
      expect(dataGeneral.calculation.taxRate).toBe(0.18);
      expect(dataGeneral.calculation.taxAmount).toBe(180);
      expect(dataGeneral.calculation.totalAmount).toBe(1180);
      expect(dataGeneral.calculation.isOverrideApplied).toBe(false);

      // 4. Calculate tax on transport (override active -> should use 5% override rate)
      const calcTransport = await (calculatePost as any)(
        createJsonRequest("https://thaiba.edu/api/finance/tax-rates/calculate", "POST", {
          amount: 2000,
          category: "transport",
          institutionId: instA,
          jurisdictionId: jurisdiction.id,
        }),
        currentSession
      );
      const dataTransport = await calcTransport.json();
      expect(calcTransport.status).toBe(200);
      expect(dataTransport.calculation.taxRate).toBe(0.05);
      expect(dataTransport.calculation.taxAmount).toBe(100);
      expect(dataTransport.calculation.totalAmount).toBe(2100);
      expect(dataTransport.calculation.isOverrideApplied).toBe(true);
      expect(dataTransport.calculation.overrideReason).toBe("Student Transport Concession");
    });
  });

  // --------------------------------------------------------------------------
  // 6. Tenant Scoping & Isolation
  // --------------------------------------------------------------------------
  describe("6. Tenant Scoping & Isolation", () => {
    it("returns empty overrides for caller's own institution", async () => {
      const req = createJsonRequest(`https://thaiba.edu/api/finance/tax-rates/overrides?institutionId=${instA}`, "GET");
      const res = await (overridesGet as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.overrides).toEqual([]);
    });

    it("blocks cross-tenant access to another institution with 403 Forbidden", async () => {
      const req = createJsonRequest(`https://thaiba.edu/api/finance/tax-rates/overrides?institutionId=${instB}`, "GET");
      const res = await (overridesGet as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe("Failed to fetch tax overrides");
    });
  });
});
