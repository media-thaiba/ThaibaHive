import { test, expect } from "@playwright/test";

test.describe("Examination Management System Lifecycle E2E", () => {
  test.describe.configure({ mode: "serial" });

  // Use the cached super_admin state directly to satisfy all permissions
  test.use({ storageState: ".auth/super_admin.json" });

  test("runs complete exam wizard setup, grade boundary checks, and report exports", async ({ page }) => {
    test.setTimeout(90000);
    // Dismiss any browser alert dialogs automatically
    await page.addInitScript(() => {
      window.alert = (msg) => console.log("Mocked alert:", msg);
    });

    page.on("dialog", async (dialog) => {
      console.log(`Alert Dialog encountered: "${dialog.message()}"`);
      await dialog.dismiss();
    });

    // 1. Navigate to Examinations Dashboard
    await page.goto("/examinations", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hydrated='true']", { timeout: 45000 });
    await expect(page.locator("h1, h2, [data-testid='page-header']").first()).toBeVisible({ timeout: 15000 });

    // 2. Click Create New Exam Session to open Setup Wizard Step 1
    await page.locator("button:has-text('Create New Exam Session')").first().click();
    const wizardModal = page.locator("[data-slot='dialog-content']");
    await expect(wizardModal).toBeVisible({ timeout: 15000 });

    // Fill Step 1 Fields
    await wizardModal.locator("input[placeholder*='Final Term']").fill("E2E Examination Session");
    await wizardModal.locator("label:has-text('Start Date') + input").fill("2026-10-01");
    await wizardModal.locator("label:has-text('End Date') + input").fill("2026-10-15");
    await wizardModal.locator("button:has-text('Next')").click();

    // Fill Step 2 (Subject Schedules)
    await expect(wizardModal.locator("label:has-text('Subject Name')")).toBeVisible({ timeout: 15000 });
    await wizardModal.locator("input[placeholder*='e.g. Mathematics']").fill("E2E Mathematics");
    await wizardModal.locator("label:has-text('Exam Date') + input").fill("2026-10-02");
    await wizardModal.locator("button:has-text('Add Subject Slot')").click();

    // Click Next to proceed to Step 3
    await wizardModal.locator("button:has-text('Next')").click();

    // Step 3: Finalize
    await expect(wizardModal.locator("text=Setup Summary")).toBeVisible({ timeout: 15000 });
    await wizardModal.locator("button:has-text('Finalize & Create Exam Session')").click();

    // Dashboard list should refresh, click Mark Entry on E2E Examination Session
    await page.goto("/examinations", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hydrated='true']", { timeout: 45000 });
    const examRow = page.locator("tr").filter({ hasText: "E2E Examination Session" }).first();
    await expect(examRow).toBeVisible({ timeout: 15000 });

    // Click Mark Entry button
    await examRow.locator("button:has-text('Mark Entry')").click();

    // Mark entry portal popup dialog
    const portalDialog = page.locator("[data-slot='dialog-content']");
    await expect(portalDialog).toBeVisible({ timeout: 15000 });

    // 3. Test validation limits (Exceed max marks check)
    const marksInput = portalDialog.locator("input[type='number']").first();
    await expect(marksInput).toBeVisible({ timeout: 15000 });
    await marksInput.fill("150"); // Invalid, max is 100

    // Assert validation error label is rendered
    await expect(portalDialog.locator("text=Exceeds max (100)")).toBeVisible({ timeout: 15000 });

    // Fix the marks to a valid value
    await marksInput.fill("85");
    await expect(portalDialog.locator("text=Exceeds max (100)")).not.toBeVisible();

    // Submit batch grades
    await portalDialog.locator("button:has-text('Save & Submit Marks')").click();
    
    // Close the Mark Entry Dialog modal via the Close button
    await portalDialog.locator("button:has-text('Close')").first().click();

    // 4. Tabulation Register Export Flow
    await page.goto("/examinations/tabulation", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-hydrated='true']", { timeout: 45000 });
    await expect(page.locator("text=Tabulation Register").first()).toBeVisible({ timeout: 15000 });

    // Click Export Tabulation Register button
    const exportBtn = page.locator("button:has-text('Export Tabulation Register')");
    await expect(exportBtn).toBeVisible({ timeout: 15000 });
    await exportBtn.click();

    // Export Dialog opens, trigger PDF format export download
    const exportModal = page.locator("[data-slot='dialog-content']");
    await expect(exportModal).toBeVisible({ timeout: 15000 });

    // Select format and trigger download event
    const downloadPromise = page.waitForEvent("download");
    await exportModal.locator("button:has-text('Export CSV')").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("tabulation");
  });
});
