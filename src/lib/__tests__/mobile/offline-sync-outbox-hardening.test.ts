/** @jest-environment node */
import { SyncConflictResolver, type EntityRecord, type ClientMutation } from "@/lib/offline/sync-conflict-resolver";
import { clampClientTimestamp, SYNC_CLOCK_SKEW_MS } from "@/lib/mobile/sync-records";
import { db } from "@/db";
import { offlineSyncOutbox, mobileSyncProcessed } from "@/db/schema";
import { POST as syncBatchPost } from "@/app/api/mobile/v1/sync/route";
import { eq } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockResolvedValue({
      staffId: "staff_sec_01",
      role: "admin",
      institutionId: "inst_alpha",
    }),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Offline Sync & Outbox Reliability Hardening", () => {
  const resolver = new SyncConflictResolver();
  const testTenant = "inst_alpha";

  afterEach(async () => {
    // Clean up any test records in outbox or processed tables
    await db.delete(offlineSyncOutbox).where(eq(offlineSyncOutbox.tenantId, testTenant)).run();
    await db.delete(mobileSyncProcessed).where(eq(mobileSyncProcessed.staffId, "staff_sec_01")).run();
  });

  describe("1. Clock Skew Protection & Drift Validation", () => {
    it("clamps far-future timestamps to prevent spoofed LWW overrides", () => {
      const nowMs = 1761000000000; // Deterministic test timestamp
      const tenYearsInFuture = new Date(nowMs + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();

      const clamped = clampClientTimestamp(tenYearsInFuture, nowMs);
      const clampedMs = Date.parse(clamped);

      expect(clampedMs).toBe(nowMs);
      expect(new Date(clamped).toISOString()).toBe(new Date(nowMs).toISOString());
    });

    it("clamps ancient timestamps (> 7 days old) to the maximum allowable skew window", () => {
      const nowMs = 1761000000000;
      const thirtyDaysInPast = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

      const clamped = clampClientTimestamp(thirtyDaysInPast, nowMs);
      const clampedMs = Date.parse(clamped);

      expect(clampedMs).toBe(nowMs - SYNC_CLOCK_SKEW_MS);
    });

    it("leaves normal timestamps within the 7-day window untouched", () => {
      const nowMs = 1761000000000;
      const oneHourAgo = new Date(nowMs - 60 * 60 * 1000).toISOString();

      const clamped = clampClientTimestamp(oneHourAgo, nowMs);
      expect(clamped).toBe(oneHourAgo);
    });
  });

  describe("2. Immutable Identity & Tenant Boundary Shielding", () => {
    it("preserves server identity and tenant keys even when client mutation is newer", () => {
      const serverRecord: EntityRecord = {
        id: "task_legit_001",
        tenantId: "inst_alpha",
        entityType: "task",
        data: {
          id: "task_legit_001",
          institutionId: "inst_alpha",
          title: "Legitimate Campus Task",
          status: "pending",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
        updatedAt: "2026-10-01T10:00:00.000Z",
      };

      const maliciousMutation: ClientMutation = {
        id: "mut_spoof_001",
        mutationType: "UPDATE",
        entityType: "task",
        clientTimestamp: "2026-10-02T12:00:00.000Z", // Newer than server
        payload: {
          id: "task_spoofed_999", // Attempted ID overwrite
          institutionId: "inst_victim_foreign", // Attempted cross-tenant hijacking
          tenantId: "inst_victim_foreign",
          createdAt: "1999-01-01T00:00:00.000Z", // Attempted creation rewrite
          title: "Updated Task Title",
          status: "completed",
        },
      };

      const resolution = resolver.resolveMutation(maliciousMutation, serverRecord);

      expect(resolution.status).toBe("SYNCED");
      expect(resolution.mergedData).toBeDefined();

      // Protected identity fields must remain unaltered from the server record
      expect(resolution.mergedData?.id).toBe("task_legit_001");
      expect(resolution.mergedData?.institutionId).toBe("inst_alpha");
      expect(resolution.mergedData?.createdAt).toBe("2026-10-01T10:00:00.000Z");

      // Legitimate mutable fields are successfully updated
      expect(resolution.mergedData?.title).toBe("Updated Task Title");
      expect(resolution.mergedData?.status).toBe("completed");
    });

    it("resolveFieldLevel strictly retains server identity fields", () => {
      const server = {
        id: "rec_100",
        institutionId: "inst_alpha",
        tenantId: "inst_alpha",
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-10-01T00:00:00Z",
        description: "Original description",
      };

      const client = {
        id: "rec_ATTACK",
        institutionId: "inst_ATTACK",
        tenantId: "inst_ATTACK",
        createdAt: "2020-01-01T00:00:00Z",
        updatedAt: "2026-10-05T00:00:00Z", // newer
        description: "Updated description",
      };

      const merged = resolver.resolveFieldLevel(server, client);

      expect(merged.id).toBe("rec_100");
      expect(merged.institutionId).toBe("inst_alpha");
      expect(merged.tenantId).toBe("inst_alpha");
      expect(merged.createdAt).toBe("2026-09-01T00:00:00Z");
      expect(merged.description).toBe("Updated description");
    });
  });

  describe("3. Dead Letter Queue (DLQ) Resilience & Persistence", () => {
    it("persists invalid/failing mutations into offlineSyncOutbox with NEEDS_REVIEW and isDlq: true", async () => {
      const req = new Request("http://localhost/api/mobile/v1/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: "device_audit_test",
          mutations: [
            {
              id: "evt_bad_action_001",
              action: "leave_apply",
              timestamp: new Date().toISOString(),
              payload: {
                // Missing required leaveTypeId and dates
                reason: "Broken payload test",
              },
            },
          ],
        }),
      });

      const res = await syncBatchPost(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.failedMutations).toContain("evt_bad_action_001");
      expect(json.processedMutations).not.toContain("evt_bad_action_001");

      // Verify DLQ entry exists in offlineSyncOutbox
      const outboxRows = await db
        .select()
        .from(offlineSyncOutbox)
        .where(eq(offlineSyncOutbox.userId, "staff_sec_01"))
        .all();

      const dlqEntry = outboxRows.find((r) => {
        try {
          const details = JSON.parse(r.conflictDetailsJson || "{}");
          return details.clientEventId === "evt_bad_action_001";
        } catch {
          return false;
        }
      });

      expect(dlqEntry).toBeDefined();
      expect(dlqEntry?.syncStatus).toBe("NEEDS_REVIEW");

      const details = JSON.parse(dlqEntry!.conflictDetailsJson!);
      expect(details.isDlq).toBe(true);
      expect(details.clientEventId).toBe("evt_bad_action_001");
      expect(details.action).toBe("leave_apply");
      expect(details.error).toBeDefined();
      expect(details.failedAt).toBeDefined();
    });
  });

  describe("4. Conflict Divergence Thresholds", () => {
    it("marks 1-2 conflicting fields as CONFLICT", () => {
      const serverRecord: EntityRecord = {
        id: "task_01",
        tenantId: "inst_alpha",
        entityType: "task",
        data: {
          id: "task_01",
          title: "Server Title",
          priority: "high",
        },
        updatedAt: "2026-10-10T12:00:00.000Z", // Server is newer
      };

      const clientMutation: ClientMutation = {
        id: "mut_01",
        mutationType: "UPDATE",
        entityType: "task",
        clientTimestamp: "2026-10-10T10:00:00.000Z", // Client is older
        payload: {
          title: "Client Title",
        },
      };

      const resolution = resolver.resolveMutation(clientMutation, serverRecord);
      expect(resolution.status).toBe("CONFLICT");
      expect(resolution.conflictFields).toEqual(["title"]);
    });

    it("escalates 3+ conflicting fields to NEEDS_REVIEW", () => {
      const serverRecord: EntityRecord = {
        id: "task_02",
        tenantId: "inst_alpha",
        entityType: "task",
        data: {
          id: "task_02",
          title: "Server Title",
          priority: "high",
          description: "Server description",
          status: "in_progress",
        },
        updatedAt: "2026-10-10T12:00:00.000Z",
      };

      const clientMutation: ClientMutation = {
        id: "mut_02",
        mutationType: "UPDATE",
        entityType: "task",
        clientTimestamp: "2026-10-10T10:00:00.000Z",
        payload: {
          title: "Client Title",
          priority: "low",
          description: "Client description",
        },
      };

      const resolution = resolver.resolveMutation(clientMutation, serverRecord);
      expect(resolution.status).toBe("NEEDS_REVIEW");
      expect(resolution.conflictFields?.length).toBe(3);
    });
  });
});
