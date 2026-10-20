/**
 * @jest-environment node
 *
 * Staff Privilege Escalation & Tenancy Guard Test Suite (TH-001)
 *
 * Validates:
 * 1. Role-Creation Hierarchy:
 *    - Principal attempting to create super_admin or admin is rejected with 403.
 *    - Admin attempting to create super_admin is rejected with 403.
 *    - Only super_admin may create super_admin accounts.
 * 2. Zod Role Enum Validation:
 *    - Arbitrary string roles (e.g. "root", "hacker") are rejected with 400.
 * 3. Institutional Tenancy Guard:
 *    - Non-super-admins cannot omit institutionIds (rejected with 400).
 *    - Principals cannot assign staff to institutions outside their verified membership (rejected with 403).
 *    - Authorized staff creation within own institution succeeds with 201.
 */

import { POST as staffPost } from "@/app/api/staff/route";
import { db } from "@/db";
import { staff, institutions, staffInstitutions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@thaiba/auth";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
  };
});

jest.mock("@/lib/onboarding/auto-assign", () => ({
  autoAssignOnboardingChecklists: jest.fn(),
}));

describe("Staff Privilege Escalation & Role Hierarchy Guard (TH-001)", () => {
  const ts = Date.now();
  const instA = `inst-staff-guard-a-${ts}`;
  const instB = `inst-staff-guard-b-${ts}`;
  const principalId = `staff-principal-${ts}`;
  const adminId = `staff-admin-${ts}`;
  const superAdminId = `staff-superadmin-${ts}`;

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instA, name: "Staff Guard Inst A", code: `SGA_${ts}` },
      { id: instB, name: "Staff Guard Inst B", code: `SGB_${ts}` },
    ]).run();

    // Seed caller staff identities
    await db.insert(staff).values([
      {
        id: principalId,
        email: `principal-${ts}@test.local`,
        employeeId: `EMP-PRIN-${ts}`,
        firstName: "Principal",
        lastName: "Tester",
        role: "principal",
      },
      {
        id: adminId,
        email: `admin-${ts}@test.local`,
        employeeId: `EMP-ADMIN-${ts}`,
        firstName: "Admin",
        lastName: "Tester",
        role: "admin",
      },
      {
        id: superAdminId,
        email: `superadmin-${ts}@test.local`,
        employeeId: `EMP-SUPER-${ts}`,
        firstName: "SuperAdmin",
        lastName: "Tester",
        role: "super_admin",
      },
    ]).run();

    // Assign principal to instA
    await db.insert(staffInstitutions).values([
      { id: `si-prin-${ts}`, staffId: principalId, institutionId: instA },
    ]).run();
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instA)).run();
    await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instB)).run();
    await db.delete(staff).where(eq(staff.id, principalId)).run();
    await db.delete(staff).where(eq(staff.id, adminId)).run();
    await db.delete(staff).where(eq(staff.id, superAdminId)).run();
    await db.delete(institutions).where(eq(institutions.id, instA)).run();
    await db.delete(institutions).where(eq(institutions.id, instB)).run();
  });

  it("rejects invalid role strings with HTTP 400 (Zod enum validation)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: superAdminId,
      role: "super_admin",
      email: "super@test.local",
    });

    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `bad-role-${ts}@test.local`,
        employeeId: `EMP-BAD-${ts}`,
        firstName: "Bad",
        lastName: "Role",
        role: "god_mode_unauthorized",
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(400);
  });

  it("blocks principal from creating a super_admin account (HTTP 403)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: principalId,
      role: "principal",
      email: "principal@test.local",
      institutionId: instA,
    });

    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `esc-super-${ts}@test.local`,
        employeeId: `EMP-ESC-1-${ts}`,
        firstName: "Escalation",
        lastName: "SuperAdmin",
        role: "super_admin",
        institutionIds: [instA],
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Forbidden");
  });

  it("blocks principal from creating an admin account (HTTP 403)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: principalId,
      role: "principal",
      email: "principal@test.local",
      institutionId: instA,
    });

    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `esc-admin-${ts}@test.local`,
        employeeId: `EMP-ESC-2-${ts}`,
        firstName: "Escalation",
        lastName: "Admin",
        role: "admin",
        institutionIds: [instA],
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(403);
  });

  it("blocks non-super_admin from omitting institutionIds (HTTP 400)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: principalId,
      role: "principal",
      email: "principal@test.local",
      institutionId: instA,
    });

    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `no-inst-${ts}@test.local`,
        employeeId: `EMP-NO-INST-${ts}`,
        firstName: "No",
        lastName: "Institution",
        role: "staff",
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("institution assignment");
  });

  it("blocks principal from assigning staff to another institution (HTTP 403)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: principalId,
      role: "principal",
      email: "principal@test.local",
      institutionId: instA,
    });

    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `foreign-inst-${ts}@test.local`,
        employeeId: `EMP-FOREIGN-${ts}`,
        firstName: "Foreign",
        lastName: "Staff",
        role: "staff",
        institutionIds: [instB],
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("institutions outside your own");
  });

  it("blocks admin from creating a super_admin account (HTTP 403)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: adminId,
      role: "admin",
      email: "admin@test.local",
    });

    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `admin-esc-${ts}@test.local`,
        employeeId: `EMP-ADMIN-ESC-${ts}`,
        firstName: "AdminEscalation",
        lastName: "Attempt",
        role: "super_admin",
        institutionIds: [instA],
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(403);
  });

  it("allows principal to create regular staff within their own institution (HTTP 201)", async () => {
    (verifySession as jest.Mock).mockResolvedValue({
      staffId: principalId,
      role: "principal",
      email: "principal@test.local",
      institutionId: instA,
    });

    const targetEmail = `legit-staff-${ts}@test.local`;
    const req = new Request("http://localhost/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: targetEmail,
        employeeId: `EMP-LEGIT-${ts}`,
        firstName: "Legit",
        lastName: "Staff",
        role: "staff",
        institutionIds: [instA],
      }),
    });

    const res = await staffPost(req, { params: Promise.resolve({}) } as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.staff.email).toBe(targetEmail);
    expect(body.staff.role).toBe("staff");

    // Clean up created staff
    await db.delete(staff).where(eq(staff.email, targetEmail)).run();
  });
});
