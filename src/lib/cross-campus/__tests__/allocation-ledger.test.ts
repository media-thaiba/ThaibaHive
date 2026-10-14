import { AllocationLedger } from "../allocation-ledger";

describe("Wave 4: AllocationLedger Cryptographic Audit Trail", () => {
  const bookingId = "ccb_test_booking_1";

  beforeEach(() => {
    AllocationLedger.setUseMemory(true);
    AllocationLedger.clearMemory();
  });

  afterEach(() => {
    AllocationLedger.clearMemory();
  });

  it("appends sequential Merkle entries and verifies chain integrity", async () => {
    // 1. Initial request entry
    const entry1 = await AllocationLedger.recordAllocation(bookingId, "requested", "usr_requester", {
      title: "Science Fair",
      startsAt: "2026-11-01T09:00:00Z",
    });

    expect(entry1.sequence).toBe(1);
    expect(entry1.prevHash).toBe("0".repeat(64));

    // 2. Approval entry
    const entry2 = await AllocationLedger.recordAllocation(bookingId, "approved", "usr_approver", {
      reason: "Approved by Dean",
    });

    expect(entry2.sequence).toBe(2);
    expect(entry2.prevHash).toBe(entry1.entryHash);

    // 3. Confirm entry
    const entry3 = await AllocationLedger.recordAllocation(bookingId, "confirmed", "usr_system", {
      state: "active",
    });

    expect(entry3.sequence).toBe(3);
    expect(entry3.prevHash).toBe(entry2.entryHash);

    // Verify integrity
    const verification = await AllocationLedger.verifyAuditTrail(bookingId);
    expect(verification.valid).toBe(true);
    expect(verification.length).toBe(3);
  });

  it("detects tampering when payload or hash pointer is corrupted", async () => {
    const entry1 = await AllocationLedger.recordAllocation(bookingId, "requested", "usr_1", { key: "v1" });
    const entry2 = await AllocationLedger.recordAllocation(bookingId, "approved", "usr_2", { key: "v2" });

    // Tamper with entry2's payloadHash directly
    entry2.payloadHash = "corrupted_hash";

    const verification = await AllocationLedger.verifyAuditTrail(bookingId);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain("tampering detected");
  });
});
