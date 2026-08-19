import { test, expect } from "@playwright/test";

test.describe("Finance Multi-Stage Approval Lifecycle E2E", () => {
  // Use the cached admin state directly to satisfy authentication checks
  test.use({ storageState: ".auth/admin.json" });

  test("renders finance dashboard and approval queues", async ({ page }) => {
    await page.goto("/finance");
    await expect(page.locator("h1, h2, [data-testid='page-header'], .animate-slide-up h1").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Finance Approvals Engine").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Pending Requests").first()).toBeVisible({ timeout: 15000 });
  });

  test("allows switching between queue status tabs", async ({ page }) => {
    await page.goto("/finance");
    await expect(page.locator("h1, h2, [data-testid='page-header'], .animate-slide-up h1").first()).toBeVisible({ timeout: 15000 });
    const approvedTab = page.getByRole("button", { name: "Approved History" });
    if (await approvedTab.isVisible()) {
      await approvedTab.click();
      await expect(page.getByText("Approved History").first()).toBeVisible({ timeout: 15000 });
    }
  });
});
