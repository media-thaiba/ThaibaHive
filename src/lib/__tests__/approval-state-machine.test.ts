describe("Approval State Machine Transitions", () => {
  type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled" | "disbursed";

  const VALID_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
    pending: ["approved", "rejected", "cancelled"],
    approved: ["disbursed", "cancelled"],
    rejected: [],
    cancelled: [],
    disbursed: [],
  };

  function canTransition(current: ApprovalStatus, next: ApprovalStatus): boolean {
    return VALID_TRANSITIONS[current]?.includes(next) ?? false;
  }

  it("should allow valid pending transitions (approved, rejected, cancelled)", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
  });

  it("should allow approved transition to disbursed", () => {
    expect(canTransition("approved", "disbursed")).toBe(true);
    expect(canTransition("approved", "cancelled")).toBe(true);
  });

  it("should reject terminal state transitions (rejected -> approved)", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("cancelled", "approved")).toBe(false);
    expect(canTransition("disbursed", "approved")).toBe(false);
  });

  it("should reject self-transitions", () => {
    expect(canTransition("pending", "pending")).toBe(false);
    expect(canTransition("approved", "approved")).toBe(false);
  });
});
