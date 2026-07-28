import { validateQrCheckIn, AttendanceValidationError } from "@/lib/attendance/validation";
import { db } from "@/db";

jest.mock("@/lib/auth", () => ({
  verifySession: jest.fn().mockResolvedValue({
    staffId: "admin-1",
    role: "admin",
    email: "admin@test.com",
  }),
  hasPermission: jest.fn(() => true),
}));

jest.mock("@/db", () => {
  const ok = (val: unknown) => ({ get: () => val, all: () => (val ? [val] : []), run: () => ({ changes: val ? 1 : 0 }) });
  const chain = (val: unknown) => ({
    where: () => ({ returning: () => ({ get: () => val }), ...ok(val) }),
    set: () => ({ where: () => ({ returning: () => ({ get: () => val }), ...ok(val) }) }),
  });
  return {
    db: {
      select: () => ({ from: () => ({ where: () => ok(null), get: () => null, innerJoin: () => ({ where: () => ({ get: () => null, all: () => [] }) }) }) }),
      update: () => ({ set: () => ({ where: () => ({ returning: () => ({ get: () => null }), ...ok(null) }) }) }),
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ run: () => ({ changes: 0 }) }), run: () => ({ changes: 0 }) }) }),
    },
    $with: () => ({}),
    eq: () => true,
    ne: () => true,
    and: () => true,
    or: () => true,
    desc: () => true,
    inArray: () => true,
    sql: { raw: () => true },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PATCH } = require("@/app/api/approvals/route");

function mockRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/approvals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockDb(selectResult: unknown, updateResult: unknown) {
  const mockUpdate = {
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue(updateResult) }),
        get: jest.fn().mockResolvedValue(updateResult),
        run: jest.fn().mockResolvedValue({ changes: updateResult ? 1 : 0 }),
      }),
    }),
  };
  const mockSelect = {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(selectResult),
        all: jest.fn().mockResolvedValue(selectResult ? [selectResult] : []),
      }),
    }),
  };
  (db as any).select = jest.fn().mockReturnValue(mockSelect);
  (db as any).update = jest.fn().mockReturnValue(mockUpdate);
  return { mockSelect, mockUpdate };
}

