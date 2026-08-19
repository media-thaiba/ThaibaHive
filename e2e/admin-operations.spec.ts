import { test, expect } from "@playwright/test";

test.describe("Admin Scheduled Jobs & Operations E2E", () => {
  test.describe.configure({ mode: "serial" });

  // Use super_admin storageState to bypass RBAC gates
  test.use({ storageState: ".auth/super_admin.json" });

  test("should render scheduled jobs, trigger manual report, assert status success transitions, verify topology and audit trails", async ({ page }) => {
    test.setTimeout(90000);
    // 1. Navigate to Scheduled Jobs Page
    await page.goto("/admin/scheduled-jobs", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hydrated='true']", { timeout: 45000 });
    await expect(page.locator("h1, h2, [data-testid='page-header'], .container h1").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Scheduled Jobs Management").first()).toBeVisible();

    // Trigger report job manually
    await page.locator("button:has-text('Trigger Manual Report')").first().click();
    
    // Fill the Dialog fields
    const modal = page.locator("[data-slot='dialog-content']");
    await expect(modal).toBeVisible({ timeout: 15000 });
    await modal.locator("input[placeholder*='inst_test_01']").fill("inst_campus_main");
    await modal.locator("button[type='submit']").click();

    // Verify successful toast
    const toastSuccess = page.locator("text=Job triggered successfully!");
    await expect(toastSuccess).toBeVisible({ timeout: 15000 });

    // 2. Assert processing -> success state transitions
    const jobRow = page.locator("tr").filter({ hasText: "inst_campus_main" }).first();
    await expect(jobRow).toBeVisible({ timeout: 15000 });
    
    // Wait for the status badge to transition to success
    const successBadge = jobRow.locator("span", { hasText: "success" });
    await expect(successBadge).toBeVisible({ timeout: 30000 });

    // 3. Verify Swarm telemetry/topology Console
    await page.goto("/admin/swarm-intelligence", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hydrated='true']", { timeout: 45000 });
    await expect(page.locator("h1")).toContainText("Swarm Intelligence Console", { timeout: 15000 });
    
    // SVG topology visualization container should be visible
    const topologySvg = page.locator("svg[viewBox='0 0 800 400']").first();
    await expect(topologySvg).toBeVisible({ timeout: 15000 });

    // 4. Verify audit-list entry assertion
    await page.goto("/admin/audit-logs", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hydrated='true']", { timeout: 45000 });
    await expect(page.locator("h1, h2, [data-testid='page-header']").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Preference Audit Logs").first()).toBeVisible();

    // Table should render at least one row showing the job_trigger action
    const auditRow = page.locator("tr, div").filter({ hasText: "job_trigger" }).first();
    await expect(auditRow).toBeVisible({ timeout: 15000 });
  });
});
