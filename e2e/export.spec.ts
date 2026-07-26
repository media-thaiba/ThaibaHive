import { test, expect } from "@playwright/test";

test.describe("Export API Endpoints", () => {
  test("returns 401 Unauthorized when requesting export without session", async ({ request }) => {
    const res = await request.get("/api/export?type=staff");
    expect(res.status()).toBe(401);
  });

  test("returns 400 Bad Request when requesting an invalid export type", async ({ page }) => {
    // Authenticate via UI first as test-admin
    await page.goto("/auth/login");
    await page.fill("#email", "test-admin@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");

    // Fetch invalid export type
    const response = await page.request.get("/api/export?type=nonexistent");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid type");
  });

  const exportTypes = [
    { type: "attendance", headerKeyword: "Employee ID" },
    { type: "leaves", headerKeyword: "Leave ID" },
    { type: "staff", headerKeyword: "Email" },
    { type: "payroll", headerKeyword: "Working Days" },
    { type: "accounts", headerKeyword: "Category" },
    { type: "assets", headerKeyword: "Asset Tag" },
    { type: "expenses", headerKeyword: "Claim ID" },
  ];

  for (const { type, headerKeyword } of exportTypes) {
    test(`exports ${type} CSV with 200 OK, UTF-8 BOM, and correct headers`, async ({ page }) => {
      await page.goto("/auth/login");
      await page.fill("#email", "test-admin@thaibahive.local");
      await page.fill("#password", "Password123");
      await page.click("button[type='submit']");
      await page.waitForURL("/");

      const response = await page.request.get(`/api/export?type=${type}`);
      expect(response.status()).toBe(200);

      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("text/csv");

      const disposition = response.headers()["content-disposition"];
      expect(disposition).toContain(`filename="${type}-export-`);

      const text = await response.text();
      // Verify UTF-8 BOM (\uFEFF) at start of stream
      expect(text.charCodeAt(0)).toBe(0xfeff);

      // Verify header row keyword
      expect(text).toContain(headerKeyword);
    });
  }
});
