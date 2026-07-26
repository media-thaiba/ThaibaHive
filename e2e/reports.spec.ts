import { test, expect } from "@playwright/test";

test.describe("Daily Work Reports Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-admin@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");
  });

  test("navigates to reports page and renders header and action buttons", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("h1")).toContainText("Daily Activity Logs");

    // Verify Export CSV and New Report buttons exist
    const exportBtn = page.getByRole("button", { name: /Export CSV/i }).first();
    await expect(exportBtn).toBeVisible();

    const newReportBtn = page.getByRole("button", { name: /New Report/i }).first();
    await expect(newReportBtn).toBeVisible();
  });

  test("opens new report modal form when New Report button is clicked", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: /New Report/i }).first().click();

    // Verify modal elements
    await expect(page.locator("div[role='dialog']")).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
  });
});
