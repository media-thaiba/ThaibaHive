import {
  vehicleBookingSchema,
  canteenItemCreateSchema,
  canteenRedeemSchema,
  visitorPreRegisterSchema,
  visitorPassVerifySchema,
} from "../validation/schemas";
import { hasPermission } from "../../../packages/auth/roles";



describe("Services Module Validation Schemas & RBAC Permissions", () => {
  describe("Vehicle Schemas", () => {
    it("validates vehicle booking schema", () => {
      const valid = vehicleBookingSchema.safeParse({
        vehicleId: "v_101",
        date: "2026-08-10",
        startTime: "09:00",
        purpose: "Industrial Visit",
      });
      expect(valid.success).toBe(true);

      const invalid = vehicleBookingSchema.safeParse({
        vehicleId: "",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("Canteen Schemas", () => {
    it("validates canteen item creation schema", () => {
      const valid = canteenItemCreateSchema.safeParse({
        name: "Veg Thali",
        category: "lunch",
        price: 60.0,
        dietaryFlags: "vegetarian",
      });
      expect(valid.success).toBe(true);
    });

    it("validates canteen meal pass redemption schema", () => {
      const valid = canteenRedeemSchema.safeParse({
        passCode: "CMP-88192-QR",
        items: [
          { itemId: "item_1", quantity: 2, unitPrice: 30.0 },
        ],
        idempotencyKey: "idem_99120",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Visitor Schemas", () => {
    it("validates visitor pre-registration schema", () => {
      const valid = visitorPreRegisterSchema.safeParse({
        visitorName: "John Doe",
        visitorPhone: "+1234567890",
        hostStaffId: "staff_101",
        purpose: "Parent Teacher Meeting",
        expectedDate: "2026-08-05",
      });
      expect(valid.success).toBe(true);
    });

    it("validates visitor pass verification schema", () => {
      const valid = visitorPassVerifySchema.safeParse({
        qrPayload: "VIS|inst_001|pass_123|1785936000|hmac_abc",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("RBAC Permissions", () => {
    it("enforces fleet and canteen permissions for admin & principal", () => {
      expect(hasPermission("admin", "fleet:manage")).toBe(true);
      expect(hasPermission("admin", "canteen:redeem")).toBe(true);
      expect(hasPermission("principal", "visitor:verify")).toBe(true);
      expect(hasPermission("super_admin", "fleet:book")).toBe(true);
    });
  });
});
