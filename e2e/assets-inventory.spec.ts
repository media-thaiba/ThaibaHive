import { test, expect } from "@playwright/test";

test.describe("Assets Inventory Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#email", "test-admin@thaibahive.local");
    await page.fill("#password", "Password123");
    await page.click("button[type='submit']");
    await page.waitForURL("/");
  });

  test("navigates to assets page and renders title and export action", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.locator("h1")).toContainText("Assets");

    const exportBtn = page.getByRole("button", { name: /Export CSV/i });
    await expect(exportBtn).toBeVisible();

    const addAssetBtn = page.getByRole("button", { name: /Add Asset/i });
    await expect(addAssetBtn).toBeVisible();
  });
});
