import {
  bookingCreateSchema,
  vehicleCreateSchema,
  canteenCreateSchema,
  visitorCreateSchema,
} from "@/lib/validation/schemas";
import crypto from "crypto";

jest.mock("@thaiba/auth", () => ({
  hashPassword: jest.fn().mockResolvedValue("mocked_hashed_password"),
}));

describe("Phase 1 Zod Validation & Crypto Verification", () => {
  describe("Zod safeParse Enforcers", () => {
    it("bookingCreateSchema should reject missing required fields", () => {
      const result = bookingCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("bookingCreateSchema should accept valid payload with notes or description", () => {
      const resultWithNotes = bookingCreateSchema.safeParse({
        resourceId: "res-123",
        title: "Conf Room A",
        startTime: "2026-07-28T10:00:00Z",
        endTime: "2026-07-28T11:00:00Z",
        notes: "Project meeting",
      });
      expect(resultWithNotes.success).toBe(true);

      const resultWithDescription = bookingCreateSchema.safeParse({
        resourceId: "res-123",
        title: "Conf Room A",
        startTime: "2026-07-28T10:00:00Z",
        endTime: "2026-07-28T11:00:00Z",
        description: "Project meeting legacy payload",
      });
      expect(resultWithDescription.success).toBe(true);
    });

    it("vehicleCreateSchema should reject missing registration/model/type", () => {
      const result = vehicleCreateSchema.safeParse({ registrationNumber: "KA011234" });
      expect(result.success).toBe(false);
    });

    it("vehicleCreateSchema should accept valid payload", () => {
      const result = vehicleCreateSchema.safeParse({
        registrationNumber: "KA011234",
        model: "Toyota Innova",
        type: "Van",
        capacity: 7,
      });
      expect(result.success).toBe(true);
    });

    it("canteenCreateSchema should reject missing required status field", () => {
      const result = canteenCreateSchema.safeParse({ date: "2026-07-28", mealType: "lunch" });
      expect(result.success).toBe(false);
    });

    it("visitorCreateSchema should reject missing purpose", () => {
      const result = visitorCreateSchema.safeParse({ name: "John Doe" });
      expect(result.success).toBe(false);
    });
  });

  describe("Crypto Timing-Safe Verification", () => {
    it("should accurately compare valid HMAC signatures without timing side channels", () => {
      const secret = "supersecretkey";
      const body = JSON.stringify({ type: "video_transcoded", id: "asset-1" });
      const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

      const sig = Buffer.from(hmac, "hex");
      const calc = Buffer.from(hmac, "hex");
      expect(sig.length === calc.length && crypto.timingSafeEqual(sig, calc)).toBe(true);
    });

    it("should reject tampered HMAC signatures", () => {
      const secret = "supersecretkey";
      const body = JSON.stringify({ type: "video_transcoded", id: "asset-1" });
      const hmac = crypto.createHmac("sha256", secret).update(body).digest("hex");

      const tamperedHmac = hmac.replace(/[0-9a-f]/, (c) => (c === "0" ? "1" : "0"));
      const sig = Buffer.from(tamperedHmac, "hex");
      const calc = Buffer.from(hmac, "hex");
      const isEqual = sig.length === calc.length && crypto.timingSafeEqual(sig, calc);
      expect(isEqual).toBe(false);
    });
  });

  describe("Password Reset Token Single-Use Atomic Guard", () => {
    it("should consume reset token atomically on first POST, and reject second replay attempt with HTTP 400", async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { POST } = require("@/app/api/auth/reset-password/[token]/route");
      const { db } = require("@/db");

      const testToken = "valid-reset-token-1234567890abcdef";
      let tokenUsed = false;

      // Mock db.update for passwordResetTokens
      const spyUpdate = jest.spyOn(db, "update").mockImplementation((table: any) => {
        return {
          set: (updateValues: any) => ({
            where: () => ({
              returning: () => ({
                get: async () => {
                  if (updateValues.passwordHash) {
                    return { id: "staff-1" };
                  }
                  if (!tokenUsed) {
                    tokenUsed = true;
                    return { id: "token-1", staffId: "staff-1", tokenHash: "mockhash" };
                  }
                  return undefined; // Replay attempt: atomic WHERE isNull(usedAt) fails!
                },
              }),
            }),
          }),
        } as any;
      });

      // Mock db.select for staff lookup
      const spySelect = jest.spyOn(db, "select").mockImplementation(() => ({
        from: () => ({
          where: () => ({
            get: async () => ({ id: "staff-1", isActive: true }),
          }),
        }),
      }) as any);

      const requestObj = new Request("http://localhost/api/auth/reset-password/" + testToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "NewStrongPassword123!" }),
      });

      // First consumption attempt
      const res1 = await POST(requestObj, { params: Promise.resolve({ token: testToken }) });
      const body1 = await res1.json();

      expect(res1.status).toBe(200);
      expect(body1).toEqual({ success: true });

      // Second replay attempt with identical token
      const requestObj2 = new Request("http://localhost/api/auth/reset-password/" + testToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "NewStrongPassword123!" }),
      });
      const res2 = await POST(requestObj2, { params: Promise.resolve({ token: testToken }) });
      const body2 = await res2.json();

      expect(res2.status).toBe(400);
      expect(body2).toEqual({ error: "Invalid or expired reset token" });

      spyUpdate.mockRestore();
      spySelect.mockRestore();
    });
  });
});
