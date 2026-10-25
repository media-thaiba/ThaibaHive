/**
 * Stage 4: Enterprise Diagnostics Health Suite Test Battery (C4.6, C4.9, C4.10)
 *
 * Verifies:
 * 1. GET /api/admin/diagnostics/health requires authentication (HTTP 401).
 * 2. Denies staff/hod without system:diagnostics:read permission with HTTP 403.
 * 3. Regional admin querying foreign institution returns 403 (TenantMismatchError).
 * 4. Super admin and authorized admin receive HTTP 200 with complete diagnostics health schema.
 * 5. Introspects database triggers: returns status "active" when present, "degraded" and HTTP 503 when missing.
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { db } from "@/db";
import { staff, institutions, staffInstitutions, userSessions, auditLogs } from "@thaiba/db/schema";
import { eq, sql } from "drizzle-orm";
import { createSession } from "../index";
import { GET as healthGet } from "@/app/api/admin/diagnostics/health/route";
import { installAuditImmutabilityTriggers, dropAuditImmutabilityTriggers } from "@/lib/audit/triggers";

let activeCookieMap = new Map<string, string>();

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: jest.fn((name: string) => {
      const val = activeCookieMap.get(name);
      return val ? { value: val } : undefined;
    }),
    set: jest.fn((name: string, value: string) => {
      activeCookieMap.set(name, value);
    }),
    delete: jest.fn((name: string) => {
      activeCookieMap.delete(name);
    }),
  })),
  headers: jest.fn(async () => ({
    get: jest.fn(() => null),
  })),
}));

describe("Stage 4: Enterprise Diagnostics Health Suite (C4.6 & C4.9)", () => {
  const ts = Date.now();
  const instA = `inst_stg4_a_${ts}`;
  const instB = `inst_stg4_b_${ts}`;

  const superAdminId = `stf_sa_${ts}`;
  const regionalAdminId = `stf_ra_${ts}`;
  const staffId = `stf_staff_${ts}`;

  beforeAll(async () => {
    // 1. Seed Institutions
    await db.insert(institutions).values([
      { id: instA, name: "Health Campus Alpha", code: `HCA_${ts}`, isActive: true },
      { id: instB, name: "Health Campus Beta", code: `HCB_${ts}`, isActive: true },
    ]).run();

    // 2. Seed Staff
    await db.insert(staff).values([
      { id: superAdminId, email: `sa_${ts}@thaiba.org`, employeeId: `EMP_SA_${ts}`, firstName: "Super", lastName: "Admin", role: "super_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: regionalAdminId, email: `ra_${ts}@thaiba.org`, employeeId: `EMP_RA_${ts}`, firstName: "Regional", lastName: "Admin", role: "regional_admin", isActive: true, tokenVersion: 0, isFirstLogin: false },
      { id: staffId, email: `staff_${ts}@thaiba.org`, employeeId: `EMP_STF_${ts}`, firstName: "Teacher", lastName: "Staff", role: "staff", isActive: true, tokenVersion: 0, isFirstLogin: false },
    ]).run();

    // 3. Seed Staff Institutions
    await db.insert(staffInstitutions).values([
      { id: `si_ra_${ts}`, staffId: regionalAdminId, institutionId: instA },
      { id: `si_staff_${ts}`, staffId: staffId, institutionId: instA },
    ]).run();

    // 4. Ensure triggers are active
    await installAuditImmutabilityTriggers(db);
  });

  afterAll(async () => {
    await dropAuditImmutabilityTriggers(db);
    await db.delete(staffInstitutions).where(sql`${staffInstitutions.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(staff).where(sql`${staff.id} LIKE ${`%_${ts}`}`).run();
    await db.delete(institutions).where(sql`${institutions.id} LIKE ${`%_${ts}`}`).run();
  });

  it("rejects unauthenticated requests with HTTP 401", async () => {
    activeCookieMap.clear();
    const req = new Request("http://localhost/api/admin/diagnostics/health");
    const res = await healthGet(req);
    expect(res.status).toBe(401);
  });

  it("denies staff role without system:diagnostics:read permission with HTTP 403", async () => {
    activeCookieMap.clear();
    await createSession({
      staffId,
      role: "staff",
      email: `staff_${ts}@thaiba.org`,
      employeeId: `EMP_STF_${ts}`,
      name: "Teacher Staff",
      tokenVersion: 0,
      institutionId: instA,
    });

    const req = new Request("http://localhost/api/admin/diagnostics/health");
    const res = await healthGet(req);
    expect(res.status).toBe(403);
  });

  it("allows regional admin to inspect own institution, but denies foreign institution with HTTP 403", async () => {
    activeCookieMap.clear();
    await createSession({
      staffId: regionalAdminId,
      role: "regional_admin",
      email: `ra_${ts}@thaiba.org`,
      employeeId: `EMP_RA_${ts}`,
      name: "Regional Admin",
      tokenVersion: 0,
      institutionId: instA,
    });

    // Own institution -> 200
    const reqOwn = new Request(`http://localhost/api/admin/diagnostics/health?tenantId=${instA}`);
    const resOwn = await healthGet(reqOwn);
    expect(resOwn.status).toBe(200);
    const jsonOwn = await resOwn.json();
    expect(jsonOwn.status).toBe("healthy");
    expect(jsonOwn.tenantId).toBe(instA);

    // Foreign institution -> 403
    const reqForeign = new Request(`http://localhost/api/admin/diagnostics/health?tenantId=${instB}`);
    const resForeign = await healthGet(reqForeign);
    expect(resForeign.status).toBe(403);
    const jsonForeign = await resForeign.json();
    expect(jsonForeign.error).toContain("cannot access unassigned institution");
  });

  it("returns HTTP 200 with complete diagnostics health schema for super admin", async () => {
    activeCookieMap.clear();
    await createSession({
      staffId: superAdminId,
      role: "super_admin",
      email: `sa_${ts}@thaiba.org`,
      employeeId: `EMP_SA_${ts}`,
      name: "Super Admin",
      tokenVersion: 0,
      institutionId: "global",
    });

    const req = new Request("http://localhost/api/admin/diagnostics/health");
    const res = await healthGet(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.status).toBe("healthy");
    expect(json.database.status).toBe("connected");
    expect(json.database.dialect).toBe("sqlite");
    expect(typeof json.database.latencyMs).toBe("number");

    expect(json.immutabilityTriggers.status).toBe("active");
    expect(json.immutabilityTriggers.triggers).toContain("trg_audit_logs_no_update");
    expect(json.immutabilityTriggers.triggers).toContain("trg_audit_logs_no_delete");
    expect(json.immutabilityTriggers.missing).toEqual([]);

    expect(json.sessions.status).toBe("healthy");
    expect(typeof json.sessions.activeCount).toBe("number");

    expect(typeof json.auditLedger.latestSequenceNumber).toBe("number");
    expect(json.auditLedger.latestHash).toHaveLength(64);
  });

  it("reports immutabilityTriggers degraded and returns HTTP 503 if triggers are dropped", async () => {
    activeCookieMap.clear();
    await createSession({
      staffId: superAdminId,
      role: "super_admin",
      email: `sa_${ts}@thaiba.org`,
      employeeId: `EMP_SA_${ts}`,
      name: "Super Admin",
      tokenVersion: 0,
      institutionId: "global",
    });

    // Drop triggers
    await dropAuditImmutabilityTriggers(db);

    const req = new Request("http://localhost/api/admin/diagnostics/health");
    const res = await healthGet(req);
    expect(res.status).toBe(503);

    const json = await res.json();
    expect(json.status).toBe("degraded");
    expect(json.immutabilityTriggers.status).toBe("degraded");
    expect(json.immutabilityTriggers.missing).toContain("trg_audit_logs_no_update");
    expect(json.immutabilityTriggers.missing).toContain("trg_audit_logs_no_delete");

    // Restore triggers
    await installAuditImmutabilityTriggers(db);
    const restoreRes = await healthGet(req);
    expect(restoreRes.status).toBe(200);
    const restoreJson = await restoreRes.json();
    expect(restoreJson.status).toBe("healthy");
    expect(restoreJson.immutabilityTriggers.status).toBe("active");
  });
});
