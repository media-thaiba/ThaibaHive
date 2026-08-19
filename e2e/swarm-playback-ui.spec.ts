import { test, expect } from "@playwright/test";

test.describe("Swarm Observability Visual Playback UI E2E Test", () => {
  test.use({ storageState: ".auth/super_admin.json" });

  test.beforeEach(async ({ page }) => {
    // Navigate to swarm intelligence console
    await page.goto("/admin/swarm-intelligence");
  });

  test("can toggle playback mode and render playback controls", async ({ page }) => {
    // Check page title is rendered
    await expect(page.locator("h1")).toContainText("Swarm Intelligence Console");

    // "Enter Playback Mode" button should be visible
    const toggleButton = page.locator("button:has-text('Enter Playback Mode')");
    await expect(toggleButton).toBeVisible();

    // Click the toggle button to enter playback mode
    await toggleButton.click();

    // Check button state changed to "Exit Playback"
    await expect(page.locator("button:has-text('Exit Playback')")).toBeVisible();

    // Timeline Progress label should be visible
    await expect(page.locator("span:has-text('Timeline Progress')")).toBeVisible();

    // Speed selector buttons should be visible (0.5x, 1x, 2x, 5x)
    await expect(page.locator("button:has-text('1x')")).toBeVisible();
    await expect(page.locator("button:has-text('2x')")).toBeVisible();

    // Click "Exit Playback" to return to live mode
    await page.locator("button:has-text('Exit Playback')").click();

    // Verify "Enter Playback Mode" is visible again
    await expect(page.locator("button:has-text('Enter Playback Mode')")).toBeVisible();
  });
});
