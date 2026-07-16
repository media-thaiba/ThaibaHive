import { cn, formatDate, formatDateTime, formatTime, formatDateRange, ensureArray, timeAgo } from "../utils";

describe("Utility Functions", () => {
  describe("cn", () => {
    it("should merge ClassNames correctly", () => {
      expect(cn("a", "b")).toBe("a b");
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4"); // tailwind-merge handles class conflicts
      expect(cn("text-red-500", { "bg-blue-500": true, "hidden": false })).toBe("text-red-500 bg-blue-500");
    });
  });

  describe("formatDate", () => {
    it("should return dash for null/undefined/empty input", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
    });

    it("should format valid dates", () => {
      const date = new Date("2026-07-15T12:00:00Z");
      const formatted = formatDate(date);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain("2026");
    });
  });

  describe("formatDateTime", () => {
    it("should return dash for null/undefined/empty input", () => {
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime(undefined)).toBe("—");
    });

    it("should format valid date-times", () => {
      const date = new Date("2026-07-15T12:00:00Z");
      const formatted = formatDateTime(date);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain("2026");
    });
  });

  describe("formatTime", () => {
    it("should return dash for null/undefined/empty input", () => {
      expect(formatTime(null)).toBe("—");
      expect(formatTime(undefined)).toBe("—");
    });

    it("should format valid times", () => {
      const date = new Date("2026-07-15T12:30:00Z");
      const formatted = formatTime(date);
      expect(formatted).toBeTruthy();
    });
  });

  describe("formatDateRange", () => {
    it("should format date range correctly", () => {
      const start = new Date("2026-07-15T12:00:00Z");
      const end = new Date("2026-07-16T12:00:00Z");
      const range = formatDateRange(start, end);
      expect(range).toContain("\u2013"); // en-dash \u2013 is used as separator
      expect(range).toContain("2026");
    });
  });

  describe("ensureArray", () => {
    it("should return input if it is an array", () => {
      const input = [1, 2, 3];
      expect(ensureArray(input)).toBe(input);
    });

    it("should return fallback or empty array if input is not an array", () => {
      expect(ensureArray(null)).toEqual([]);
      expect(ensureArray("not an array", [9, 9])).toEqual([9, 9]);
    });
  });

  describe("timeAgo", () => {
    it("should return just now for current time", () => {
      const now = new Date();
      expect(timeAgo(now)).toBe("just now");
    });

    it("should return minutes ago", () => {
      const past = new Date(Date.now() - 5 * 60 * 1000);
      expect(timeAgo(past)).toBe("5m ago");
    });

    it("should return hours ago", () => {
      const past = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(timeAgo(past)).toBe("3h ago");
    });

    it("should return days ago", () => {
      const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(timeAgo(past)).toBe("2d ago");
    });

    it("should return weeks ago", () => {
      const past = new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000);
      expect(timeAgo(past)).toBe("2w ago");
    });
  });
});
