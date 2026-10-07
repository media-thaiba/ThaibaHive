import { clampClientTimestamp, extractSyncEntityId, SYNC_CLOCK_SKEW_MS } from "../sync-records";

jest.mock("@/db", () => ({
  db: { select: jest.fn(), update: jest.fn(), insert: jest.fn(), delete: jest.fn() },
}));

describe("clampClientTimestamp", () => {
  const NOW = Date.parse("2026-10-07T12:00:00.000Z");

  it("keeps timestamps inside the window untouched", () => {
    const inside = "2026-10-05T12:00:00.000Z";
    expect(clampClientTimestamp(inside, NOW)).toBe(inside);
  });

  it("clamps stale timestamps up to serverNow - 7d", () => {
    const clamped = Date.parse(clampClientTimestamp("2000-01-01T00:00:00.000Z", NOW));
    expect(clamped).toBe(NOW - SYNC_CLOCK_SKEW_MS);
  });

  it("clamps future timestamps down to serverNow (never future)", () => {
    const clamped = Date.parse(clampClientTimestamp("2099-01-01T00:00:00.000Z", NOW));
    expect(clamped).toBe(NOW);
  });

  it("collapses unparseable timestamps to serverNow", () => {
    expect(Date.parse(clampClientTimestamp("not-a-date", NOW))).toBe(NOW);
  });
});

describe("extractSyncEntityId", () => {
  it("uses the purchase request id for finance purchase actions", () => {
    expect(
      extractSyncEntityId("finance_purchase_action", { purchaseRequestId: "pr_1" })
    ).toBe("pr_1");
  });

  it("uses the reconciliation item id", () => {
    expect(extractSyncEntityId("finance_reconciliation_match", { itemId: "item_1" })).toBe(
      "item_1"
    );
  });

  it("keys attendance punches on the event DATE", () => {
    expect(extractSyncEntityId("attendance_punch", { mode: "out", at: "2026-10-05T17:30:00.000Z" })).toBe(
      "2026-10-05"
    );
  });

  it("returns null for CREATEs (nothing to compare server-side)", () => {
    expect(extractSyncEntityId("leave_apply", { leave_type_id: "lt_1" })).toBeNull();
    expect(extractSyncEntityId("task_create", { title: "x" })).toBeNull();
    expect(extractSyncEntityId("expense_create", { amount: 10 })).toBeNull();
    expect(extractSyncEntityId("attendance_nfc_checkin", { tagData: {} })).toBeNull();
  });

  it("falls back to payload.id for update/delete actions", () => {
    expect(extractSyncEntityId("task_update", { id: "t_1", status: "done" })).toBe("t_1");
    expect(extractSyncEntityId("leave_cancel", { id: "lv_1" })).toBe("lv_1");
  });

  it("returns null when the id reference is missing", () => {
    expect(extractSyncEntityId("task_update", {})).toBeNull();
    expect(extractSyncEntityId("finance_purchase_action", {})).toBeNull();
  });
});
