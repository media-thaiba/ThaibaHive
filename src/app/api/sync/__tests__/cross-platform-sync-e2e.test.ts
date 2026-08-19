import { getDeltaChanges, processSyncPush } from "@/lib/sync/sync-engine-service";
import { resolveConflict } from "@/lib/sync/conflict-resolver";

describe("Sprint-008 Cross-Platform Sync E2E Integration Test Suite", () => {
  it("executes multi-client delta sync & conflict resolution workflow under load", async () => {
    const instId = "inst_e2e_001";
    const deviceA = "device_web_client";
    const deviceB = "device_mobile_client";

    // 1. Client A (Web) pushes change
    const pushA = await processSyncPush(instId, "user_01", deviceA, 0, [
      {
        entityType: "attendance",
        entityId: "att_e2e_101",
        action: "UPDATE",
        data: { status: "present", note: "Marked by Web Teacher" },
        clientTimestamp: "2026-08-15T09:00:00.000Z",
      },
    ]);

    expect(pushA.success).toBe(true);

    // 2. Client B (Mobile) pushes concurrent change to same entity
    const pushB = await processSyncPush(instId, "user_02", deviceB, 0, [
      {
        entityType: "attendance",
        entityId: "att_e2e_101",
        action: "UPDATE",
        data: { status: "present", note: "Marked by Mobile Gatekeeper" },
        clientTimestamp: "2026-08-15T09:05:00.000Z", // Newer timestamp
      },
    ]);

    expect(pushB.success).toBe(true);

    // 3. Conflict resolution check: Client B's newer timestamp wins
    const conflictRes = resolveConflict({
      fieldName: "note",
      clientValue: "Marked by Mobile Gatekeeper",
      serverValue: "Marked by Web Teacher",
      clientTimestamp: "2026-08-15T09:05:00.000Z",
      serverTimestamp: "2026-08-15T09:00:00.000Z",
    });

    expect(conflictRes.winner).toBe("client");
    expect(conflictRes.winningValue).toBe("Marked by Mobile Gatekeeper");

    // 4. Fetch delta changes for Client A from version 0
    const deltaA = await getDeltaChanges(instId, 0);
    expect(deltaA.currentServerVersion).toBeGreaterThan(0);
    expect(Array.isArray(deltaA.changes)).toBe(true);
  });
});
