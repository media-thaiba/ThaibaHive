import { test, expect } from "@playwright/test";

test.describe("Expense Claims Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-admin@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");
  });

  test("navigates to expense claims page and renders header", async ({ page }) => {
    await page.goto("/expenses");
    await expect(page.locator("h1")).toContainText("Expense Claims");

    // Verify Export CSV and Submit Claim buttons exist
    const exportBtn = page.getByRole("button", { name: /Export CSV/i }).first();
    await expect(exportBtn).toBeVisible();

    const submitBtn = page.getByRole("button", { name: /Submit Claim/i }).first();
    await expect(submitBtn).toBeVisible();
  });

  test("opens claim submission form modal when Submit Claim is clicked", async ({ page }) => {
    await page.goto("/expenses");
    await page.getByRole("button", { name: /Submit Claim/i }).first().click();

    // Verify dialog form
    await expect(page.locator("div[role='dialog']")).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
  });
});
