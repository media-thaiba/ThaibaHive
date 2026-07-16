import { calculateLateMinutes } from "../attendance/calculations";

describe("calculateLateMinutes", () => {
  it("should return status present and 0 late minutes if checked in before shift start", () => {
    const checkIn = new Date("2026-07-16T08:55:00");
    const res = calculateLateMinutes(checkIn, "09:00", 15);
    expect(res).toEqual({ lateMinutes: 0, status: "present" });
  });

  it("should return status present and 0 late minutes if checked in exactly at shift start", () => {
    const checkIn = new Date("2026-07-16T09:00:00");
    const res = calculateLateMinutes(checkIn, "09:00", 15);
    expect(res).toEqual({ lateMinutes: 0, status: "present" });
  });

  it("should return status present and 0 late minutes if checked in within grace period", () => {
    const checkIn = new Date("2026-07-16T09:14:00");
    const res = calculateLateMinutes(checkIn, "09:00", 15);
    expect(res).toEqual({ lateMinutes: 0, status: "present" });
  });

  it("should return status present and 0 late minutes if checked in exactly at the grace period boundary", () => {
    const checkIn = new Date("2026-07-16T09:15:00");
    const res = calculateLateMinutes(checkIn, "09:00", 15);
    expect(res).toEqual({ lateMinutes: 0, status: "present" });
  });

  it("should return status late and calculate correct late minutes if checked in after grace period", () => {
    const checkIn = new Date("2026-07-16T09:16:00");
    const res = calculateLateMinutes(checkIn, "09:00", 15);
    expect(res).toEqual({ lateMinutes: 16, status: "late" });
  });
});
