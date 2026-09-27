import { applySyncMutation } from "../sync-appliers";
import { db } from "@/db";

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

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of [
    "select",
    "from",
    "where",
    "update",
    "set",
    "insert",
    "values",
    "delete",
    "returning",
  ]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

const STAFF = { staffId: "staff_1", role: "staff" };
const ADMIN = { staffId: "admin_1", role: "admin" };

describe("applySyncMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockSelectOnce(value: unknown) {
    const selectChain = chainable({ get: jest.fn(async () => value) });
    (db.select as jest.Mock).mockReturnValueOnce(selectChain);
    return selectChain;
  }

  function mockUpdateReturning(value: unknown) {
    const updateChain = chainable({ get: jest.fn(async () => value), run: jest.fn(async () => undefined) });
    (db.update as jest.Mock).mockReturnValueOnce(updateChain);
    return updateChain;
  }

  function mockInsert() {
    const insertChain = chainable({ run: jest.fn(async () => undefined), get: jest.fn(async () => ({})) });
    (db.insert as jest.Mock).mockReturnValueOnce(insertChain);
    return insertChain;
  }

  it("leave_apply creates a request scoped to the session user", async () => {
    const txSelect = chainable({ get: jest.fn(async () => ({ totalDays: 12, usedDays: 2 })) });
    const txInsert = chainable({ run: jest.fn(async () => undefined) });
    (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({ select: () => txSelect, insert: () => txInsert })
    );

    await applySyncMutation(STAFF, "leave_apply", {
      leave_type_id: "lt_1",
      start_date: "2026-10-01",
      end_date: "2026-10-02",
      days: 2,
      reason: "Family event",
      staff_id: "victim_9",
    });

    expect(txInsert.values).toHaveBeenCalledTimes(1);
    const row = (txInsert.values as jest.Mock).mock.calls[0][0];
    expect(row.staffId).toBe("staff_1");
    expect(row.status).toBe("pending");
    expect(row.daysCount).toBe(2);
  });

  it("leave_apply rejects insufficient balance", async () => {
    const txSelect = chainable({ get: jest.fn(async () => ({ totalDays: 3, usedDays: 3 })) });
    const txInsert = chainable({ run: jest.fn(async () => undefined) });
    (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: unknown) => unknown) =>
      fn({ select: () => txSelect, insert: () => txInsert })
    );

    await expect(
      applySyncMutation(STAFF, "leave_apply", {
        leave_type_id: "lt_1",
        start_date: "2026-10-01",
        end_date: "2026-10-02",
        days: 2,
      })
    ).rejects.toThrow("Insufficient leave balance");
    expect(txInsert.values).not.toHaveBeenCalled();
  });

  it("leave_cancel works for own pending request, blocked otherwise", async () => {
    mockSelectOnce({ id: "lv_1", staffId: "staff_1", status: "pending" });
    const updateChain = mockUpdateReturning({ id: "lv_1" });
    await applySyncMutation(STAFF, "leave_cancel", { id: "lv_1" });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" })
    );

    mockSelectOnce({ id: "lv_2", staffId: "other_1", status: "pending" });
    await expect(applySyncMutation(STAFF, "leave_cancel", { id: "lv_2" })).rejects.toThrow(
      "not found"
    );

    mockSelectOnce({ id: "lv_3", staffId: "staff_1", status: "approved" });
    await expect(applySyncMutation(STAFF, "leave_cancel", { id: "lv_3" })).rejects.toThrow(
      "already approved"
    );
  });

  it("task_create assigns to the session user by default", async () => {
    const insertChain = mockInsert();
    await applySyncMutation(STAFF, "task_create", { title: "Offline task" });
    const row = (insertChain.values as jest.Mock).mock.calls[0][0];
    expect(row.assignedToId).toBe("staff_1");
    expect(row.assignedById).toBe("staff_1");
    expect(row.status).toBe("todo");
  });

  it("task_update/task_delete enforce ownership", async () => {
    mockSelectOnce({ id: "t_1", assignedToId: "staff_1", assignedById: "staff_1" });
    const updateChain = mockUpdateReturning({ id: "t_1" });
    await applySyncMutation(STAFF, "task_update", { id: "t_1", status: "done" });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done", completedAt: expect.any(String) })
    );

    mockSelectOnce({ id: "t_2", assignedToId: "other_1", assignedById: "other_1" });
    await expect(
      applySyncMutation(STAFF, "task_update", { id: "t_2", status: "done" })
    ).rejects.toThrow("not authorized");

    mockSelectOnce({ id: "t_3", assignedToId: "other_1", assignedById: "other_1" });
    await expect(applySyncMutation(STAFF, "task_delete", { id: "t_3" })).rejects.toThrow(
      "not authorized"
    );
  });

  it("expense_create enforces the receipt rule", async () => {
    const insertChain = mockInsert();
    await applySyncMutation(STAFF, "expense_create", {
      amount: 500,
      category: "travel",
      description: "Bus fare",
    });
    const row = (insertChain.values as jest.Mock).mock.calls[0][0];
    expect(row.staffId).toBe("staff_1");
    expect(row.status).toBe("pending");

    await expect(
      applySyncMutation(STAFF, "expense_create", {
        amount: 1500,
        category: "travel",
        description: "Flight",
      })
    ).rejects.toThrow("Receipt attachment is required");
  });

  it("attendance_nfc_checkin validates the tag then records presence", async () => {
    const { validateNfcCheckIn } = jest.requireMock("@/lib/attendance/validation");
    const insertChain = mockInsert();

    await applySyncMutation(STAFF, "attendance_nfc_checkin", {
      tagData: { id: "tag_abc", payload: "tag_abc" },
      timestamp: "2026-09-27T08:00:00.000Z",
      latitude: 1.1,
      longitude: 2.2,
    });

    expect(validateNfcCheckIn).toHaveBeenCalledWith("staff_1", "tag_abc", 1.1, 2.2, undefined, undefined);
    const row = (insertChain.values as jest.Mock).mock.calls[0][0];
    expect(row).toMatchObject({ staffId: "staff_1", method: "nfc", nfcTagId: "tag_abc" });

    await expect(
      applySyncMutation(STAFF, "attendance_nfc_checkin", { tagData: {} })
    ).rejects.toThrow("NFC tag ID is missing");
    expect(db.insert as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it("approval_approve advances an expense claim and blocks self-approval", async () => {
    mockSelectOnce({ id: "c_1", staffId: "other_1", status: "pending_hod", amount: 1200 });
    const updateChain = mockUpdateReturning({ id: "c_1", status: "approved" });

    await applySyncMutation(ADMIN, "approval_approve", {
      type: "expense",
      id: "c_1",
    });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", reviewedById: "admin_1" })
    );

    mockSelectOnce({ id: "c_2", staffId: "staff_1", status: "pending_hod", amount: 100 });
    await expect(
      applySyncMutation(STAFF, "approval_approve", { type: "expense", id: "c_2" })
    ).rejects.toThrow("own expense claims");
  });

  it("rejects unknown actions", async () => {
    await expect(applySyncMutation(STAFF, "teleport", {})).rejects.toThrow(
      "Unsupported offline action"
    );
  });
});
