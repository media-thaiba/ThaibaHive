import { timeSeriesQuerySchema } from "@/lib/validation/schemas";

describe("Sprint-011 Time-Series API Route Validation & Schema", () => {
  it("validates time-series query parameters cleanly", () => {
    const valid = timeSeriesQuerySchema.safeParse({
      campusId: "inst_101",
      granularity: "monthly",
    });
    expect(valid.success).toBe(true);

    const invalid = timeSeriesQuerySchema.safeParse({
      granularity: "hourly",
    });
    expect(invalid.success).toBe(false);
  });
});
