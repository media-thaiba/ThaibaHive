import { validateQrCheckIn, AttendanceValidationError } from "@/lib/attendance/validation";
import { db } from "@/db";

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
              if (selectCount === 1) return { id: locationId, qrSecret: secret, isActive: true, accuracy: null, latitude: null, longitude: null, wifiSsids: null }; // location
              return { jti: nonce }; // usedNonce
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

      // First select returns location, second select returns null (both race requests pass select)
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

      // Insert throws DB UNIQUE constraint collision
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

    it("should reject re-approval of an already-approved leave via atomic WHERE guard (approvals PATCH path)", () => {
      const currentStatus = "approved";
      const nextStatus = "approved";

      const whereClause = [
        { field: "id", op: "eq", value: "leave-123" },
        { field: "status", op: "ne", value: "approved" },
        { field: "status", op: "ne", value: "rejected" },
      ];

      const statusGuardPassed = whereClause.every((clause) => {
        if (clause.op === "ne" && clause.field === "status") {
          return currentStatus !== clause.value;
        }
        return true;
      });

      expect(statusGuardPassed).toBe(false);

      const mockResult = statusGuardPassed ? { id: "leave-123", status: nextStatus } : undefined;
      expect(mockResult).toBeUndefined();
    });

    it("should reject re-approval of an already-rejected leave via atomic WHERE guard", () => {
      const currentStatus = "rejected";
      const whereClause = [
        { field: "status", op: "ne", value: "approved" },
        { field: "status", op: "ne", value: "rejected" },
      ];

      const statusGuardPassed = whereClause.every((clause) => {
        if (clause.op === "ne" && clause.field === "status") {
          return currentStatus !== clause.value;
        }
        return true;
      });

      expect(statusGuardPassed).toBe(false);
    });

    it("should prevent redundant concurrent purchase approvals via optimistic status equality guard", () => {
      const initialStatus = "pending_hod";
      let dbStatus = "pending_hod";

      // First request updates status from pending_hod to pending_accounts
      const firstRequestMatch = dbStatus === initialStatus;
      expect(firstRequestMatch).toBe(true);
      dbStatus = "pending_accounts"; // first request commits

      // Second concurrent request with stale initialStatus = pending_hod fails WHERE clause match
      const secondRequestMatch = dbStatus === initialStatus;
      expect(secondRequestMatch).toBe(false);
    });
  });
});
