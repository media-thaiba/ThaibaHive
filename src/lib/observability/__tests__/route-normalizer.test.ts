import { normalizeRoutePath } from "../route-normalizer";

describe("RouteNormalizer Unit Tests", () => {
  test("normalizes numeric IDs", () => {
    expect(normalizeRoutePath("/api/departments/42")).toBe("/api/departments/:id");
    expect(normalizeRoutePath("/api/departments/42/details")).toBe("/api/departments/:id/details");
  });

  test("normalizes UUIDs", () => {
    expect(normalizeRoutePath("/api/media/files/123e4567-e89b-12d3-a456-426614174000")).toBe(
      "/api/media/files/:uuid"
    );
  });

  test("normalizes CUIDs and prefixed IDs", () => {
    expect(normalizeRoutePath("/api/students/cm7abc1234567890/profile")).toBe(
      "/api/students/:id/profile"
    );
    expect(normalizeRoutePath("/api/users/usr_9876543210abcdef")).toBe("/api/users/:id");
  });

  test("normalizes date parameters", () => {
    expect(normalizeRoutePath("/api/attendance/2026-08-19")).toBe("/api/attendance/:date");
  });

  test("strips query strings and trailing slashes", () => {
    expect(normalizeRoutePath("/api/search?q=test&limit=10")).toBe("/api/search");
    expect(normalizeRoutePath("/api/students/")).toBe("/api/students");
    expect(normalizeRoutePath("///api///students///42///")).toBe("/api/students/:id");
  });

  test("preserves static non-dynamic paths", () => {
    expect(normalizeRoutePath("/api/system/health")).toBe("/api/system/health");
    expect(normalizeRoutePath("/api/auth/login")).toBe("/api/auth/login");
    expect(normalizeRoutePath("/api/finance/fees/transactions")).toBe("/api/finance/fees/transactions");
  });
});
