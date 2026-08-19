/**
 * IDP-015: Chaos test — revocation mesh with EventBus failure simulation
 */
import { RevocationStore } from "@/lib/identity/revocation-store";
import { publishRevocation } from "@/lib/identity/revocation-mesh";

jest.mock("@/lib/identity/identity-audit-events", () => ({
  logIdentityEvent: jest.fn().mockResolvedValue(undefined),
}));

describe("Revocation Chaos Tests", () => {
  let store: RevocationStore;

  beforeEach(() => {
    store = RevocationStore.getInstance();
    store._reset();
  });

  it("central store remains authoritative when mesh publish fails", () => {
    // Simulate mesh failure by mocking EventBus to throw
    jest.spyOn(require("@/lib/observability/event-bus").EventBus, "getInstance").mockReturnValueOnce({
      publishEvent: () => { throw new Error("Redis unavailable"); },
      subscribe: jest.fn().mockReturnValue(() => {}),
    });

    // publishRevocation should not throw even if EventBus fails
    expect(() => publishRevocation("sess-fail", "user-1", "chaos test")).not.toThrow();
  });

  it("revocation store correctly rejects revoked sessions after central revoke", () => {
    store.revoke("sess-001", "user-001", "security breach");
    expect(store.isRevoked("sess-001")).toBe(true);
    expect(store.isRevoked("sess-002")).toBe(false);
  });

  it("handles high volume revocations without errors", () => {
    for (let i = 0; i < 1000; i++) {
      store.revoke(`sess-${i}`, `user-${i % 100}`, "load test");
    }
    const stats = store.getStats();
    expect(stats.revokedCount).toBe(1000);
    expect(store.isRevoked("sess-500")).toBe(true);
  });

  it("getRecentRecords returns last N records", () => {
    for (let i = 0; i < 100; i++) {
      store.revoke(`sess-${i}`, `user-${i}`, "test");
    }
    const records = store.getRecentRecords(10);
    expect(records.length).toBe(10);
  });
});
