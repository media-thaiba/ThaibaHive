import { test, expect } from "@playwright/test";

test.describe("Assets Inventory Flow", () => {
  test.use({ storageState: ".auth/admin.json" });

  test("navigates to assets page and renders title and export action", async ({ page }) => {
    await page.goto("/assets");
    await expect(page.locator("h1")).toContainText("Assets");

    const exportBtn = page.getByRole("button", { name: /Export/i }).first();
    await expect(exportBtn).toBeVisible();

    const addAssetBtn = page.getByRole("button", { name: /Add Asset/i }).first();
    await expect(addAssetBtn).toBeVisible();
  });
});
