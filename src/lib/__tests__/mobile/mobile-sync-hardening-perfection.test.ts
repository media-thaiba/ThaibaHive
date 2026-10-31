/** @jest-environment node */
import { POST as syncBatchPost } from "@/app/api/mobile/v1/sync/route";
import { GET as getConflicts } from "@/app/api/mobile/v1/sync/conflicts/route";
import { POST as resolveConflict } from "@/app/api/mobile/v1/sync/conflicts/[id]/resolve/route";
import { GET as pullSync } from "@/app/api/mobile/v1/sync/pull/route";
import { POST as pushSync } from "@/app/api/mobile/v1/sync/push/route";
import { GET as getPolicies } from "@/app/api/mobile/v1/sync/policies/route";
import { db } from "@/db";
import { offlineSyncOutbox, mobileSyncProcessed, institutions, staff } from "@/db/schema";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq } from "drizzle-orm";
import crypto from "crypto";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn(),
    resolveInstitutionScopeForSession: jest.fn().mockImplementation((session: any) => Promise.resolve(session?.institutionId ?? null)),
    resolveScopedInstitutionId: jest.fn().mockImplementation(async (id: any) => id ?? null),
  };
});

describe("Mobile Offline Sync & Conflict Resolution Hardening Suite", () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const tenantA = `inst_sync_a_${suffix}`;
  const tenantB = `inst_sync_b_${suffix}`;
  const staffA = `stf_sync_a_${suffix}`;
  const staffB = `stf_sync_b_${suffix}`;

  const setSession = (staffId = staffA, tenantId = tenantA, role = "staff", permissions = ["mobile:sync"]) => {
    (verifySession as jest.Mock).mockResolvedValue({
      userId: staffId,
      staffId,
      email: `${staffId}@thaiba.edu`,
      role,
      institutionId: tenantId,
      permissions,
    });
    (hasPermission as jest.Mock).mockImplementation((r: string, perm: string) => {
      if (role === "admin" || role === "super_admin") return true;
      if (permissions.includes(perm)) return true;
      return false;
    });
  };

  const makeJsonReq = (url: string, body?: unknown, method = "POST"): Request =>
    new Request(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: tenantA, name: `Sync Campus A ${suffix}`, code: `SCA-${suffix}` },
      { id: tenantB, name: `Sync Campus B ${suffix}`, code: `SCB-${suffix}` },
    ]);

    // Seed staff
    await db.insert(staff).values([
      {
        id: staffA,
        email: `${staffA}@thaiba.edu`,
        employeeId: `EMP-SA-${suffix}`,
        firstName: "Staff",
        lastName: "A",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
      {
        id: staffB,
        email: `${staffB}@thaiba.edu`,
        employeeId: `EMP-SB-${suffix}`,
        firstName: "Staff",
        lastName: "B",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(offlineSyncOutbox).where(eq(offlineSyncOutbox.tenantId, tenantA));
    await db.delete(offlineSyncOutbox).where(eq(offlineSyncOutbox.tenantId, tenantB));
    await db.delete(mobileSyncProcessed).where(eq(mobileSyncProcessed.staffId, staffA));
    await db.delete(mobileSyncProcessed).where(eq(mobileSyncProcessed.staffId, staffB));
  });

  beforeEach(() => {
    setSession(staffA, tenantA, "staff", ["mobile:sync"]);
  });

  describe("1. Payload Boundaries & Malformed JSON Protection", () => {
    it("rejects malformed non-JSON payloads with 400 Bad Request on sync endpoint", async () => {
      const req = new Request("http://localhost/api/mobile/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json... }",
      });

      const res = await syncBatchPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid JSON request payload");
    });

    it("enforces batch mutation limit of 500 items on sync route", async () => {
      const oversizedMutations = Array.from({ length: 501 }, (_, i) => ({
        id: `mut_over_${i}`,
        action: "task_update",
        timestamp: new Date().toISOString(),
        payload: { id: `t_${i}` },
      }));

      const req = makeJsonReq("http://localhost/api/mobile/v1/sync", {
        mutations: oversizedMutations,
      });

      const res = await syncBatchPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Batch size exceeds limit of 500 mutations");
    });

    it("enforces batch mutation limit of 500 items on push route", async () => {
      const oversizedMutations = Array.from({ length: 501 }, (_, i) => ({
        id: `mut_push_over_${i}`,
        mutationType: "UPDATE",
        entityType: "task",
        clientTimestamp: new Date().toISOString(),
        payload: { id: `t_${i}` },
      }));

      const req = makeJsonReq("http://localhost/api/mobile/v1/sync/push", {
        deviceId: "dev_test_limit",
        mutations: oversizedMutations,
      });

      const res = await pushSync(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Batch size exceeds limit of 500 mutations");
    });
  });

  describe("2. Timestamp & Query Parameter Hardening", () => {
    it("rejects invalid 'since' timestamp format on delta pull endpoint with 400", async () => {
      const req = new Request("http://localhost/api/mobile/v1/sync/pull?since=invalid-date-stamp", {
        method: "GET",
      });

      const res = await pullSync(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid 'since' timestamp format");
    });

    it("accepts valid ISO 'since' timestamp on delta pull endpoint with 200", async () => {
      const req = new Request("http://localhost/api/mobile/v1/sync/pull?since=2026-10-01T00:00:00.000Z", {
        method: "GET",
      });

      const res = await pullSync(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deltas).toEqual([]);
      expect(json.since).toBe("2026-10-01T00:00:00.000Z");
    });

    it("rejects invalid 'since' timestamp on conflicts listing endpoint with 400", async () => {
      const req = new Request("http://localhost/api/mobile/v1/sync/conflicts?since=not-a-timestamp", {
        method: "GET",
      });

      const res = await getConflicts(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid 'since' timestamp format");
    });

    it("returns sync tuning policies dictionary cleanly", async () => {
      const req = new Request("http://localhost/api/mobile/v1/sync/policies", {
        method: "GET",
      });

      const res = await getPolicies(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(typeof json).toBe("object");
    });
  });

  describe("3. Multi-Tenant Boundary & Conflict Resolution Concurrency", () => {
    const conflictId = `conf_test_${suffix}`;

    beforeAll(async () => {
      await db.insert(offlineSyncOutbox).values({
        id: conflictId,
        tenantId: tenantA,
        userId: staffA,
        deviceId: "dev_phone_a",
        mutationType: "UPDATE",
        entityType: "task",
        payloadJson: JSON.stringify({ id: `t_conf_${suffix}`, status: "completed" }),
        clientTimestamp: new Date().toISOString(),
        syncStatus: "CONFLICT",
        conflictDetailsJson: JSON.stringify({
          institutionId: tenantA,
          clientEventId: `evt_conf_${suffix}`,
          entityId: `t_conf_${suffix}`,
          action: "task_update",
          fields: ["status"],
          status: "CONFLICT",
          resolvedAt: null,
        }),
      });
    });

    it("blocks cross-tenant access when resolving conflicts from another tenant with 404", async () => {
      // User from tenantB attempts to resolve tenantA's conflict
      setSession(staffB, tenantB, "staff", ["mobile:sync"]);

      const req = makeJsonReq(
        `http://localhost/api/mobile/v1/sync/conflicts/${conflictId}/resolve`,
        { fields: { status: "completed" } }
      );

      const res = await resolveConflict(req, { params: Promise.resolve({ id: conflictId }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Conflict not found");
    });

    it("rejects resolution if immutable fields are specified with 400", async () => {
      setSession(staffA, tenantA, "staff", ["mobile:sync"]);

      const req = makeJsonReq(
        `http://localhost/api/mobile/v1/sync/conflicts/${conflictId}/resolve`,
        { fields: { id: "new_id_attempt", status: "completed" } }
      );

      const res = await resolveConflict(req, { params: Promise.resolve({ id: conflictId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("immutable and cannot be resolved");
    });

    it("successfully resolves conflict for owner and rejects second concurrent resolution with 409", async () => {
      setSession(staffA, tenantA, "staff", ["mobile:sync"]);

      const req = makeJsonReq(
        `http://localhost/api/mobile/v1/sync/conflicts/${conflictId}/resolve`,
        { fields: { status: "completed" } }
      );

      // First resolution succeeds
      const res = await resolveConflict(req, { params: Promise.resolve({ id: conflictId }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.conflict.status).toBe("SYNCED");

      // Second resolution fails with 409 Conflict because status is already SYNCED
      const req2 = makeJsonReq(
        `http://localhost/api/mobile/v1/sync/conflicts/${conflictId}/resolve`,
        { fields: { status: "completed" } }
      );
      const res2 = await resolveConflict(req2, { params: Promise.resolve({ id: conflictId }) });
      expect(res2.status).toBe(409);
      const json2 = await res2.json();
      expect(json2.error).toBe("Conflict is already resolved");
    });
  });

  describe("4. Non-Owner and NEEDS_REVIEW Privilege Enforcement", () => {
    it("blocks non-owners without sync:manage from viewing others' conflicts with 403", async () => {
      setSession(staffA, tenantA, "staff", ["mobile:sync"]);

      const req = new Request(`http://localhost/api/mobile/v1/sync/conflicts?userId=${staffB}`, {
        method: "GET",
      });

      const res = await getConflicts(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
    });

    it("allows administrators with sync:manage to query other users' conflicts", async () => {
      setSession(staffA, tenantA, "admin", ["mobile:sync", "sync:manage"]);

      const req = new Request(`http://localhost/api/mobile/v1/sync/conflicts?userId=${staffB}`, {
        method: "GET",
      });

      const res = await getConflicts(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.conflicts)).toBe(true);
    });
  });
});
