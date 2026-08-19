import { test, expect } from "@playwright/test";

test.describe("Swarm Mobile Sync Tuning Policies Dashboard E2E Test", () => {
  test.use({ storageState: ".auth/super_admin.json" });

  test.beforeEach(async ({ page }) => {
    // Navigate to the swarm intelligence console page
    await page.goto("/admin/swarm-intelligence");
  });

  test("can switch to Mobile Sync Diagnostics tab and view summary statistics", async ({ page }) => {
    // Expect main header is visible
    await expect(page.locator("h1")).toContainText("Swarm Intelligence Console");

    // "Mobile Sync Diagnostics" tab button should be visible
    const mobileTabButton = page.locator("button:has-text('Mobile Sync Diagnostics')");
    await expect(mobileTabButton).toBeVisible();

    // Click the tab button
    await mobileTabButton.click();

    // Verify diagnostics subheading is rendered
    await expect(page.locator("h2").filter({ hasText: "Mobile Diagnostics Telemetry" }).first()).toContainText("Mobile Diagnostics Telemetry");

    // Verify summary cards are rendered
    await expect(page.locator("div:has-text('Mobile Sync Volume (Gzip)')").first()).toBeVisible();
    await expect(page.locator("div:has-text('Fleet Compression Savings')").first()).toBeVisible();
    await expect(page.locator("div:has-text('Average Latency')").first()).toBeVisible();
    await expect(page.locator("div:has-text('Sync Success Rate')").first()).toBeVisible();
  });

  test("can view and update Mobile Sync Tuning Policies", async ({ page }) => {
    const mobileTabButton = page.locator("button:has-text('Mobile Sync Diagnostics')");
    await mobileTabButton.click();

    // Verify tuning policies section title is visible
    await expect(page.locator("text=Mobile Sync Tuning Policies").first()).toBeVisible();

    // Verify WIFI, CELLULAR connection policy forms are rendered
    await expect(page.locator("span:has-text('WIFI Connection')")).toBeVisible();
    await expect(page.locator("span:has-text('CELLULAR Connection')")).toBeVisible();

    // Verify input fields for WIFI policy are present
    const wifiCard = page.locator("div.space-y-4", { hasText: "WIFI Connection" }).first();
    const batchSizeInput = wifiCard.locator("input[id^='batch-']");
    await expect(batchSizeInput).toBeVisible();

    // Verify the Save Policy button inside the WIFI card is clickable
    const saveButton = wifiCard.locator("button:has-text('Save Policy')");
    await expect(saveButton).toBeVisible();
    
    // Simulate updating max batch size
    await batchSizeInput.fill("120");
    
    // Click save
    await saveButton.click();

    // Verify toast is shown
    await expect(page.locator("text=saved successfully")).toBeVisible();
  });
});
