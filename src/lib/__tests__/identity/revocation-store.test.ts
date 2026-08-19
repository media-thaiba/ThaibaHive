import { RevocationStore, revokeSession } from "@/lib/identity/revocation-store";

jest.mock("@/lib/identity/identity-audit-events", () => ({
  logIdentityEvent: jest.fn().mockResolvedValue(undefined),
}));

describe("RevocationStore", () => {
  let store: RevocationStore;

  beforeEach(() => {
    store = RevocationStore.getInstance();
    store._reset();
  });

  it("marks a session as revoked", () => {
    store.revoke("session-001", "user-001", "admin action");
    expect(store.isRevoked("session-001")).toBe(true);
  });

  it("returns false for non-revoked sessions", () => {
    expect(store.isRevoked("session-unknown")).toBe(false);
  });

  it("returns accurate stats after revocations", () => {
    store.revoke("s1", "u1", "test");
    store.revoke("s2", "u2", "test");
    const stats = store.getStats();
    expect(stats.revokedCount).toBe(2);
    expect(stats.bloomSizeBytes).toBeGreaterThan(0);
  });

  it("returns singleton instance", () => {
    const a = RevocationStore.getInstance();
    const b = RevocationStore.getInstance();
    expect(a).toBe(b);
  });
});

describe("revokeSession", () => {
  it("revokes session and logs identity event", async () => {
    const { logIdentityEvent } = await import("@/lib/identity/identity-audit-events");
    const store = RevocationStore.getInstance();
    store._reset();

    await revokeSession("sess-123", "user-xyz", "suspicious activity", "inst-001");

    expect(store.isRevoked("sess-123")).toBe(true);
    expect(logIdentityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "session.revoked",
        userId: "user-xyz",
        institutionId: "inst-001",
      }),
    );
  });
});