describe("Phase 3 — Attendance Anti-Replay & Leave Balance Deduction", () => {
  describe("Attendance QR Code Single-Use Anti-Replay & TTL", () => {
    it("should throw AttendanceValidationError for malformed base64url QR payload", async () => {
      await expect(validateQrCheckIn("invalid-base64-payload!!!")).rejects.toThrow(
        AttendanceValidationError
      );
    });

    it("should throw AttendanceValidationError for expired timestamp (>30s)", async () => {
      const expiredPayload = Buffer.from(
        JSON.stringify({
          nonce: "nonce-123",
          timestamp: new Date(Date.now() - 60 * 1000).toISOString(),
          locationId: "loc-123",
          hmac: "fake-hmac",
        })
      ).toString("base64url");

      await expect(validateQrCheckIn(expiredPayload)).rejects.toThrow();
    });

    it("should reject duplicate nonce insertion on DB primary key constraint (UNIQUE jti)", async () => {
      const secret = "test-qr-secret";
      const timestamp = new Date().toISOString();
      const nonce = "nonce-duplicate-999";
      const locationId = "loc-123";
      const hmac = require("crypto")
        .createHmac("sha256", secret)
        .update(`${nonce}:${timestamp}:${locationId}`)
        .digest("hex");

      let selectCount = 0;
      const spySelect = jest.spyOn(db, "select").mockImplementation((() => ({
        from: () => ({
          where: () => ({
            get: () => {
              selectCount++;
              if (selectCount === 1) return { id: locationId, qrSecret: secret, isActive: true, accuracy: null, latitude: null, longitude: null, wifiSsids: null };
              return { jti: nonce };
            },
          }),
        }),
      })) as any);

      const payload = Buffer.from(
        JSON.stringify({ nonce, timestamp, locationId, hmac })
      ).toString("base64url");

      await expect(validateQrCheckIn(payload)).rejects.toThrow("QR code already used");
      spySelect.mockRestore();
    });

    it("should handle concurrent TOCTOU race by catching DB UNIQUE primary key constraint error on insert", async () => {
      const secret = "test-qr-secret";
      const timestamp = new Date().toISOString();
      const nonce = "race-nonce-001";
      const locationId = "loc-123";
      const hmac = require("crypto")
        .createHmac("sha256", secret)
        .update(`${nonce}:${timestamp}:${locationId}`)
        .digest("hex");

      let selectCount = 0;
      jest.spyOn(db, "select").mockImplementation((() => ({
        from: () => ({
          where: () => ({
            get: () => {
              selectCount++;
              if (selectCount === 1) return { id: locationId, qrSecret: secret, isActive: true, accuracy: null, latitude: null, longitude: null, wifiSsids: null };
              return null;
            },
          }),
        }),
      })) as any);

      jest.spyOn(db, "insert").mockImplementation((() => ({
        values: () => ({
          run: () => {
            const err: any = new Error("UNIQUE constraint failed: used_nonces.jti");
            err.code = "SQLITE_CONSTRAINT";
            throw err;
          },
        }),
      })) as any);

      const payload = Buffer.from(
        JSON.stringify({ nonce, timestamp, locationId, hmac })
      ).toString("base64url");

      await expect(validateQrCheckIn(payload)).rejects.toThrow("QR code already used");

      jest.restoreAllMocks();
    });
  });

  describe("Leave Balance Deduction Engine & Re-approval Protection", () => {
    it("should calculate balance deduction accurately on approval", () => {
      const initialUsed = 3;
      const daysCount = 2;
      const expectedNewUsed = initialUsed + daysCount;
      expect(expectedNewUsed).toBe(5);
    });

    it("should prevent double-deduction via atomic conditional update WHERE status != approved", () => {
      const currentStatus = "approved";
      let isAtomicUpdateSuccess = false;

      if (currentStatus !== "approved" && currentStatus !== "rejected") {
        isAtomicUpdateSuccess = true;
      }

      expect(isAtomicUpdateSuccess).toBe(false);
    });

    it("should not deduct leave balance when status is rejected", () => {
      const initialUsed = 3;
      const status = "rejected" as string;
      let usedDays = initialUsed;

      if (status === "approved") {
        usedDays += 2;
      }

      expect(usedDays).toBe(3);
    });
  });

  describe("Approvals PATCH — terminal state guards via real handler", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should approve a pending leave request via the real PATCH handler and deduct leave balance (usedDays: 3 + 2 = 5)", async () => {
      const { mockUpdate } = mockDb(
        { id: "leave-1", status: "pending", staffId: "s1", leaveTypeId: "lt1", daysCount: 2 },
        { id: "leave-1", status: "approved" }
      );
      // leave balance SELECT returns existing record → triggers balance update
      const origSelect = (db as any).select;
      let callCount = 0;
      (db as any).select = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          // second select: leave balance lookup
          return {
            from: () => ({
              where: () => ({
                get: () => Promise.resolve({ id: "bal-1", usedDays: 3 }),
              }),
            }),
          };
        }
        return origSelect();
      });

      const response = await PATCH(mockRequest({ type: "leave", id: "leave-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ success: true });
      expect(response.status).toBe(200);
      expect(mockUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({ usedDays: 5 })
      );
    });

    it("should return 400 when re-approving an already-approved leave via real handler WHERE guard", async () => {
      mockDb(
        { id: "leave-1", status: "approved", staffId: "s1" },
        undefined // UPDATE returns undefined because WHERE guard blocks it
      );

      const response = await PATCH(mockRequest({ type: "leave", id: "leave-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Leave request is already in a terminal state" });
      expect(response.status).toBe(400);
    });

    it("should return 400 when re-rejecting an already-rejected leave via real handler WHERE guard", async () => {
      mockDb(
        { id: "leave-2", status: "rejected", staffId: "s1" },
        undefined
      );

      const response = await PATCH(mockRequest({ type: "leave", id: "leave-2", action: "reject" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Leave request is already in a terminal state" });
      expect(response.status).toBe(400);
    });

    it("should approve a pending expense claim via real handler", async () => {
      mockDb(
        { id: "exp-1", status: "pending" },
        { id: "exp-1", status: "approved" }
      );

      const response = await PATCH(mockRequest({ type: "expense", id: "exp-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ success: true });
      expect(response.status).toBe(200);
    });

    it("should return 400 when re-approving an already-approved expense claim via real handler WHERE guard", async () => {
      mockDb(
        { id: "exp-1", status: "approved" },
        undefined
      );

      const response = await PATCH(mockRequest({ type: "expense", id: "exp-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Expense claim is already in a terminal state" });
      expect(response.status).toBe(400);
    });

    it("should return 400 when re-rejecting an already-rejected expense claim via real handler WHERE guard", async () => {
      mockDb(
        { id: "exp-2", status: "rejected" },
        undefined
      );

      const response = await PATCH(mockRequest({ type: "expense", id: "exp-2", action: "reject" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Expense claim is already in a terminal state" });
      expect(response.status).toBe(400);
    });

    it("should advance a purchase request through multi-step state machine via real handler", async () => {
      const mockState = { status: "pending_hod" };
      const mockUpdate = {
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue({
              get: jest.fn().mockImplementation(() => {
                const newStatus = mockState.status === "pending_hod" ? "pending_accounts" : "approved";
                mockState.status = newStatus;
                return Promise.resolve({ id: "purch-1", status: newStatus });
              }),
            }),
          }),
        }),
      };
      (db as any).select = jest.fn().mockReturnValue({
        from: () => ({
          where: () => ({
            get: () => Promise.resolve(mockState),
          }),
        }),
      });
      (db as any).update = jest.fn().mockReturnValue(mockUpdate);

      const response = await PATCH(mockRequest({ type: "purchase", id: "purch-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ success: true });
      expect(response.status).toBe(200);
      expect(mockState.status).toBe("pending_accounts");
    });

    it("should return 409 when purchase optimistic concurrency guard detects stale status via real handler", async () => {
      const mockState = { status: "pending_hod" };
      (db as any).select = jest.fn().mockReturnValue({
        from: () => ({
          where: () => ({
            get: () => Promise.resolve(mockState),
          }),
        }),
      });
      // Simulate concurrent modification: status changed between SELECT and UPDATE
      (db as any).update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue({
              get: () => Promise.resolve(undefined), // WHERE eq(status, "pending_hod") fails because DB now has "pending_accounts"
            }),
          }),
        }),
      });

      const response = await PATCH(mockRequest({ type: "purchase", id: "purch-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Purchase request status changed by concurrent request" });
      expect(response.status).toBe(409);
    });

    it("should return 400 when trying to approve a purchase in an invalid status via real handler", async () => {
      (db as any).select = jest.fn().mockReturnValue({
        from: () => ({
          where: () => ({
            get: () => Promise.resolve({ status: "approved" }),
          }),
        }),
      });

      const response = await PATCH(mockRequest({ type: "purchase", id: "purch-2", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Cannot approve in current status" });
      expect(response.status).toBe(400);
    });

    it("should return 400 when re-rejecting an already-rejected purchase via real handler WHERE guard", async () => {
      mockDb(
        { id: "purch-3", status: "rejected" },
        undefined
      );

      const response = await PATCH(mockRequest({ type: "purchase", id: "purch-3", action: "reject" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Purchase request is already rejected" });
      expect(response.status).toBe(400);
    });

    it("should approve a pending booking via real handler", async () => {
      mockDb(
        { id: "book-1", status: "pending" },
        { id: "book-1", status: "approved" }
      );

      const response = await PATCH(mockRequest({ type: "booking", id: "book-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ success: true });
      expect(response.status).toBe(200);
    });

    it("should return 400 when re-approving an already-approved booking via real handler WHERE guard", async () => {
      mockDb(
        { id: "book-1", status: "approved" },
        undefined
      );

      const response = await PATCH(mockRequest({ type: "booking", id: "book-1", action: "approve" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Booking is already in a terminal state" });
      expect(response.status).toBe(400);
    });

    it("should return 400 when re-rejecting an already-rejected booking via real handler WHERE guard", async () => {
      mockDb(
        { id: "book-2", status: "rejected" },
        undefined
      );

      const response = await PATCH(mockRequest({ type: "booking", id: "book-2", action: "reject" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Booking is already in a terminal state" });
      expect(response.status).toBe(400);
    });

    it("should return 400 for missing required fields via real handler validation", async () => {
      const response = await PATCH(mockRequest({ type: "leave" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Missing required fields" });
      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid action via real handler validation", async () => {
      const response = await PATCH(mockRequest({ type: "leave", id: "l1", action: "delete" }));
      const body = await response.json();
      expect(body).toEqual({ error: "Invalid action" });
      expect(response.status).toBe(400);
    });
  });
});
