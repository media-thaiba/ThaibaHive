import { test, expect } from "@playwright/test";

test.describe("Executive BI Dashboard and Custom Report Builder E2E Tests", () => {
  test.use({ storageState: ".auth/principal.json" });

  test("should render the Executive BI dashboard and switch tabs correctly", async ({ page }) => {
    // 2. Navigate to principal analytics
    await page.goto("/workspace/principal/analytics");
    
    // Assert page header
    const header = page.locator("h1");
    await expect(header).toContainText("Executive BI Dashboard");

    // Click through analytics tabs and assert they display correct sections
    await page.getByRole("button", { name: "finance", exact: true }).click();
    await expect(page.getByText("Realization Efficiency").first()).toBeVisible();

    await page.getByRole("button", { name: "academics", exact: true }).click();
    await expect(page.getByText("Overall Pass Rate").first()).toBeVisible();

    await page.getByRole("button", { name: "🔮 Predictive ML", exact: true }).click();
    await expect(page.getByText("Realization Deficit Forecast").first()).toBeVisible();
  });

  test("should configure and compile an on-demand custom PDF report", async ({ page }) => {
    await page.goto("/workspace/principal/analytics");

    // Navigate to Custom Reports tab
    await page.getByRole("button", { name: "📋 Custom Reports", exact: true }).click();
    
    // Verify Report Builder panel renders
    await expect(page.getByText("Report Configuration")).toBeVisible();
    await expect(page.getByText("Active Schedules")).toBeVisible();

    // Select category and format
    await page.selectOption("select", "attendance");
    await page.click("button:has-text('PDF Document')");

    // Click Compile Report
    await page.click("button:has-text('Compile Report')");

    // Wait for compilation to complete and check for the success toast/download element
    const downloadBtn = page.locator("a:has-text('Download')");
    await expect(downloadBtn).toBeVisible({ timeout: 15000 });

    // Verify download link contains /exports/
    const href = await downloadBtn.getAttribute("href");
    expect(href).toContain("/exports/");
  });
});
