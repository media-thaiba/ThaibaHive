/**
 * @jest-environment node
 */
import { db, institutions, staff, staffInstitutions } from "@/db";
import { resolveInstitutionScopeForSession } from "@thaiba/auth";
import { requireAuth } from "@/lib/api/auth-guard";
import { verifySession } from "@thaiba/auth";
import { NextResponse, NextRequest } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

describe("R3-5: Tenant Scope Real-Time DB Verification & Subdomain Isolation", () => {
  const suffix = Date.now().toString();
  const instAId = `inst_a_${suffix}`;
  const instACode = `schoola${suffix.slice(-4)}`;
  const instBId = `inst_b_${suffix}`;
  const instBCode = `schoolb${suffix.slice(-4)}`;
  const instCId = `inst_c_${suffix}`;
  const instCCode = `schoolc${suffix.slice(-4)}`;

  const staffMultiId = `stf_multi_${suffix}`;
  const staffRevokedId = `stf_revoked_${suffix}`;

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instAId, name: "School A", code: instACode },
      { id: instBId, name: "School B", code: instBCode },
      { id: instCId, name: "School C", code: instCCode },
    ]);

    // Seed staff
    await db.insert(staff).values([
      {
        id: staffMultiId,
        email: `multi_${suffix}@thaibahive.edu`,
        employeeId: `EMP-MUL-${suffix.slice(-4)}`,
        firstName: "Multi",
        lastName: "Teacher",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: staffRevokedId,
        email: `revoked_${suffix}@thaibahive.edu`,
        employeeId: `EMP-REV-${suffix.slice(-4)}`,
        firstName: "Revoked",
        lastName: "Teacher",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
    ]);

    // Seed staffInstitutions: Multi has A and B; Revoked initially has A
    await db.insert(staffInstitutions).values([
      { id: `si_1_${suffix}`, staffId: staffMultiId, institutionId: instAId },
      { id: `si_2_${suffix}`, staffId: staffMultiId, institutionId: instBId },
      { id: `si_3_${suffix}`, staffId: staffRevokedId, institutionId: instAId },
    ]);
  });

  afterAll(async () => {
    try {
      await db.delete(staffInstitutions).where(inArray(staffInstitutions.staffId, [staffMultiId, staffRevokedId]));
      await db.delete(staff).where(inArray(staff.id, [staffMultiId, staffRevokedId]));
      await db.delete(institutions).where(inArray(institutions.id, [instAId, instBId, instCId]));
    } catch {
      // Cleanup
    }
  });

  describe("Real Resolver Subdomain Isolation (No Mocks)", () => {
    it("resolves to Institution A when accessing School A subdomain", async () => {
      const scope = await resolveInstitutionScopeForSession(
        { staffId: staffMultiId, role: "staff" },
        `${instACode}.thaibahive.edu`
      );
      expect(scope).toBe(instAId);
    });

    it("resolves to Institution B when accessing School B subdomain", async () => {
      const scope = await resolveInstitutionScopeForSession(
        { staffId: staffMultiId, role: "staff" },
        `${instBCode}.thaibahive.edu`
      );
      expect(scope).toBe(instBId);
    });

    it("fails closed (returns null) when user accesses School C subdomain they are NOT a member of", async () => {
      const scope = await resolveInstitutionScopeForSession(
        { staffId: staffMultiId, role: "staff" },
        `${instCCode}.thaibahive.edu`
      );
      // Fails closed: user cannot accidentally cross-read School B or C resources
      expect(scope).toBeNull();
    });

    it("resolves primary deterministic institution when on apex domain without specific subdomain", async () => {
      const scope = await resolveInstitutionScopeForSession(
        { staffId: staffMultiId, role: "staff" },
        `thaibahive.edu`
      );
      expect(scope).toBe(instAId);
    });
  });

  describe("Real-time Membership Check & Revocation in auth-guard.ts", () => {
    it("blocks access with 403 when staff is removed from institution even with a still-valid token containing institutionId", async () => {
      // 1. Remove staffRevoked from staffInstitutions table
      await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, staffRevokedId));

      // 2. Mock verifySession to return still-valid token payload that claims institutionId = instAId
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: staffRevokedId,
        email: `revoked_${suffix}@thaibahive.edu`,
        role: "staff",
        employeeId: "EMP-REV-01",
        name: "Revoked Teacher",
        tokenVersion: 0,
        institutionId: instAId, // Stale claim in JWT
      });

      const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ ok: true }));
      const protectedHandler = requireAuth(mockHandler);

      const req = new NextRequest("http://localhost:3000/api/leaves", {
        headers: {
          "host": "thaibahive.edu",
        },
      });

      const res = await protectedHandler(req);

      // Must be 403 because real-time DB membership lookup found 0 institutions
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden: No institution assigned or access denied to tenant");
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
