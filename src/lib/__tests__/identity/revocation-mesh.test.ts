import { publishRevocation, subscribeToRevocations } from "@/lib/identity/revocation-mesh";

jest.mock("@/lib/identity/revocation-store", () => ({
  revocationStore: { revoke: jest.fn() },
  revokeSession: jest.fn(),
}));

jest.mock("@/lib/identity/identity-audit-events", () => ({
  logIdentityEvent: jest.fn().mockResolvedValue(undefined),
}));

describe("RevocationMesh", () => {
  it("publishes a revocation event via EventBus without throwing", () => {
    expect(() => {
      publishRevocation("sess-1", "user-1", "test reason");
    }).not.toThrow();
  });

  it("subscribeToRevocations returns an unsubscribe function", () => {
    const cb = jest.fn();
    const unsub = subscribeToRevocations(cb);
    expect(typeof unsub).toBe("function");
    unsub();
  });
});
