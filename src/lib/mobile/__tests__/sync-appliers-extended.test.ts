import { applySyncMutation } from "../sync-appliers";
import { db } from "@/db";
import { purchaseApprovalEngine } from "@/lib/finance/purchases/purchase-approval-engine";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    delete: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/attendance/validation", () => ({
  validateNfcCheckIn: jest.fn().mockResolvedValue(undefined),
  AttendanceValidationError: class AttendanceValidationError extends Error {},
}));

jest.mock("@/lib/attendance/shifts", () => ({
  resolveShift: jest.fn(async () => ({ endTime: "17:00" })),
}));

jest.mock("@/lib/finance/purchases/purchase-approval-engine", () => ({
  purchaseApprovalEngine: { processApproval: jest.fn(async () => undefined) },
}));

jest.mock("@/lib/finance/reconciliation/reconciliation-engine", () => ({
  reconciliationEngine: { manualMatchItem: jest.fn(async () => undefined) },
}));

function chainable(terminal: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "update", "set", "insert", "values", "delete", "returning", "limit"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  chain.get = jest.fn(async () => undefined);
  chain.all = jest.fn(async () => []);
  chain.run = jest.fn(async () => undefined);
  Object.assign(chain, terminal);
  return chain;
}

const STAFF = { staffId: "staff_1", role: "staff" };
const SCOPED_ADMIN = { staffId: "admin_1", role: "admin", institutionId: "inst_a" };

describe("applySyncMutation — offline attendance punch (D3*)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.select as jest.Mock).mockImplementation(() => chainable());
    (db.update as jest.Mock).mockImplementation(() => chainable());
  });

  function mockSelectOnce(value: unknown) {
    const chain = chainable({ get: jest.fn(async () => value) });
    (db.select as jest.Mock).mockReturnValueOnce(chain);
    return chain;
  }

  it("records a check-out with worked minutes derived from the existing check-in", async () => {
    const now = Date.now();
    const at = new Date(now - 60 * 60 * 1000).toISOString(); // 1h ago, inside the 48h window
    const date = at.split("T")[0];
    const checkIn = new Date(now - 5 * 60 * 60 * 1000).toISOString(); // 5h ago
    mockSelectOnce({ id: "log_1", staffId: "staff_1", date, checkIn });

    const updateChain = chainable({ run: jest.fn(async () => undefined) });
    (db.update as jest.Mock).mockReturnValueOnce(updateChain);

    await applySyncMutation(STAFF, "attendance_punch", {
      mode: "out",
      at,
      latitude: 1.1,
      longitude: 2.2,
    });

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ checkOut: at, workedMinutes: 240 })
    );
  });

  it("is idempotent when the log is already checked out (replay-safe)", async () => {
    const at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockSelectOnce({
      id: "log_2",
      staffId: "staff_1",
      date: at.split("T")[0],
      checkIn: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      checkOut: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    });

    await applySyncMutation(STAFF, "attendance_punch", { mode: "out", at });

    expect(db.update as jest.Mock).not.toHaveBeenCalled(); // no double write
  });

  it("throws when the punch arrives before its check-in (out-of-order replay)", async () => {
    mockSelectOnce(null);

    const at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await expect(
      applySyncMutation(STAFF, "attendance_punch", { mode: "out", at })
    ).rejects.toThrow("No check-in found");
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });

  it("clamps future-dated punches back to server now", async () => {
    const before = Date.now();
    const future = new Date(before + 24 * 60 * 60 * 1000).toISOString();
    const clampedAt = new Date(before).toISOString(); // what the applier should clamp to
    mockSelectOnce({
      id: "log_3",
      staffId: "staff_1",
      date: clampedAt.split("T")[0], // date derives from the CLAMPED timestamp
      checkIn: new Date(before - 4 * 60 * 60 * 1000).toISOString(),
    });

    const updateChain = chainable({ run: jest.fn(async () => undefined) });
    (db.update as jest.Mock).mockReturnValueOnce(updateChain);

    await applySyncMutation(STAFF, "attendance_punch", { mode: "out", at: future });

    expect(updateChain.set).toHaveBeenCalledTimes(1);
    const written = (updateChain.set as jest.Mock).mock.calls[0][0];
    const writtenMs = Date.parse(String(written.checkOut));
    expect(writtenMs).toBeGreaterThanOrEqual(before);
    expect(writtenMs).toBeLessThanOrEqual(Date.now() + 1000); // never future
    expect(String(written.checkOut)).not.toBe(future);
  });

  it("rejects punch payloads that are not mode:out", async () => {
    await expect(
      applySyncMutation(STAFF, "attendance_punch", { mode: "in", at: new Date().toISOString() })
    ).rejects.toThrow();
    expect(db.update as jest.Mock).not.toHaveBeenCalled();
  });
});

describe("applySyncMutation — finance REST parity (D2-applier)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.select as jest.Mock).mockImplementation(() => chainable());
    (db.update as jest.Mock).mockImplementation(() => chainable());
  });

  it("routes finance_purchase_action through the approval engine with session-derived identity", async () => {
    await applySyncMutation(SCOPED_ADMIN, "finance_purchase_action", {
      purchaseRequestId: "pr_1",
      action: "approved",
      comments: "Looks good",
      tierLevel: 1,
      approverId: "spoofed_staff", // must be ignored — identity comes from ctx
    });

    expect(purchaseApprovalEngine.processApproval).toHaveBeenCalledTimes(1);
    expect(purchaseApprovalEngine.processApproval).toHaveBeenCalledWith({
      purchaseRequestId: "pr_1",
      institutionId: "inst_a", // session scope, not payload
      approverId: "admin_1", // ctx.staffId
      approverRole: "admin", // ctx.role
      action: "approved",
      comments: "Looks good",
      tierLevel: 1,
    });
    expect(purchaseApprovalEngine.processApproval).not.toHaveBeenCalledWith(
      expect.objectContaining({ approverId: "spoofed_staff" })
    );
  });

  it("surfaces engine validation failures as terminal mutation failures", async () => {
    await expect(
      applySyncMutation(SCOPED_ADMIN, "finance_purchase_action", {
        purchaseRequestId: "pr_1",
        action: "teleport",
      })
    ).rejects.toThrow();
    expect(purchaseApprovalEngine.processApproval).not.toHaveBeenCalled();
  });

  it("routes finance_reconciliation_match through the reconciliation engine", async () => {
    await applySyncMutation(SCOPED_ADMIN, "finance_reconciliation_match", {
      itemId: "item_1",
      matchStatus: "manual_override",
      matchedWithId: "ext_9",
      varianceAmount: 12.5,
      resolutionNotes: "Bank fee",
    });

    expect(reconciliationEngine.manualMatchItem).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "item_1",
        matchStatus: "manual_override",
        matchedWithId: "ext_9",
        varianceAmount: 12.5,
        resolutionNotes: "Bank fee",
      })
    );
  });

  it("blocks unauthorized staff without reconciliation permissions", async () => {
    await expect(
      applySyncMutation(STAFF, "finance_reconciliation_match", {
        itemId: "item_1",
        matchStatus: "matched",
      })
    ).rejects.toThrow("Insufficient permissions to reconcile financial items");
  });

  it("requires an itemId for reconciliation matches", async () => {
    await expect(
      applySyncMutation(SCOPED_ADMIN, "finance_reconciliation_match", {
        matchStatus: "matched",
      })
    ).rejects.toThrow("'itemId' is required");
    expect(reconciliationEngine.manualMatchItem).not.toHaveBeenCalled();
  });
});
