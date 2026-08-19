import {
  aiPredictionRunSchema,
  aiAnomalyUpdateSchema,
  deltaSyncQuerySchema,
  syncPushPayloadSchema,
} from "../validation/schemas";
import { hasPermission } from "@thaiba/auth/roles";



describe("Sprint-008 Validation Schemas & RBAC Permissions", () => {
  describe("aiPredictionRunSchema", () => {
    it("validates valid AI prediction request parameters", () => {
      const valid = {
        domain: "attendance",
        targetEntityId: "stu_123",
        targetEntityType: "student",
        timeframeDays: 30,
      };
      const result = aiPredictionRunSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid prediction domain", () => {
      const invalid = { domain: "unknown_domain" };
      const result = aiPredictionRunSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("aiAnomalyUpdateSchema", () => {
    it("validates anomaly status update", () => {
      const valid = { status: "investigating", resolutionNotes: "Investigating canteen transaction surge." };
      const result = aiAnomalyUpdateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const invalid = { status: "pending" };
      const result = aiAnomalyUpdateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("deltaSyncQuerySchema", () => {
    it("validates delta sync query parameters", () => {
      const valid = { sinceVersion: "10", limit: "100", deviceId: "device_abc" };
      const result = deltaSyncQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sinceVersion).toBe(10);
        expect(result.data.limit).toBe(100);
      }
    });

    it("rejects missing deviceId", () => {
      const invalid = { sinceVersion: 0 };
      const result = deltaSyncQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("syncPushPayloadSchema", () => {
    it("validates sync push change payload", () => {
      const valid = {
        deviceId: "dev_99",
        clientSyncVersion: 15,
        changes: [
          {
            entityType: "attendance",
            entityId: "att_101",
            action: "UPDATE",
            data: { status: "present" },
          },
        ],
      };
      const result = syncPushPayloadSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("RBAC Permissions Integration", () => {
    it("grants analytics and sync permissions to admin and principal", () => {
      expect(hasPermission("admin", "analytics:predict")).toBe(true);
      expect(hasPermission("admin", "analytics:manage")).toBe(true);
      expect(hasPermission("admin", "sync:manage")).toBe(true);
      expect(hasPermission("principal", "analytics:predict")).toBe(true);
      expect(hasPermission("principal", "sync:device")).toBe(true);
    });

    it("grants selective permissions to hod and staff", () => {
      expect(hasPermission("hod", "analytics:predict")).toBe(true);
      expect(hasPermission("hod", "sync:manage")).toBe(false);
      expect(hasPermission("staff", "sync:device")).toBe(true);
      expect(hasPermission("staff", "analytics:manage")).toBe(false);
    });
  });
});
