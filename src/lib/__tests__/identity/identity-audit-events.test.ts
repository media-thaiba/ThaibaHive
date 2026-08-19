import { logIdentityEvent, type IdentityEventType } from "@/lib/identity/identity-audit-events";

// Mock cryptoAuditWriter
jest.mock("@/lib/audit/crypto-writer", () => ({
  cryptoAuditWriter: {
    log: jest.fn().mockResolvedValue({ id: "test-audit-id" }),
  },
}));

import { cryptoAuditWriter } from "@/lib/audit/crypto-writer";
const mockLog = cryptoAuditWriter.log as jest.Mock;

describe("logIdentityEvent", () => {
  beforeEach(() => {
    mockLog.mockClear();
  });

  const eventTypes: IdentityEventType[] = [
    "dpop.proof.validated",
    "dpop.proof.rejected",
    "session.revoked",
    "risk.stepup.triggered",
    "risk.stepup.completed",
    "risk.stepup.failed",
    "fingerprint.drift.detected",
    "migration.token.legacy",
    "revocation.propagated",
  ];

  it.each(eventTypes)("logs event type: %s to audit chain", async (eventType) => {
    await logIdentityEvent({
      eventType,
      userId: "user-001",
      institutionId: "inst-001",
      deviceThumbprint: "thumb-abc",
      riskScore: 42,
    });

    expect(mockLog).toHaveBeenCalledTimes(1);
    const call = mockLog.mock.calls[0][0];
    expect(call.tenantId).toBe("inst-001");
    expect(call.userId).toBe("user-001");
    expect(call.entityType).toBe("IDENTITY");
    expect(call.payload.eventType).toBe(eventType);
    expect(call.payload.riskScore).toBe(42);
  });

  it("falls back to default tenantId when institutionId omitted", async () => {
    await logIdentityEvent({ eventType: "session.revoked", userId: "u1" });
    expect(mockLog.mock.calls[0][0].tenantId).toBe("default");
  });
});
