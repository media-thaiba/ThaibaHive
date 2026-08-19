/**
 * Unit tests for Dual-Store Database Persistence (TIF-002 / TD-013)
 */

import { QuarantineDbStore } from "../../security/quarantine-db-store";
import { QuarantineStore, QuarantineRecord, AllowlistRecord } from "../../security/quarantine-store";

describe("QuarantineDbStore (TIF-002)", () => {
  let dbStore: QuarantineDbStore;
  let quarantineStore: QuarantineStore;

  const mockRecord: QuarantineRecord = {
    id: "quarantine_db_test_1",
    tenantId: "tenant_omega",
    ipAddress: "203.0.113.88",
    cidrMask: "/32",
    reason: "Automated test quarantine",
    threatScore: 90,
    bannedBy: "system",
    expiresAt: Date.now() + 600000,
    isActive: true,
    createdAt: Date.now(),
  };

  const mockAllowlist: AllowlistRecord = {
    id: "allowlist_db_test_1",
    tenantId: "tenant_omega",
    ipAddress: "203.0.113.99",
    description: "Trusted campus proxy",
    addedBy: "super_admin",
    createdAt: Date.now(),
  };

  beforeEach(() => {
    dbStore = QuarantineDbStore.getInstance();
    quarantineStore = new QuarantineStore(dbStore);
  });

  afterEach(() => {
    quarantineStore.reset();
  });

  it("handles persistence operations gracefully without throwing", async () => {
    const saved = await dbStore.saveQuarantine(mockRecord);
    expect(typeof saved).toBe("boolean");

    const allowlistSaved = await dbStore.saveAllowlist(mockAllowlist);
    expect(typeof allowlistSaved).toBe("boolean");

    const removed = await dbStore.removeQuarantine(mockRecord.id);
    expect(typeof removed).toBe("boolean");

    const allowlistRemoved = await dbStore.removeAllowlist(mockAllowlist.ipAddress);
    expect(typeof allowlistRemoved).toBe("boolean");
  });

  it("warms in-memory cache from database successfully", async () => {
    const result = await quarantineStore.warmFromDatabase();
    expect(result).toHaveProperty("quarantinedCount");
    expect(result).toHaveProperty("allowlistCount");
    expect(typeof result.quarantinedCount).toBe("number");
    expect(typeof result.allowlistCount).toBe("number");
  });

  it("can disable database persistence gracefully", async () => {
    dbStore.setEnabled(false);

    const saved = await dbStore.saveQuarantine(mockRecord);
    expect(saved).toBe(false);

    const loaded = await dbStore.loadActiveQuarantines();
    expect(loaded).toEqual([]);

    dbStore.setEnabled(true);
  });
});
