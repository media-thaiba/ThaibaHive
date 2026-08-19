import { test, expect } from "@playwright/test";

test.describe("Export Engine E2E Verification (EXP-010)", () => {
  test("returns 401 Unauthorized when requesting export without session", async ({ request }) => {
    const res = await request.get("/api/export?type=staff");
    expect(res.status()).toBe(401);
  });

  test.describe("Authenticated Export requests", () => {
    test.use({ storageState: ".auth/admin.json" });

    test("returns 400 Bad Request when requesting an invalid export type or format", async ({ page }) => {
      const responseType = await page.request.get("/api/export?type=nonexistent");
      expect(responseType.status()).toBe(400);

      const responseFormat = await page.request.get("/api/export?type=staff&format=invalid_fmt");
      expect(responseFormat.status()).toBe(400);
    });

    const exportFormats = [
      { format: "csv", expectedMime: "text/csv" },
      { format: "xlsx", expectedMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
      { format: "pdf", expectedMime: "application/pdf" },
    ];

    for (const { format, expectedMime } of exportFormats) {
      test(`exports attendance in ${format.toUpperCase()} format with 200 OK and valid headers`, async ({ page }) => {
        const response = await page.request.get(`/api/export?type=attendance&format=${format}`);
        expect(response.status()).toBe(200);

        const contentType = response.headers()["content-type"];
        expect(contentType).toContain(expectedMime);

        const disposition = response.headers()["content-disposition"];
        expect(disposition).toContain(`filename="attendance-export-`);
        expect(disposition).toContain(`.${format}`);
      });
    }
  });
});
