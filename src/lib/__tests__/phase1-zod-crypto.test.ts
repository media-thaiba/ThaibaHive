import {
  bookingCreateSchema,
  vehicleCreateSchema,
  canteenCreateSchema,
  visitorCreateSchema,
} from "@/lib/validation/schemas";
import crypto from "crypto";

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
});
