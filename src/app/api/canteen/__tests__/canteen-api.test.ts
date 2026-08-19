import { canteenRedeemSchema, canteenItemCreateSchema } from "@/lib/validation/schemas";

describe("Canteen API Validation & Redemption Logic", () => {
  it("validates canteen item creation schema", () => {
    const valid = canteenItemCreateSchema.safeParse({
      name: "South Indian Breakfast Combo",
      category: "breakfast",
      price: 45.0,
      isAvailable: true,
      dietaryFlags: "vegetarian",
    });
    expect(valid.success).toBe(true);
  });

  it("validates meal pass redemption payload structure", () => {
    const valid = canteenRedeemSchema.safeParse({
      passCode: "CMP-77129-QR",
      items: [
        { itemId: "item_001", quantity: 2, unitPrice: 20.0 },
        { itemId: "item_002", quantity: 1, unitPrice: 15.0 },
      ],
      idempotencyKey: "idem_abc123",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      const total = valid.data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
      expect(total).toBe(55.0);
    }
  });

  it("rejects redemption payloads with non-positive quantities", () => {
    const invalid = canteenRedeemSchema.safeParse({
      passCode: "CMP-77129-QR",
      items: [
        { itemId: "item_001", quantity: -1, unitPrice: 20.0 },
      ],
    });
    expect(invalid.success).toBe(false);
  });
});
