import { resolveConflict } from "../conflict-resolver";
import { getDeltaChanges, processSyncPush } from "../sync-engine-service";

describe("Sprint-008 Delta Sync Engine & Conflict Resolver", () => {
  describe("resolveConflict (Field-Level LWW)", () => {
    it("client wins when client timestamp is newer", () => {
      const result = resolveConflict({
        fieldName: "status",
        clientValue: "present",
        serverValue: "absent",
        clientTimestamp: "2026-08-15T10:05:00Z",
        serverTimestamp: "2026-08-15T10:00:00Z",
      });

      expect(result.winner).toBe("client");
      expect(result.winningValue).toBe("present");
      expect(result.isConflict).toBe(true);
    });

    it("server wins when server timestamp is newer", () => {
      const result = resolveConflict({
        fieldName: "notes",
        clientValue: "Updated on mobile",
        serverValue: "Updated on web",
        clientTimestamp: "2026-08-15T10:00:00Z",
        serverTimestamp: "2026-08-15T10:10:00Z",
      });

      expect(result.winner).toBe("server");
      expect(result.winningValue).toBe("Updated on web");
      expect(result.isConflict).toBe(true);
    });

    it("client wins when server value is undefined", () => {
      const result = resolveConflict({
        fieldName: "remarks",
        clientValue: "New remark",
        serverValue: undefined,
        clientTimestamp: "2026-08-15T10:00:00Z",
        serverTimestamp: "2026-08-15T09:00:00Z",
      });

      expect(result.winner).toBe("client");
      expect(result.winningValue).toBe("New remark");
      expect(result.isConflict).toBe(false);
    });
  });

  describe("getDeltaChanges & processSyncPush", () => {
    it("fetches delta changes for client version", async () => {
      const delta = await getDeltaChanges("inst_01", 100);
      expect(delta.currentServerVersion).toBeGreaterThan(100);
      expect(Array.isArray(delta.changes)).toBe(true);
    });

    it("processes sync push payload and updates sync state", async () => {
      const pushRes = await processSyncPush("inst_01", "user_101", "device_m1", 50, [
        {
          entityType: "attendance",
          entityId: "att_001",
          action: "UPDATE",
          data: { status: "present" },
          clientTimestamp: new Date().toISOString(),
        },
      ]);

      expect(pushRes.success).toBe(true);
      expect(pushRes.processedCount).toBe(1);
      expect(pushRes.newServerVersion).toBeGreaterThan(50);
    });
  });
});
