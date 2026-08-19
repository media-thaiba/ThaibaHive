import { vehicleBookingSchema, vehicleCreateSchema } from "@/lib/validation/schemas";

describe("Fleet Vehicles API Logic & Schemas", () => {
  it("validates vehicle creation parameters", () => {
    const valid = vehicleCreateSchema.safeParse({
      registrationNumber: "KL-10-XY-9999",
      model: "Mercedes Tourismo",
      type: "bus",
      capacity: 50,
      fuelType: "diesel",
    });
    expect(valid.success).toBe(true);

    const invalid = vehicleCreateSchema.safeParse({
      registrationNumber: "",
      model: "",
    });
    expect(invalid.success).toBe(false);
  });

  it("validates vehicle booking request parameters", () => {
    const valid = vehicleBookingSchema.safeParse({
      vehicleId: "v_301",
      date: "2026-08-15",
      startTime: "08:30",
      endTime: "16:30",
      purpose: "Inter-Campus Sports Event",
      destination: "North Campus Stadium",
    });
    expect(valid.success).toBe(true);

    const invalid = vehicleBookingSchema.safeParse({
      vehicleId: "",
      date: "",
      startTime: "",
      purpose: "",
    });
    expect(invalid.success).toBe(false);
  });
});
